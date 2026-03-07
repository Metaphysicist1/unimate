from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from duckduckgo_search import DDGS

from app.agent.state import (
    AgentState,
    SupervisorDecision,
    ChatResponseData,
    Citation,
    SuggestedAction,
)
from app.core.config import settings
from app.services.database import supabase, db

logger = logging.getLogger(__name__)

MAX_ITERATIONS = 5

_llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    google_api_key=settings.GOOGLE_GEMINI_API_KEY,
    temperature=0.3,
)

_llm_concise = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    google_api_key=settings.GOOGLE_GEMINI_API_KEY,
    temperature=0.15,
    max_output_tokens=512,
)

_llm_research = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    google_api_key=settings.GOOGLE_GEMINI_API_KEY,
    temperature=0.1,
    max_output_tokens=2048,
)


# ── Helpers ────────────────────────────────────────────────────────────

_CONTEXT_FIELDS = [
    "country", "program", "universities", "degree_type",
    "language_level", "gpa_estimated",
]

SECONDS_PER_FIELD = 45


def _compute_readiness(state: AgentState) -> int:
    weights = {
        "country": 20, "program": 15, "universities": 15,
        "degree_type": 15, "language_level": 20, "gpa_estimated": 15,
    }
    score = 0
    for field, w in weights.items():
        val = state.get(field)
        if val and val not in ("", "N/A", []):
            score += w
    return min(score, 100)


def _find_missing(state: AgentState) -> list[str]:
    missing = []
    for f in _CONTEXT_FIELDS:
        val = state.get(f)
        if not val or val in ("", "N/A", []):
            missing.append(f)
    return missing


def _build_context_block(state: AgentState) -> str:
    parts: list[str] = []
    if state.get("search_results"):
        parts.append(
            "### Web search results\n"
            + json.dumps(state["search_results"], indent=2, default=str)
        )
    if state.get("retrieved_documents"):
        parts.append(
            "### Database records\n"
            + json.dumps(state["retrieved_documents"], indent=2, default=str)
        )
    return "\n\n".join(parts) or "(none)"


def _query_hash(query: str) -> str:
    normalized = query.strip().lower()
    return hashlib.sha256(normalized.encode()).hexdigest()[:16]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Search providers ───────────────────────────────────────────────────

async def _search_serper(query: str, num_results: int = 5) -> list[dict]:
    """Real-time web search via Serper.dev API."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": settings.SERPER_API_KEY, "Content-Type": "application/json"},
            json={"q": query, "num": num_results},
        )
        resp.raise_for_status()
        data = resp.json()

    results = []
    for item in data.get("organic", [])[:num_results]:
        results.append({
            "title": item.get("title", ""),
            "snippet": item.get("snippet", ""),
            "url": item.get("link", ""),
        })
    return results


def _search_ddg(query: str, num_results: int = 5) -> list[dict]:
    """Fallback search via DuckDuckGo."""
    with DDGS() as ddgs:
        raw = list(ddgs.text(query, max_results=num_results))
    return [
        {"title": r.get("title", ""), "snippet": r.get("body", ""), "url": r.get("href", "")}
        for r in raw
    ]


async def _run_search(query: str, session_id: str, depth: int = 1) -> tuple[list[dict], str]:
    """Execute search with cache check and logging. Returns (results, provider)."""
    qhash = _query_hash(query)
    cached = await db.find_cached_research(qhash)
    if cached:
        logger.info("Research cache hit for query: %s", query[:60])
        results = json.loads(cached["results"]) if isinstance(cached["results"], str) else cached["results"]
        return results, cached.get("provider", "cache")

    provider = "duckduckgo"
    try:
        if settings.SERPER_API_KEY:
            results = await _search_serper(query)
            provider = "serper"
        else:
            results = _search_ddg(query)
    except Exception:
        logger.exception("Primary search failed, trying fallback")
        try:
            results = _search_ddg(query)
            provider = "duckduckgo"
        except Exception:
            logger.exception("All search providers failed")
            results = [{"title": "Search unavailable", "snippet": "Could not complete search.", "url": ""}]

    await db.log_research(
        session_id=session_id,
        query=query,
        query_hash=qhash,
        provider=provider,
        results=results,
        depth_level=depth,
    )

    return results, provider


def _extract_citations(results: list[dict]) -> list[dict]:
    """Convert raw search results into citation dicts."""
    now = _now_iso()
    return [
        {
            "fact": r.get("snippet", "")[:200],
            "source_url": r.get("url", ""),
            "source_title": r.get("title", ""),
            "last_verified": now,
        }
        for r in results
        if r.get("url")
    ]


# ── 1. SUPERVISOR NODE ─────────────────────────────────────────────────

SUPERVISOR_PROMPT = """\
You are the Supervisor of a uni-assist application advisor.
Evaluate the student's state and pick the single best next action.

