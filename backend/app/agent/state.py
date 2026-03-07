from __future__ import annotations

from typing import Annotated, Optional

from pydantic import BaseModel, Field
from typing_extensions import TypedDict

from langgraph.graph.message import add_messages


# ── Agent State ────────────────────────────────────────────────────────

class AgentState(TypedDict):
    """Unified state for the Supervisor-routed UniMate agent.

    Tracks conversation, user context, accumulated research with
    citations, and the supervisor routing lifecycle.
    """

    messages: Annotated[list, add_messages]

    # User context
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
    supervisor_action: str
    supervisor_reasoning: str
    iteration: int

    # Research context
    search_results: list[dict]
    retrieved_documents: list[dict]
    search_query: str
    research_depth: int          # 0 = not started, 1 = core done, 2 = nested done
    research_queries_used: list[str]

    # Citations collected during research
    citations: list[dict]        # [{fact, source_url, source_title, last_verified}]

    # Extraction / clarification
    missing_fields: list[str]
    conflicts: list[dict]
    follow_up_question: str

    # Metrics
    readiness_score: int
    seconds_saved: int

    # Terminal output
    final_response: Optional[dict]


# ── Structured LLM output models ──────────────────────────────────────

class SupervisorDecision(BaseModel):
    """Parsed output from the Supervisor node."""

    action: str = Field(
        description=(
            "Next step: 'extract' if data is missing, "
            "'clarify' if conflicts exist, "
            "'research' to search the web (single pass), "
            "'deep_research' for multi-step requirement discovery, "
            "'retrieve' to check the database, "
            "'strategize' when state is complete enough to answer."
        ),
    )
    reasoning: str = Field(description="One-sentence justification.")
    search_query: Optional[str] = Field(
        None, description="Web search query (when action is 'research' or 'deep_research')."
    )


class RouterDecision(BaseModel):
    """Legacy compat."""
    action: str = Field(description="Next action.")
    reasoning: str = Field(description="Brief justification.")
    search_query: Optional[str] = None


# ── Citation model ─────────────────────────────────────────────────────

class Citation(BaseModel):
    """A single cited fact from web research."""

    fact: str = Field(description="The specific requirement or piece of information.")
    source_url: str = Field(default="", description="URL where this was found.")
    source_title: str = Field(default="", description="Page title of the source.")
    last_verified: str = Field(default="", description="ISO timestamp when this was retrieved.")


# ── Suggested action (next-step button) ────────────────────────────────

class SuggestedAction(BaseModel):
    """A predictive next-step button shown to the user."""

    label: str = Field(description="Short button label (max 6 words).")
    intent: str = Field(description="Hidden intent message sent to the agent when clicked.")
    icon: str = Field(
        default="ArrowRight",
        description="Lucide icon name: ArrowRight, Upload, Search, GitCompare, Globe, FileText.",
    )


# ── Response payloads ──────────────────────────────────────────────────

class ChatResponseData(BaseModel):
    """Inner payload returned inside every chat response."""

    answer: str = Field(description="Concise, high-impact analysis text.")
    sources: list[str] = Field(default_factory=list, description="Source URLs used.")
    citations: list[Citation] = Field(default_factory=list, description="Cited facts with provenance.")
    next_steps: list[str] = Field(default_factory=list, description="Text-based recommended actions.")
    suggested_actions: list[SuggestedAction] = Field(
        default_factory=list,
        description="Exactly 3 predictive next-step buttons.",
    )
    readiness_score: int = Field(default=0)
    missing_fields: list[str] = Field(default_factory=list)
    seconds_saved: int = Field(default=0)


class ChatResponse(BaseModel):
    """Top-level API response wrapper."""

    status: str = "success"
    data: ChatResponseData
