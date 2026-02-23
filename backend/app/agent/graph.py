from typing import Annotated, Any, Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from typing_extensions import TypedDict


# ============================================================================
# Document Metadata Models
# ============================================================================

class DocumentMetadata(BaseModel):
    """Metadata for uploaded documents"""
    file_name: str
    file_type: str  # "transcript", "degree_certificate", "language_certificate"
    upload_timestamp: datetime
    file_size_bytes: int
    content_type: str  # "application/pdf", "application/vnd.ms-word", etc.
    extraction_status: str  # "pending", "extracted", "failed"
    extraction_error: Optional[str] = None
    extracted_text_preview: Optional[str] = None


class StudentProfile(BaseModel):
    """Extracted student information from documents"""
    # Personal Info
    country_of_origin: Optional[str] = None
    target_universities: List[str] = Field(default_factory=list)
    email: Optional[str] = None
    
    # Academic Info
    gpa: Optional[float] = None
    gpa_scale: Optional[str] = None  # "4.0", "5.0", etc.
    degree_type: Optional[str] = None  # "Bachelor", "Master", etc.
    degree_field: Optional[str] = None
    graduation_date: Optional[str] = None
    total_ects: Optional[int] = None
    
    # Language Proficiency
    language_test_type: Optional[str] = None  # "TestDaF", "DSH", "Goethe", etc.
    language_level: Optional[str] = None  # "B2", "C1", etc.
    language_test_date: Optional[str] = None
    language_score: Optional[str] = None
    
    # Extracted Metadata
    extracted_at: Optional[datetime] = None
    confidence_score: Optional[float] = None
    extraction_notes: List[str] = Field(default_factory=list)


class AnalysisIssue(BaseModel):
    """Represents a single detected issue"""
    severity: str  # "CRITICAL", "WARNING", "INFO"
    category: str  # Document type or issue category
    title: str
    description: str
    detected_at: datetime = Field(default_factory=datetime.now)