Student state:
- Country: {country}
- Universities: {universities}
- Program: {program}
- Degree type: {degree_type}
- Language level: {language_level}
- GPA: {gpa}
- Missing fields: {missing}
- Conflicts: {conflicts}
- Query: {query}
- Research gathered: {has_research}
- Research depth: {depth}/2
- Iteration: {iteration}/{max_iter}

Actions:
• "extract"       – important fields are still missing; ask the student.
• "clarify"       – conflicting data found.
• "research"      – quick single-pass web search.
• "deep_research" – multi-step search: first core requirements, then nested \
details (portfolio specs, test score minimums, etc.). Use when the query is \
about 'requirements', 'admission criteria', or specific program details.
• "retrieve"      – check internal DB for similar past applications.
• "strategize"    – enough data to give a thorough admissions analysis.

Pick ONE action. Return JSON: {{"action": "...", "reasoning": "...", "search_query": "..." or null}}"""


async def supervisor_node(state: AgentState) -> dict[str, Any]:
    iteration = state.get("iteration", 0)
    missing = _find_missing(state)
    conflicts = state.get("conflicts") or []
    readiness = _compute_readiness(state)

    if iteration >= MAX_ITERATIONS:
        return {
            "supervisor_action": "strategize",
            "supervisor_reasoning": "Max iterations reached.",
            "iteration": iteration,
            "missing_fields": missing,
            "readiness_score": readiness,
        }

    prompt = SUPERVISOR_PROMPT.format(
        country=state.get("country") or "unknown",
        universities=", ".join(state.get("universities") or []) or "unknown",
        program=state.get("program") or "unknown",
        degree_type=state.get("degree_type") or "unknown",
        language_level=state.get("language_level") or "unknown",
        gpa=state.get("gpa_estimated") or "unknown",
        missing=", ".join(missing) if missing else "none",
        conflicts=json.dumps(conflicts, default=str) if conflicts else "none",
        query=state.get("user_query", ""),
        has_research="yes" if state.get("search_results") or state.get("retrieved_documents") else "no",
        depth=state.get("research_depth", 0),
        iteration=iteration,
        max_iter=MAX_ITERATIONS,
    )

    try:
        structured = _llm_concise.with_structured_output(SupervisorDecision)
        decision: SupervisorDecision = await structured.ainvoke(
            [HumanMessage(content=prompt)]
        )
    except Exception:
        logger.exception("Supervisor routing failed")
        return {
            "supervisor_action": "strategize",
            "supervisor_reasoning": "Routing error fallback.",
            "iteration": iteration,
            "missing_fields": missing,
            "readiness_score": readiness,
        }

    updates: dict[str, Any] = {
        "supervisor_action": decision.action,
        "supervisor_reasoning": decision.reasoning,
        "iteration": iteration + 1,
        "missing_fields": missing,
        "readiness_score": readiness,
    }
    if decision.search_query:
        updates["search_query"] = decision.search_query

    return updates


# ── 2. EXTRACTION AGENT ───────────────────────────────────────────────

EXTRACTION_PROMPT = """\
You are a concise data-extraction assistant for uni-assist applications.

Known data:
{known}

Missing fields: {missing}

Student's latest message: "{query}"

Generate exactly ONE follow-up question (max 2 sentences) for the most critical missing field.
No greetings, no fluff.

