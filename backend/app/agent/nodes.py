from __future__ import annotations

import json
import logging
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from duckduckgo_search import DDGS

from app.agent.state import (
    AgentState,
    SupervisorDecision,
    ChatResponseData,
)
from app.core.config import settings
from app.services.database import supabase

logger = logging.getLogger(__name__)

MAX_ITERATIONS = 4

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


# ── Helpers ────────────────────────────────────────────────────────────

_CONTEXT_FIELDS = [
    "country", "program", "universities", "degree_type",
    "language_level", "gpa_estimated",
]

SECONDS_PER_FIELD = 45


def _compute_readiness(state: AgentState) -> int:
    """0-100 score based on how many required fields are filled."""
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
    """Return names of key fields that are still empty."""
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
- Iteration: {iteration}/{max_iter}

Actions:
• "extract"    – important fields are still missing; ask the student.
• "clarify"    – conflicting data found (e.g. CV says A1 but user says B2).
• "research"   – need to look up university-specific requirements online.
• "retrieve"   – check internal DB for similar past applications.
• "strategize" – enough data to give a thorough admissions analysis.

Pick ONE action. Return JSON: {{"action": "...", "reasoning": "...", "search_query": "..." or null}}"""


async def supervisor_node(state: AgentState) -> dict[str, Any]:
    """Evaluate state, decide which specialist agent to invoke next."""
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
        iteration=iteration,
        max_iter=MAX_ITERATIONS,
    )

    try:
        structured = _llm_concise.with_structured_output(SupervisorDecision)
        decision: SupervisorDecision = await structured.ainvoke(
            [HumanMessage(content=prompt)]
        )
    except Exception:
        logger.exception("Supervisor routing failed — defaulting to strategize")
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
    if decision.action == "research" and decision.search_query:
        updates["search_query"] = decision.search_query

    return updates


# ── 2. EXTRACTION AGENT ───────────────────────────────────────────────

EXTRACTION_PROMPT = """\
You are a concise data-extraction assistant. The student is applying to a German university via uni-assist.

Known data:
{known}

Missing fields: {missing}

Student's latest message: "{query}"

Generate exactly ONE follow-up question (max 2 sentences) to fill the most critical missing field.
No greetings, no fluff. Be specific and direct.

Return JSON: {{"follow_up_question": "...", "target_field": "..."}}"""


async def extraction_agent_node(state: AgentState) -> dict[str, Any]:
    """Ask a single, precise follow-up to fill the most critical gap."""
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
        question = parsed.get("follow_up_question", "Could you provide more details about your application?")
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
                "next_steps": [f"Please provide: {', '.join(missing[:3])}"] if missing else [],
                "readiness_score": _compute_readiness(state),
                "missing_fields": missing,
                "seconds_saved": state.get("seconds_saved", 0),
            },
        },
        "messages": [AIMessage(content=question)],
    }


# ── 3. CLARIFICATION AGENT ────────────────────────────────────────────

CLARIFICATION_PROMPT = """\
You are a polite but direct clarification agent. The student's application data has a conflict.

Conflicts:
{conflicts}

Write ONE brief question (max 2 sentences) to resolve the most important conflict.
Be polite, reference both values, and ask which is correct.
No greetings, no filler."""


async def clarification_agent_node(state: AgentState) -> dict[str, Any]:
    """Resolve data conflicts with a single, polite, direct question."""
    conflicts = state.get("conflicts") or []

    if not conflicts:
        return {
            "supervisor_action": "strategize",
            "follow_up_question": "",
        }

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
                "next_steps": ["Resolve the conflict above so we can continue."],
                "readiness_score": _compute_readiness(state),
                "missing_fields": state.get("missing_fields", []),
                "seconds_saved": state.get("seconds_saved", 0),
            },
        },
        "messages": [AIMessage(content=question)],
    }


# ── 4. RESEARCHER NODE (web search) ───────────────────────────────────

async def researcher_node(state: AgentState) -> dict[str, Any]:
    """Run a DuckDuckGo web search and append results to state."""
    query = state.get("search_query", "")
    if not query:
        unis = state.get("universities") or []
        country = state.get("country", "")
        query = f"{unis[0] if unis else ''} {country} uni-assist admission requirements"

    try:
        with DDGS() as ddgs:
            raw = list(ddgs.text(query, max_results=5))
        results = [
            {"title": r.get("title", ""), "snippet": r.get("body", ""), "url": r.get("href", "")}
            for r in raw
        ]
    except Exception:
        logger.exception("DuckDuckGo search failed")
        results = [{"title": "Search unavailable", "snippet": "Web search could not be completed.", "url": ""}]

    existing = state.get("search_results") or []
    return {"search_results": existing + results}


# ── 5. DB RETRIEVER NODE ──────────────────────────────────────────────

async def db_retriever_node(state: AgentState) -> dict[str, Any]:
    """Query Supabase for past applications with similar parameters."""
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


# ── 6. ADMISSIONS STRATEGIST AGENT ─────────────────────────────────────

STRATEGIST_SYSTEM = """\
You are a senior uni-assist admissions strategist. Be direct, specific, and actionable.

Rules:
• Max 2 sentences per point. No filler, no "AI fluff."
• State facts only — never "probably" or "maybe."
• If information is missing, note it in next_steps (max 3 items).
• Current date: March 2026.
• Language certificates: B2+ usually required. Flag if lower.
• Focus on rejection risks and how to fix them."""


async def strategist_node(state: AgentState) -> dict[str, Any]:
    """Generate the final admissions analysis using all gathered context."""
    context_block = _build_context_block(state)
    readiness = _compute_readiness(state)
    missing = state.get("missing_fields") or _find_missing(state)

    sources: list[str] = []
    for sr in state.get("search_results") or []:
        url = sr.get("url")
        if url:
            sources.append(url)
    if state.get("retrieved_documents"):
        sources.append("UniMate internal database")

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
        f"Research:\n{context_block}\n\n"
        f"Sources: {json.dumps(sources)}\n\n"
        "Return JSON: {{\"answer\": \"...\", \"sources\": [...], \"next_steps\": [...]}}"
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
        final: dict[str, Any] = {"status": "success", "data": result.model_dump()}
    except Exception:
        logger.exception("Strategist structured output failed — using raw output")
        raw = await _llm.ainvoke([
            SystemMessage(content=STRATEGIST_SYSTEM),
            HumanMessage(content=user_content),
        ])
        final = {
            "status": "success",
            "data": {
                "answer": raw.content,
                "sources": sources,
                "next_steps": [],
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
