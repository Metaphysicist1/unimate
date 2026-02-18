from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class AnalysisRequest(BaseModel):
    email: Optional[EmailStr] = None
    country: str
    universities: List[str]

class Issue(BaseModel):
    severity: str  # CRITICAL, WARNING, INFO
    category: str
    title: str
    description: str
    how_to_fix: Optional[str] = None
    estimated_cost: Optional[str] = None
    estimated_time: Optional[str] = None
    common_percentage: int
    example: Optional[dict] = None

class ActionPlan(BaseModel):
    must_fix: List[str]
    recommended: List[str]

class AnalysisResult(BaseModel):
    overall_risk: str  # LOW, MEDIUM, HIGH
    rejection_probability: int
    issues_found: List[Issue]
    what_looks_good: List[str]
    action_plan: ActionPlan

class Application(BaseModel):
    id: str
    email: Optional[str]
    country: str
    universities: List[str]
    status: str
    risk_level: Optional[str]
    rejection_probability: Optional[int]
    analysis_results: Optional[AnalysisResult]
    paid: bool = False
    created_at: datetime
    completed_at: Optional[datetime]

class PaymentRequest(BaseModel):
    application_id: str
    email: EmailStr

class PaymentResponse(BaseModel):
    checkout_url: str
    session_id: str