Return JSON: {{"follow_up_question": "...", "target_field": "..."}}"""


async def extraction_agent_node(state: AgentState) -> dict[str, Any]:
    missing = state.get("missing_fields") or _find_missing(state)
    known = {f: state.get(f) for f in _CONTEXT_FIELDS if state.get(f) and state.get(f) not in ("", "N/A", [])}

    prompt = EXTRACTION_PROMPT.format(
        known=json.dumps(known, default=str) if known else "nothing yet",
        missing=", ".join(missing) if missing else "none",
        query=state.get("user_query", ""),
    )

    try:
        response = await _llm_concise.ainvoke([HumanMessage(content=prompt)])
        text = response.content.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        parsed = json.loads(text)
        question = parsed.get("follow_up_question", "Could you provide more details?")
    except Exception:
        logger.exception("Extraction agent failed")
        question = f"What is your {missing[0].replace('_', ' ')}?" if missing else "Could you tell me more?"

    return {
        "follow_up_question": question,
        "final_response": {
            "status": "success",
            "data": {
                "answer": question,
                "sources": [],
                "citations": [],
                "next_steps": [f"Please provide: {', '.join(missing[:3])}"] if missing else [],
                "suggested_actions": [],
                "readiness_score": _compute_readiness(state),
                "missing_fields": missing,
                "seconds_saved": state.get("seconds_saved", 0),
            },
        },
        "messages": [AIMessage(content=question)],
    }


# ── 3. CLARIFICATION AGENT ────────────────────────────────────────────

CLARIFICATION_PROMPT = """\
The student's application data has a conflict.

Conflicts:
{conflicts}

Write ONE brief question (max 2 sentences) to resolve the most important conflict.
Be polite, reference both values. No greetings."""


async def clarification_agent_node(state: AgentState) -> dict[str, Any]:
    conflicts = state.get("conflicts") or []
    if not conflicts:
        return {"supervisor_action": "strategize", "follow_up_question": ""}

    prompt = CLARIFICATION_PROMPT.format(
        conflicts=json.dumps(conflicts, indent=2, default=str),
    )

    try:
        response = await _llm_concise.ainvoke([HumanMessage(content=prompt)])
        question = response.content.strip()
    except Exception:
        logger.exception("Clarification agent failed")
        c = conflicts[0]
        question = (
            f"Your input says {c.get('field', 'a field')} is '{c.get('user_value', '?')}', "
            f"but your document shows '{c.get('document_value', '?')}'. Which is correct?"
        )

    return {
        "follow_up_question": question,
        "final_response": {
            "status": "success",
            "data": {
                "answer": question,
                "sources": [],
                "citations": [],
                "next_steps": ["Resolve the conflict above to continue."],
                "suggested_actions": [],
                "readiness_score": _compute_readiness(state),
                "missing_fields": state.get("missing_fields", []),
                "seconds_saved": state.get("seconds_saved", 0),
            },
        },
        "messages": [AIMessage(content=question)],
    }


# ── 4. RESEARCHER NODE (single-pass search) ───────────────────────────

async def researcher_node(state: AgentState) -> dict[str, Any]:
    query = state.get("search_query", "")
    if not query:
        unis = state.get("universities") or []
        country = state.get("country", "")
        query = f"{unis[0] if unis else ''} {country} uni-assist admission requirements"

    session_id = ""
    for msg in state.get("messages", []):
        if hasattr(msg, "id"):
            session_id = str(msg.id)[:36]
            break

    results, _provider = await _run_search(query, session_id, depth=1)

    new_citations = _extract_citations(results)
    existing_results = state.get("search_results") or []
    existing_citations = state.get("citations") or []
    existing_queries = state.get("research_queries_used") or []

    return {
        "search_results": existing_results + results,
        "citations": existing_citations + new_citations,
        "research_queries_used": existing_queries + [query],
    }


# ── 5. DEEP RESEARCHER NODE (multi-step) ──────────────────────────────

NESTED_QUERY_PROMPT = """\
You are analyzing university admission requirements.

The student is applying to: {university} in {country} for {program} ({degree}).

Here are the CORE requirements found so far:
{core_results}

Identify up to 3 specific 'nested requirements' that need deeper investigation.
Examples: exact portfolio dimensions, minimum GRE/GMAT scores, specific \
language test score thresholds, notarization requirements, APS certificate details.

Return JSON array of search queries:
{{"nested_queries": ["query 1", "query 2", "query 3"]}}

