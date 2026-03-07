"""POST /chat endpoint — invokes the LangGraph agent and returns structured JSON."""

from __future__ import annotations

import uuid
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
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
    paid: bool = False


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Run the UniMate LangGraph agent and return a stable JSON response."""
    session_id = request.session_id or str(uuid.uuid4())

    initial_state = {
        "messages": [HumanMessage(content=request.message)],
        "retrieved_documents": [],
        "search_results": [],
        "user_query": request.message,
        "country": request.country or "",
        "program": request.program or "",
        "universities": request.universities,
        "paid": request.paid,
        "next_action": "",
        "search_query": "",
        "iteration": 0,
        "final_response": None,
    }

    config = {"configurable": {"thread_id": session_id}}

    try:
        result = await graph.ainvoke(initial_state, config=config)
    except Exception as exc:
        logger.exception("Agent graph execution failed")
        raise HTTPException(
            status_code=500,
            detail=f"Agent execution failed: {exc}",
        )

    final = result.get("final_response")
    if not final:
        raise HTTPException(
            status_code=500,
            detail="Agent completed but did not produce a response",
        )

    return ChatResponse(**final)
