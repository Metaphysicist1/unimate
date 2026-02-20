from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List, Optional
from uuid import UUID
import json
from app.services.gemini import gemini
from app.services.pdf_extractor import pdf_extractor
from app.services.pdf_processor import pdf_processor
from app.services.database import db
from app.models.schemas import AnalysisResult

router = APIRouter()

@router.post("/analyze")
async def analyze_application(
    transcript: UploadFile = File(...),
    degree: UploadFile = File(...),
    language: UploadFile = File(...),
    email: Optional[str] = Form(None),
    country: str = Form(...),
    universities: str = Form(...)  # JSON string
):
    """
    Analyze student application documents
    
    FREE TIER: Returns basic analysis
    Documents are not stored permanently
    """
    
    try:
        # Parse universities
        universities_list = json.loads(universities)
        
        # Validate files
        transcript_bytes = await transcript.read()
        degree_bytes = await degree.read()
        language_bytes = await language.read()
        
        # Validate PDFs
        for file_bytes, name in [
            (transcript_bytes, "Transcript"),
            (degree_bytes, "Degree"),
            (language_bytes, "Language")
        ]:
            is_valid, error = pdf_processor.validate_pdf(file_bytes)
            if not is_valid:
                raise HTTPException(status_code=400, detail=f"{name}: {error}")
        
        # Create application record
        application = await db.create_application(
            email=email,
            country=country,
            universities=universities_list
        )
        
        app_id = application["id"]
        
        # Extract text using Gemini (better OCR than PyPDF2)
        print(f"Extracting text for application {app_id}...")
        
        # Use local PDF extraction (pdfplumber) instead of Gemini API
        transcript_text = pdf_extractor.extract_text_from_pdf(transcript_bytes)
        degree_text = pdf_extractor.extract_text_from_pdf(degree_bytes)
        language_text = pdf_extractor.extract_text_from_pdf(language_bytes)
        
        print(f"Text extracted. Analyzing with Gemini...")
        
        # Analyze with Gemini
        analysis = await gemini.analyze_documents(
            transcript_text=transcript_text,
            degree_text=degree_text,
            language_text=language_text,
            country=country,
            universities=universities_list
        )
        
        print(f"Analysis complete for {app_id}")
        
        # Save analysis
        await db.save_analysis(app_id, analysis)
        
        # For FREE tier, return limited results
        # Show only issue titles (not how_to_fix)
        free_tier_issues = []
        for issue in analysis["issues_found"][:5]:  # Max 5 issues in free tier
            free_tier_issues.append({
                "severity": issue["severity"],
                "category": issue["category"],
                "title": issue["title"],
                "description": issue["description"],
                "common_percentage": issue["common_percentage"],
                # Hide the valuable parts
                "how_to_fix": None,
                "estimated_cost": None,
                "estimated_time": None,
                "example": None
            })
        
        free_tier_result = {
            "application_id": app_id,
            "overall_risk": analysis["overall_risk"],
            "rejection_probability": analysis["rejection_probability"],
            "issues_found": free_tier_issues,
            "total_issues": len(analysis["issues_found"]),
            "what_looks_good": analysis["what_looks_good"][:3],  # Show only 3
            "upgrade_required": True
        }
        
        return free_tier_result
        
    except Exception as e:
        print(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/results/{application_id}")
async def get_results(application_id: str, paid: bool = False):
    """
    Get analysis results
    
    If paid=True, return full results
    If paid=False, return limited free tier results
    """
    
    # Validate application_id is a proper UUID to avoid DB errors when frontend
    # accidentally passes values like "undefined".

    print(f"Received application_id = '{application_id}'  (type: {type(application_id)})")
    try:
        UUID(application_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid application_id")

    application = await db.get_application(application_id)
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Parse analysis results
    if application.get("analysis_results"):
        if isinstance(application["analysis_results"], str):
            analysis = json.loads(application["analysis_results"])
        else:
            analysis = application["analysis_results"]
    else:
        raise HTTPException(status_code=404, detail="Analysis not complete")
    
    # Check if paid
    is_paid = application.get("paid", False) or paid
    
    if is_paid:
        # Return FULL results (with how_to_fix, examples, etc.)
        return {
            "application_id": application_id,
            "paid": True,
            **analysis
        }
    else:
        # Return LIMITED results (free tier)
        free_tier_issues = []
        for issue in analysis["issues_found"][:5]:
            free_tier_issues.append({
                "severity": issue["severity"],
                "category": issue["category"],
                "title": issue["title"],
                "description": issue["description"],
                "common_percentage": issue["common_percentage"]
            })
        
        return {
            "application_id": application_id,
            "paid": False,
            "overall_risk": analysis["overall_risk"],
            "rejection_probability": analysis["rejection_probability"],
            "issues_found": free_tier_issues,
            "total_issues": len(analysis["issues_found"]),
            "what_looks_good": analysis["what_looks_good"][:3],
            "upgrade_required": True
        }