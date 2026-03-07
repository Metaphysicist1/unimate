"""UniMate LangGraph agent — Supervisor pattern with deep research routing."""

from __future__ import annotations

import os

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from app.agent.state import AgentState
from app.agent.nodes import (
    supervisor_node,
    extraction_agent_node,
    clarification_agent_node,
    researcher_node,
    deep_researcher_node,
    db_retriever_node,
    strategist_node,
)
from app.core.config import settings

# ── LangSmith tracing (opt-in) ──────────────────────────────────────────

if settings.LANGCHAIN_TRACING_V2:
    os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
    os.environ.setdefault("LANGCHAIN_API_KEY", settings.LANGCHAIN_API_KEY)
    os.environ.setdefault("LANGCHAIN_PROJECT", settings.LANGCHAIN_PROJECT)


# ── Supervisor routing ───────────────────────────────────────────────────

def _route_after_supervisor(state: AgentState) -> str:
    action = state.get("supervisor_action", "strategize")
    route_map = {
        "extract": "extraction_agent",
        "clarify": "clarification_agent",
        "research": "researcher",
        "deep_research": "deep_researcher",
        "retrieve": "db_retriever",
        "strategize": "strategist",
    }
    return route_map.get(action, "strategist")


def _route_after_deep_research(state: AgentState) -> str:
    """After deep research, loop back if depth < 2, else go to supervisor."""
    depth = state.get("research_depth", 0)
    if depth < 2:
        return "deep_researcher"
    return "supervisor"


# ── Graph construction ───────────────────────────────────────────────────

def build_graph() -> StateGraph:
    """
    Supervisor Pattern with Deep Research:

      START → supervisor →  extraction_agent  → END
                         |  clarification_agent → END
                         |  researcher         → supervisor (loop)
                         |  deep_researcher    → deep_researcher (if depth<2) | supervisor
                         |  db_retriever       → supervisor (loop)
                         |  strategist         → END
    """
    builder = StateGraph(AgentState)

    builder.add_node("supervisor", supervisor_node)
    builder.add_node("extraction_agent", extraction_agent_node)
    builder.add_node("clarification_agent", clarification_agent_node)
    builder.add_node("researcher", researcher_node)
    builder.add_node("deep_researcher", deep_researcher_node)
    builder.add_node("db_retriever", db_retriever_node)
    builder.add_node("strategist", strategist_node)

    builder.add_edge(START, "supervisor")

    builder.add_conditional_edges(
        "supervisor",
        _route_after_supervisor,
        {
            "extraction_agent": "extraction_agent",
            "clarification_agent": "clarification_agent",
            "researcher": "researcher",
            "deep_researcher": "deep_researcher",
            "db_retriever": "db_retriever",
            "strategist": "strategist",
        },
    )

    builder.add_edge("researcher", "supervisor")
    builder.add_conditional_edges(
        "deep_researcher",
        _route_after_deep_research,
        {
            "deep_researcher": "deep_researcher",
            "supervisor": "supervisor",
        },
    )
    builder.add_edge("db_retriever", "supervisor")

    builder.add_edge("extraction_agent", END)
    builder.add_edge("clarification_agent", END)
    builder.add_edge("strategist", END)

    return builder


# ── Compiled graph (singleton) ───────────────────────────────────────────

memory = MemorySaver()
graph = build_graph().compile(checkpointer=memory)
