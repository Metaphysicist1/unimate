"""UniMate LangGraph agent — Supervisor pattern with specialist routing."""

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
    db_retriever_node,
    strategist_node,
)
from app.core.config import settings

# ── LangSmith tracing (opt-in via .env) ─────────────────────────────────

if settings.LANGCHAIN_TRACING_V2:
    os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
    os.environ.setdefault("LANGCHAIN_API_KEY", settings.LANGCHAIN_API_KEY)
    os.environ.setdefault("LANGCHAIN_PROJECT", settings.LANGCHAIN_PROJECT)


# ── Supervisor routing function ────────────────────────────────────────

def _route_after_supervisor(state: AgentState) -> str:
    """Route to the specialist agent chosen by the Supervisor."""
    action = state.get("supervisor_action", "strategize")
    route_map = {
        "extract": "extraction_agent",
        "clarify": "clarification_agent",
        "research": "researcher",
        "retrieve": "db_retriever",
        "strategize": "strategist",
    }
    return route_map.get(action, "strategist")


# ── Graph construction ──────────────────────────────────────────────────

def build_graph() -> StateGraph:
    """
    Supervisor Pattern:
      START → supervisor → (extract|clarify|research|retrieve|strategize)
      extract/clarify → END (they produce final_response with follow-up)
      research/retrieve → supervisor (loop back for next decision)
      strategist → END
    """
    builder = StateGraph(AgentState)

    builder.add_node("supervisor", supervisor_node)
    builder.add_node("extraction_agent", extraction_agent_node)
    builder.add_node("clarification_agent", clarification_agent_node)
    builder.add_node("researcher", researcher_node)
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
            "db_retriever": "db_retriever",
            "strategist": "strategist",
        },
    )

    # Research/retrieve loop back to supervisor for next decision
    builder.add_edge("researcher", "supervisor")
    builder.add_edge("db_retriever", "supervisor")

    # Terminal nodes produce final_response and end
    builder.add_edge("extraction_agent", END)
    builder.add_edge("clarification_agent", END)
    builder.add_edge("strategist", END)

    return builder


# ── Compiled graph (singleton) ──────────────────────────────────────────

memory = MemorySaver()
graph = build_graph().compile(checkpointer=memory)
