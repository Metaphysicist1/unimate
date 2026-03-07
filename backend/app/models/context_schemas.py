from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime


class GapInfo(BaseModel):
    field: str
    question: str


class ConflictInfo(BaseModel):
    field: str
    user_value: str
    document_value: str
    resolution_question: str


class UserContext(BaseModel):
    degree_type: Optional[str] = None
    language_level: Optional[str] = None
    target_country: Optional[str] = None
    target_university: Optional[str] = None
    target_program: Optional[str] = None
    gpa_estimated: Optional[float] = None
    gaps_in_info: List[GapInfo] = []
    conflicts: List[ConflictInfo] = []
    raw_prompt: str = ""
    file_sources: List[str] = []


class ExtractionRequest(BaseModel):
    user_input: str
    file_text: Optional[str] = None
    previous_context: Optional[UserContext] = None
    session_id: Optional[str] = None


class ExtractionResponse(BaseModel):
    context: UserContext
    confidence: Dict[str, float] = {}
    follow_up_questions: List[str] = []
    status: str = "needs_info"


class UserContextRow(BaseModel):
    """Maps to the user_context Supabase table."""
    id: Optional[str] = None
    session_id: str
    raw_prompt: str
    degree_type: Optional[str] = None
    language_level: Optional[str] = None
    target_country: Optional[str] = None
    target_university: Optional[str] = None
    target_program: Optional[str] = None
    gpa_estimated: Optional[float] = None
    gaps_in_info: Optional[List[dict]] = None
    conflicts: Optional[List[dict]] = None
    file_sources: Optional[List[str]] = None
    confidence: Optional[Dict[str, float]] = None
    status: str = "needs_info"
    confirmed: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
