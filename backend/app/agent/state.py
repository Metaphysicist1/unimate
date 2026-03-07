from __future__ import annotations

from typing import Annotated, Optional

from pydantic import BaseModel, Field
from typing_extensions import TypedDict

from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """State schema for the UniMate LangGraph agent.

    Tracks conversation history, accumulated context from web searches
    and database lookups, and the routing / output lifecycle.
    """

    messages: Annotated[list, add_messages]
    retrieved_documents: list[dict]
    search_results: list[dict]

    user_query: str
    country: str
    program: str
    universities: list[str]
    paid: bool

    next_action: str          # "search" | "retrieve" | "respond"
    search_query: str         # populated by logic_node for the researcher
    iteration: int            # guards against infinite loops

    final_response: Optional[dict]


# ── Structured routing decision (used by logic_node) ────────────────────

class RouterDecision(BaseModel):
    """Parsed routing output from the logic node."""

    action: str = Field(
        description=(
            "Next action: 'search' to look up university info online, "
            "'retrieve' to check the database for past analyses, "
            "'respond' when enough information is available."
        ),
    )
    reasoning: str = Field(description="Brief justification for the chosen action")
    search_query: Optional[str] = Field(
        None,
        description="Web search query (required when action is 'search')",
    )


# ── Pydantic models for the stable JSON contract with the frontend ──────

class ChatResponseData(BaseModel):
    """Inner payload returned inside every chat response."""

    answer: str = Field(description="Comprehensive analysis or response text")
    sources: list[str] = Field(default_factory=list, description="Information sources used")
    next_steps: list[str] = Field(default_factory=list, description="Recommended next actions for the student")


class ChatResponse(BaseModel):
    """Top-level API response wrapper — always this shape, never raw strings."""

    status: str = "success"
    data: ChatResponseData
