from __future__ import annotations

import json
import logging
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from duckduckgo_search import DDGS

from app.agent.state import AgentState, ChatResponseData, RouterDecision
from app.core.config import settings
from app.services.database import supabase

logger = logging.getLogger(__name__)

MAX_ITERATIONS = 2

_llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    google_api_key=settings.GOOGLE_GEMINI_API_KEY,
    temperature=0.3,
)


# ── helpers ──────────────────────────────────────────────────────────────


def _build_context_block(state: AgentState) -> str:
    """Render accumulated search results and DB records into a text block."""
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
    return "\n\n".join(parts) or "No additional context gathered yet."


# ── 1. Logic Node (the "Brain") ─────────────────────────────────────────


ROUTER_PROMPT = """\
You are a routing controller for a uni-assist application advisor.

Student context:
- Country: {country}
- Target universities: {universities}
- Program: {program}
- Query: {user_query}

Gathered context so far:
{context}

Iteration {iteration}/{max_iter}.

Decide the single best next step:
• "search"   – you still need to look up specific university requirements or \
country-specific admission rules online.
• "retrieve" – you need to check the internal database for similar past \
applications.
• "respond"  – you already have enough information (or the question is \
self-contained) and can give a thorough answer now.

Return your decision as JSON: \
{{"action": "search"|"retrieve"|"respond", "reasoning": "...", \
"search_query": "..." or null}}"""


async def logic_node(state: AgentState) -> dict[str, Any]:
    """Decide whether the agent needs more data or can produce a final answer."""
    iteration = state.get("iteration", 0)

    if iteration >= MAX_ITERATIONS:
        return {"next_action": "respond", "iteration": iteration}

    prompt_text = ROUTER_PROMPT.format(
        country=state.get("country") or "N/A",
        universities=", ".join(state.get("universities") or []) or "N/A",
        program=state.get("program") or "N/A",
        user_query=state.get("user_query", ""),
        context=_build_context_block(state),
        iteration=iteration,
        max_iter=MAX_ITERATIONS,
    )

    try:
        router_llm = _llm.with_structured_output(RouterDecision)
        decision: RouterDecision = await router_llm.ainvoke(
            [HumanMessage(content=prompt_text)]
        )
    except Exception:
        logger.exception("Structured routing failed — falling back to 'respond'")
        return {"next_action": "respond", "iteration": iteration}

    updates: dict[str, Any] = {
        "next_action": decision.action,
        "iteration": iteration + 1,
    }
    if decision.action == "search" and decision.search_query:
        updates["search_query"] = decision.search_query

    return updates


# ── 2. Researcher Node (web search) ─────────────────────────────────────


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
            {
                "title": r.get("title", ""),
                "snippet": r.get("body", ""),
                "url": r.get("href", ""),
            }
            for r in raw
        ]
    except Exception:
        logger.exception("DuckDuckGo search failed")
        results = [
            {
                "title": "Search unavailable",
                "snippet": "Web search could not be completed.",
                "url": "",
            }
        ]

    existing = state.get("search_results") or []
    return {"search_results": existing + results}


# ── 3. DB Retriever Node ────────────────────────────────────────────────


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
            raw_analysis = row.get("analysis_results", "")
            summary = (
                raw_analysis[:500]
                if isinstance(raw_analysis, str)
                else json.dumps(raw_analysis, default=str)[:500]
            )
            documents.append(
                {
                    "country": row.get("country"),
                    "universities": row.get("universities"),
                    "program": row.get("program"),
                    "analysis_summary": summary,
                }
            )
    except Exception:
        logger.exception("Supabase retrieval failed")
        documents = []

    existing = state.get("retrieved_documents") or []
    return {"retrieved_documents": existing + documents}


# ── 4. Formatter Node ───────────────────────────────────────────────────

FORMATTER_SYSTEM = """\
You are an expert uni-assist application auditor for German universities.

Rules:
• Be polite but very direct and formal.
• Never say "probably" or "maybe" — only state facts the user actually provided.
• If information is missing, state that clearly and ask for it in `next_steps`.
• Current date for certificate-age calculations: March 2026.
• For language certificates: B2 or higher is usually required — flag if lower.
• Start by confirming which information the user has already provided.
• Provide concrete, actionable advice.
"""


async def formatter_node(state: AgentState) -> dict[str, Any]:
    """Generate the final structured JSON response using all gathered context."""
    context = _build_context_block(state)

    sources: list[str] = []
    for sr in state.get("search_results") or []:
        url = sr.get("url")
        if url:
            sources.append(url)
    if state.get("retrieved_documents"):
        sources.append("UniMate internal database")

    user_content = (
        f"Student application details:\n"
        f"- Country: {state.get('country') or 'N/A'}\n"
        f"- Target universities: {', '.join(state.get('universities') or []) or 'N/A'}\n"
        f"- Program: {state.get('program') or 'N/A'}\n"
        f"- Account: {'Premium' if state.get('paid') else 'Free tier'}\n\n"
        f"User query:\n{state.get('user_query', '')}\n\n"
        f"Gathered context:\n{context}\n\n"
        f"Known sources: {json.dumps(sources)}\n\n"
        "Provide your analysis as a JSON object with keys: "
        '"answer" (str), "sources" (list[str]), "next_steps" (list[str]).'
    )

    try:
        structured_llm = _llm.with_structured_output(ChatResponseData)
        result: ChatResponseData = await structured_llm.ainvoke(
            [
                SystemMessage(content=FORMATTER_SYSTEM),
                HumanMessage(content=user_content),
            ]
        )
        final: dict[str, Any] = {"status": "success", "data": result.model_dump()}
    except Exception:
        logger.exception("Structured formatting failed — using raw LLM output")
        raw = await _llm.ainvoke(
            [
                SystemMessage(content=FORMATTER_SYSTEM),
                HumanMessage(content=user_content),
            ]
        )
        final = {
            "status": "success",
            "data": {
                "answer": raw.content,
                "sources": sources,
                "next_steps": [],
            },
        }

    return {
        "final_response": final,
        "messages": [AIMessage(content=final["data"]["answer"])],
    }