class GraphState(TypedDict):
    """
    State schema for LangGraph workflow.
    
    Controls the flow of document processing, analysis, and feedback generation
    for uni-assist application verification.
    """
    
    # ========================================================================
    # Session & Context
    # ========================================================================
    
    application_id: str
    """Unique identifier for this application analysis session"""
    
    session_started: datetime
    """Timestamp when the analysis session began"""
    
    user_email: Optional[str]
    """User's email address (optional for free tier)"""
    
    # ========================================================================
    # Message History (for multi-turn conversation)
    # ========================================================================
    
    messages: Annotated[List[BaseMessage], "Chat history with user"]
    """
    List of all messages in the conversation.
    Includes both user queries and AI responses.
    Used for context-aware follow-up questions and clarifications.
    """
    
    # ========================================================================
    # Document Processing
    # ========================================================================
    
    context_docs: Annotated[List[DocumentMetadata], "Uploaded document metadata"]
    """
    Metadata for all uploaded documents.
    Tracks file info, extraction status, and extracted previews.
    """
    
    extracted_text: Dict[str, str]
    """
    Raw extracted text from documents.
    Keys: "transcript", "degree_certificate", "language_certificate"
    """
    
    extraction_errors: Dict[str, Optional[str]]
    """
    Extraction errors per document (if any).
    Used to determine if re-upload is needed.
    """
    
    # ========================================================================
    # Student Profile (Extracted Facts)
    # ========================================================================
    
    student_profile: StudentProfile
    """
    Structured extracted information about the student.
    Updated as documents are processed and validated.
    """
    
    # ========================================================================
    # Analysis Results
    # ========================================================================
    
    issues_detected: List[AnalysisIssue]
    """List of all detected issues during analysis"""
    
    overall_risk_level: Optional[str]
    """Overall assessment: "LOW", "MEDIUM", "HIGH" """
    
    rejection_probability: Optional[int]
    """Estimated rejection probability (0-100)"""
    
    strengths_identified: List[str]
    """Positive findings from document review"""
    
    action_items: Dict[str, List[str]]
    """
    Categorized action items.
    Keys: "must_fix", "recommended", "optional"
    """
    
    # ========================================================================
    # Workflow Control
    # ========================================================================
    
    next_action: str
    """
    Controls graph routing. Possible values:
    - "extract_documents" - Start text extraction from PDFs
    - "validate_documents" - Check document quality and completeness
    - "analyze_profile" - Extract structured student info
    - "run_analysis" - Execute full application analysis
    - "clarify_ambiguity" - Ask user for clarification on ambiguous info
    - "generate_report" - Create final report
    - "complete" - Mark analysis as complete
    - "error" - Handle error state
    """
    
    processing_status: str
    """Current status: "processing", "waiting_for_user", "complete", "failed" """
    
    current_step: int
    """Track which step of the workflow we're on"""
    
    total_steps: int
    """Total expected steps in workflow"""
    
    # ========================================================================
    # Validation & Ambiguity Handling
    # ========================================================================
    
    validation_issues: List[Dict[str, Any]]
    """
    Issues that need user clarification.
    Example: [{"field": "gpa_scale", "detected": "4.0", "needs_confirmation": True}]
    """
    
    user_clarifications: Dict[str, Any]
    """
    User-provided clarifications for ambiguous fields.
    Keys match validation_issues field names.
    """
    
    # ========================================================================
    # Payment & Access Control
    # ========================================================================
    
    is_paid: bool
    """Whether user has paid for premium analysis"""
    
    free_tier_limit_reached: bool
    """Whether free tier result limitations apply"""
    
    # ========================================================================
    # Metadata & Logging
    # ========================================================================
    
    analysis_metadata: Dict[str, Any]
    """
    Additional metadata about the analysis.
    Example: {"llm_model": "gemini-2.0-flash", "processing_time_ms": 5000}
    """
    
    error_log: List[Dict[str, Any]]
    """
    Log of any errors encountered during processing.
    Each entry: {"timestamp": datetime, "error_type": str, "message": str}
    """
    
    # ========================================================================
    # Optional: LangGraph-specific fields
    # ========================================================================
    
    should_continue: bool
    """Flag to determine if graph should continue executing"""
    
    retry_count: int
    """Number of retry attempts for failed operations"""
    
    max_retries: int
    """Maximum allowed retry attempts"""


def create_initial_state(
    application_id: str,
    user_email: Optional[str] = None,
    country: Optional[str] = None,
    target_universities: Optional[List[str]] = None,
) -> GraphState:
    """
    Factory function to create an initial GraphState.
    
    Args:
        application_id: Unique session ID
        user_email: Optional user email
        country: Country of origin
        target_universities: List of target universities
    
    Returns:
        Initialized GraphState with default values
    """
    return GraphState(
        application_id=application_id,
        session_started=datetime.now(),
        user_email=user_email,
        messages=[],
        context_docs=[],
        extracted_text={
            "transcript": "",
            "degree_certificate": "",
            "language_certificate": "",
        },
        extraction_errors={
            "transcript": None,
            "degree_certificate": None,
            "language_certificate": None,
        },
        student_profile=StudentProfile(
            country_of_origin=country,
            target_universities=target_universities or [],
        ),
        issues_detected=[],
        overall_risk_level=None,
        rejection_probability=None,
        strengths_identified=[],
        action_items={
            "must_fix": [],
            "recommended": [],
            "optional": [],
        },
        next_action="extract_documents",
        processing_status="processing",
        current_step=0,
        total_steps=5,
        validation_issues=[],
        user_clarifications={},
        is_paid=False,
        free_tier_limit_reached=False,
        analysis_metadata={
            "created_at": datetime.now().isoformat(),
        },
        error_log=[],
        should_continue=True,
        retry_count=0,
        max_retries=3,
    )