"""POST /chat and GET /chat/stream endpoints — LangGraph agent with SSE streaming."""

from __future__ import annotations

import json
import uuid
import logging
from typing import Optional, AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage

from app.agent.graph import graph
from app.agent.state import ChatResponse

logger = logging.getLogger(__name__)
router = APIRouter()


class ChatRequest(BaseModel):
    """Incoming chat payload from the frontend."""

    message: str
    session_id: Optional[str] = None
    country: Optional[str] = None
    program: Optional[str] = None
    universities: list[str] = Field(default_factory=list)
    degree_type: Optional[str] = None
    language_level: Optional[str] = None
    gpa_estimated: Optional[float] = None
    file_sources: list[str] = Field(default_factory=list)
    seconds_saved: int = 0
    paid: bool = False


def _build_initial_state(request: ChatRequest) -> dict:
    return {
        "messages": [HumanMessage(content=request.message)],
        "retrieved_documents": [],
        "search_results": [],
        "user_query": request.message,
        "country": request.country or "",
        "program": request.program or "",
        "universities": request.universities,
        "paid": request.paid,
        "degree_type": request.degree_type or "",
        "language_level": request.language_level or "",
        "gpa_estimated": request.gpa_estimated,
        "file_sources": request.file_sources,
        "supervisor_action": "",
        "supervisor_reasoning": "",
        "iteration": 0,
        "search_query": "",
        "research_depth": 0,
        "research_queries_used": [],
        "citations": [],
        "missing_fields": [],
        "conflicts": [],
        "follow_up_question": "",
        "readiness_score": 0,
        "seconds_saved": request.seconds_saved,
        "final_response": None,
    }


# ── Standard (non-streaming) endpoint ──────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Run the UniMate Supervisor agent and return a stable JSON response."""
    session_id = request.session_id or str(uuid.uuid4())
    initial_state = _build_initial_state(request)
    config = {"configurable": {"thread_id": session_id}}

    try:
        result = await graph.ainvoke(initial_state, config=config)
    except Exception as exc:
        logger.exception("Agent graph execution failed")
        raise HTTPException(status_code=500, detail=f"Agent execution failed: {exc}")

    final = result.get("final_response")
    if not final:
        raise HTTPException(status_code=500, detail="Agent completed but produced no response.")

    return ChatResponse(**final)


# ── SSE streaming endpoint ─────────────────────────────────────────────

async def _stream_agent(request: ChatRequest) -> AsyncGenerator[str, None]:
    """Yield SSE events as the Supervisor graph progresses through nodes."""
    session_id = request.session_id or str(uuid.uuid4())
    initial_state = _build_initial_state(request)
    config = {"configurable": {"thread_id": session_id}}

    yield _sse_event("session", {"session_id": session_id})
    yield _sse_event("status", {"node": "supervisor", "phase": "starting"})

    try:
        async for event in graph.astream(initial_state, config=config, stream_mode="updates"):
            for node_name, node_output in event.items():
                node_data = {
                    "node": node_name,
                    "supervisor_action": node_output.get("supervisor_action", ""),
                    "supervisor_reasoning": node_output.get("supervisor_reasoning", ""),
                    "readiness_score": node_output.get("readiness_score", 0),
                    "missing_fields": node_output.get("missing_fields", []),
                    "seconds_saved": node_output.get("seconds_saved", 0),
                    "follow_up_question": node_output.get("follow_up_question", ""),
                }
                yield _sse_event("node_update", node_data)

                if node_name in ("researcher", "deep_researcher"):
                    depth = node_output.get("research_depth", 0)
                    queries = node_output.get("research_queries_used", [])
                    citation_count = len(node_output.get("citations", []))
                    yield _sse_event("research_progress", {
                        "depth": depth,
                        "queries_used": queries[-3:],
                        "citation_count": citation_count,
                        "phase": "core" if depth <= 1 else "nested",
                    })

                if node_output.get("final_response"):
                    yield _sse_event("final", node_output["final_response"])

    except Exception as exc:
        logger.exception("Streaming agent error")
        yield _sse_event("error", {"detail": str(exc)})

    yield _sse_event("done", {"session_id": session_id})


def _sse_event(event_type: str, data: dict) -> str:
    """Format a single SSE event."""
    payload = json.dumps(data, default=str)
    return f"event: {event_type}\ndata: {payload}\n\n"


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """SSE streaming endpoint. Each node transition emits a state-delta event."""
    return StreamingResponse(
        _stream_agent(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