Only include queries for details NOT already answered above. Return fewer if \
the core results are already comprehensive."""


async def deep_researcher_node(state: AgentState) -> dict[str, Any]:
    """Two-phase researcher: core requirements → nested requirement details."""
    session_id = ""
    for msg in state.get("messages", []):
        if hasattr(msg, "id"):
            session_id = str(msg.id)[:36]
            break

    current_depth = state.get("research_depth", 0)
    existing_results = state.get("search_results") or []
    existing_citations = state.get("citations") or []
    existing_queries = state.get("research_queries_used") or []

    unis = state.get("universities") or []
    country = state.get("country") or "Germany"
    program = state.get("program") or "unknown program"
    degree = state.get("degree_type") or "unknown degree"
    uni_name = unis[0] if unis else "German university"

    # ── PHASE A: Core requirements ──

    if current_depth < 1:
        core_query = state.get("search_query") or (
            f"{uni_name} {program} {degree} admission requirements {country}"
        )

        core_results, _prov = await _run_search(core_query, session_id, depth=1)
        core_citations = _extract_citations(core_results)

        return {
            "search_results": existing_results + core_results,
            "citations": existing_citations + core_citations,
            "research_depth": 1,
            "research_queries_used": existing_queries + [core_query],
        }

    # ── PHASE B: Nested requirements ──

    core_summary = json.dumps(existing_results[-5:], indent=2, default=str)[:3000]

    prompt = NESTED_QUERY_PROMPT.format(
        university=uni_name,
        country=country,
        program=program,
        degree=degree,
        core_results=core_summary,
    )

    try:
        response = await _llm_research.ainvoke([HumanMessage(content=prompt)])
        text = response.content.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        parsed = json.loads(text)
        nested_queries: list[str] = parsed.get("nested_queries", [])[:3]
    except Exception:
        logger.exception("Failed to generate nested queries")
        nested_queries = [
            f"{uni_name} {program} language requirements minimum score",
            f"{uni_name} application documents checklist {country}",
        ]

    all_new_results: list[dict] = []
    all_new_citations: list[dict] = []
    all_new_queries: list[str] = []

    for nq in nested_queries:
        if nq in existing_queries:
            continue
        try:
            nr, _prov = await _run_search(nq, session_id, depth=2)
            all_new_results.extend(nr)
            all_new_citations.extend(_extract_citations(nr))
            all_new_queries.append(nq)
        except Exception:
            logger.exception("Nested search failed for: %s", nq)

    return {
        "search_results": existing_results + all_new_results,
        "citations": existing_citations + all_new_citations,
        "research_depth": 2,
        "research_queries_used": existing_queries + all_new_queries,
    }


# ── 6. DB RETRIEVER NODE ──────────────────────────────────────────────

async def db_retriever_node(state: AgentState) -> dict[str, Any]:
    try:
        query = supabase.table("data_db").select(
            "country, universities, program, analysis_results"
        )
        country = state.get("country")
        if country:
            query = query.eq("country", country)
        result = query.limit(5).execute()

        documents = []
        for row in result.data or []:
            raw = row.get("analysis_results", "")
            summary = raw[:500] if isinstance(raw, str) else json.dumps(raw, default=str)[:500]
            documents.append({
                "country": row.get("country"),
                "universities": row.get("universities"),
                "program": row.get("program"),
                "analysis_summary": summary,
            })
    except Exception:
        logger.exception("Supabase retrieval failed")
        documents = []

    existing = state.get("retrieved_documents") or []
    return {"retrieved_documents": existing + documents}


# ── 7. ADMISSIONS STRATEGIST AGENT ─────────────────────────────────────

STRATEGIST_SYSTEM = """\
You are a senior uni-assist admissions strategist. Be direct and actionable.

Rules:
• Max 2 sentences per point. No filler.
• State facts only — never "probably" or "maybe."
• Current date: March 2026.
• Language certificates: B2+ usually required. Flag if lower.
• Focus on rejection risks and how to fix them.
• For every factual claim about a requirement, reference which source it came from.

