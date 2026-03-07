"""UniMate LangGraph agent — graph compilation, checkpointer & LangSmith setup."""

from __future__ import annotations

import os

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from app.agent.state import AgentState
from app.agent.nodes import (
    logic_node,
    researcher_node,
    db_retriever_node,
    formatter_node,
)
from app.core.config import settings

# ── LangSmith tracing (opt-in via .env) ─────────────────────────────────

if settings.LANGCHAIN_TRACING_V2:
    os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
    os.environ.setdefault("LANGCHAIN_API_KEY", settings.LANGCHAIN_API_KEY)
    os.environ.setdefault("LANGCHAIN_PROJECT", settings.LANGCHAIN_PROJECT)


# ── Conditional router ──────────────────────────────────────────────────

def _route_after_logic(state: AgentState) -> str:
    """Return the next node name based on the logic node's decision."""
    action = state.get("next_action", "respond")
    if action == "search":
        return "researcher"
    if action == "retrieve":
        return "db_retriever"
    return "formatter"


# ── Graph construction ──────────────────────────────────────────────────

def build_graph() -> StateGraph:
    """Wire nodes and edges into a LangGraph StateGraph."""
    builder = StateGraph(AgentState)

    builder.add_node("logic", logic_node)
    builder.add_node("researcher", researcher_node)
    builder.add_node("db_retriever", db_retriever_node)
    builder.add_node("formatter", formatter_node)

    builder.add_edge(START, "logic")
    builder.add_conditional_edges(
        "logic",
        _route_after_logic,
        {
            "researcher": "researcher",
            "db_retriever": "db_retriever",
            "formatter": "formatter",
        },
    )
    builder.add_edge("researcher", "logic")
    builder.add_edge("db_retriever", "logic")
    builder.add_edge("formatter", END)

    return builder


# ── Compiled graph (singleton) ──────────────────────────────────────────

memory = MemorySaver()
graph = build_graph().compile(checkpointer=memory)
