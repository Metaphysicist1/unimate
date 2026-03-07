from __future__ import annotations

from typing import Annotated, Optional

from pydantic import BaseModel, Field
from typing_extensions import TypedDict

from langgraph.graph.message import add_messages


# ── Agent State ────────────────────────────────────────────────────────

class AgentState(TypedDict):
    """Unified state for the Supervisor-routed UniMate agent.

    Tracks conversation, user context extracted from intake,
    accumulated research, and the supervisor routing lifecycle.
    """

    messages: Annotated[list, add_messages]

    # User context (populated by intake pipeline or ExtractionAgent)
    user_query: str
    country: str
    program: str
    universities: list[str]
    paid: bool

    degree_type: str
    language_level: str
    gpa_estimated: Optional[float]
    file_sources: list[str]

    # Supervisor routing
    supervisor_action: str       # "extract" | "clarify" | "strategize" | "research" | "retrieve" | "done"
    supervisor_reasoning: str
    iteration: int

    # Research context
    search_results: list[dict]
    retrieved_documents: list[dict]
    search_query: str

    # Extraction / clarification state
    missing_fields: list[str]
    conflicts: list[dict]
    follow_up_question: str

    # Metrics
    readiness_score: int         # 0-100
    seconds_saved: int           # cumulative time saved by file extraction

    # Terminal output
    final_response: Optional[dict]


# ── Structured LLM output models ──────────────────────────────────────

class SupervisorDecision(BaseModel):
    """Parsed output from the Supervisor node."""

    action: str = Field(
        description=(
            "Next step: 'extract' if data is missing, "
            "'clarify' if conflicts exist, "
            "'research' to search the web, "
            "'retrieve' to check the database, "
            "'strategize' when state is complete enough to give a final answer."
        ),
    )
    reasoning: str = Field(description="One-sentence justification.")
    search_query: Optional[str] = Field(
        None, description="Web search query (when action is 'research')."
    )


class RouterDecision(BaseModel):
    """Legacy compat — aliases SupervisorDecision."""
    action: str = Field(description="Next action.")
    reasoning: str = Field(description="Brief justification.")
    search_query: Optional[str] = None


class ChatResponseData(BaseModel):
    """Inner payload returned inside every chat response."""

    answer: str = Field(description="Concise, high-impact analysis text.")
    sources: list[str] = Field(default_factory=list, description="Information sources used.")
    next_steps: list[str] = Field(default_factory=list, description="Recommended actions (max 3).")
    readiness_score: int = Field(default=0, description="Application readiness 0-100.")
    missing_fields: list[str] = Field(default_factory=list, description="Fields still needed.")
    seconds_saved: int = Field(default=0, description="Cumulative seconds saved by file extraction.")


class ChatResponse(BaseModel):
    """Top-level API response wrapper."""

    status: str = "success"
    data: ChatResponseData