You MUST also generate exactly 3 "suggested_actions" — predictive next-step \
buttons the student can click. Each has a short label and a hidden intent message.
Choose actions that are contextually useful given what was just discussed.
Examples: "Check English Programs", "Upload my TOEFL", "Compare with TU Berlin"."""


async def strategist_node(state: AgentState) -> dict[str, Any]:
    context_block = _build_context_block(state)
    readiness = _compute_readiness(state)
    missing = state.get("missing_fields") or _find_missing(state)
    citations = state.get("citations") or []

    sources: list[str] = []
    for sr in state.get("search_results") or []:
        url = sr.get("url")
        if url:
            sources.append(url)
    if state.get("retrieved_documents"):
        sources.append("UniMate internal database")
    sources = list(dict.fromkeys(sources))

    citation_block = ""
    if citations:
        citation_block = "\n\nCited facts with sources:\n" + json.dumps(
            citations[:15], indent=2, default=str
        )

    user_content = (
        f"Student profile:\n"
        f"- Country: {state.get('country') or 'N/A'}\n"
        f"- Universities: {', '.join(state.get('universities') or []) or 'N/A'}\n"
        f"- Program: {state.get('program') or 'N/A'}\n"
        f"- Degree: {state.get('degree_type') or 'N/A'}\n"
        f"- Language: {state.get('language_level') or 'N/A'}\n"
        f"- GPA: {state.get('gpa_estimated') or 'N/A'}\n"
        f"- Readiness: {readiness}%\n"
        f"- Account: {'Premium' if state.get('paid') else 'Free'}\n\n"
        f"Query: {state.get('user_query', '')}\n\n"
        f"Research:\n{context_block}"
        f"{citation_block}\n\n"
        f"Sources: {json.dumps(sources)}\n\n"
        "Return JSON with keys: answer, sources, citations (keep the ones you reference), "
        "next_steps (max 3 text items), suggested_actions (exactly 3 buttons with label+intent+icon)."
    )

    try:
        structured = _llm.with_structured_output(ChatResponseData)
        result: ChatResponseData = await structured.ainvoke([
            SystemMessage(content=STRATEGIST_SYSTEM),
            HumanMessage(content=user_content),
        ])
        result.readiness_score = readiness
        result.missing_fields = missing
        result.seconds_saved = state.get("seconds_saved", 0)

        if not result.citations and citations:
            result.citations = [Citation(**c) for c in citations[:10]]

        if not result.suggested_actions:
            result.suggested_actions = _default_actions(state)

        final: dict[str, Any] = {"status": "success", "data": result.model_dump()}
    except Exception:
        logger.exception("Strategist structured output failed")
        raw = await _llm.ainvoke([
            SystemMessage(content=STRATEGIST_SYSTEM),
            HumanMessage(content=user_content),
        ])
        final = {
            "status": "success",
            "data": {
                "answer": raw.content,
                "sources": sources,
                "citations": citations[:10],
                "next_steps": [],
                "suggested_actions": [a.model_dump() for a in _default_actions(state)],
                "readiness_score": readiness,
                "missing_fields": missing,
                "seconds_saved": state.get("seconds_saved", 0),
            },
        }

    return {
        "final_response": final,
        "readiness_score": readiness,
        "messages": [AIMessage(content=final["data"]["answer"])],
    }


def _default_actions(state: AgentState) -> list[SuggestedAction]:
    """Generate sensible fallback buttons based on current state."""
    actions: list[SuggestedAction] = []
    missing = state.get("missing_fields") or []
    uni = (state.get("universities") or [""])[0]

    if "language_level" in missing:
        actions.append(SuggestedAction(
            label="Upload language certificate",
            intent="I want to upload my language certificate to verify my level.",
            icon="Upload",
        ))
    if uni:
        actions.append(SuggestedAction(
            label=f"Requirements for {uni[:20]}",
            intent=f"Show me the full admission requirements for {uni}.",
            icon="Search",
        ))
    if state.get("country"):
        actions.append(SuggestedAction(
            label="Compare universities",
            intent=f"Compare admission requirements across universities in {state['country']}.",
            icon="GitCompare",
        ))

    if not actions:
        actions = [
            SuggestedAction(label="Check requirements", intent="What are the admission requirements?", icon="Search"),
            SuggestedAction(label="Upload documents", intent="I want to upload my documents.", icon="Upload"),
            SuggestedAction(label="Risk analysis", intent="Analyze my rejection risk.", icon="FileText"),
        ]

    return actions[:3]
