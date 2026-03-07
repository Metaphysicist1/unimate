from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
import json

from app.models.context_schemas import (
    ExtractionRequest,
    ExtractionResponse,
    UserContext,
    UserContextRow,
)
from app.services.context_extractor import extract_user_context
from app.services.pdf_extractor import pdf_extractor
from app.services.database import db

router = APIRouter()


@router.post("/extract-context", response_model=ExtractionResponse)
async def extract_context(request: ExtractionRequest):
    """
    Gatekeeper Agent endpoint.
    Accepts free-text user input + optional pre-extracted file text,
    returns structured UserContext with gaps and conflicts.
    """
    previous = request.previous_context

    result = await extract_user_context(
        user_input=request.user_input,
        file_text=request.file_text,
        previous_context=previous,
    )

    if request.session_id:
        try:
            await db.upsert_user_context(
                session_id=request.session_id,
                context=result.context,
                confidence=result.confidence,
                status=result.status,
            )
        except Exception as e:
            print(f"Failed to persist context: {e}")

    return result


@router.post("/extract-context/upload")
async def extract_context_with_file(
    user_input: str = Form(""),
    session_id: Optional[str] = Form(None),
    previous_context: Optional[str] = Form(None),
    file: UploadFile = File(...),
):
    """
    Accepts a file upload (PDF/DOCX), extracts text, then runs context extraction.
    """
    if file.content_type not in (
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ):
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are supported.",
        )

    file_bytes = await file.read()

    max_size = 10 * 1024 * 1024
    if len(file_bytes) > max_size:
        raise HTTPException(status_code=400, detail="File exceeds 10MB limit.")

    if file.content_type == "application/pdf":
        extracted_text = pdf_extractor.extract_text_from_pdf(file_bytes)
    else:
        extracted_text = _extract_docx_text(file_bytes)

    prev_context = None
    if previous_context:
        try:
            prev_context = UserContext(**json.loads(previous_context))
        except Exception:
            pass

    result = await extract_user_context(
        user_input=user_input or f"Uploaded file: {file.filename}",
        file_text=extracted_text,
        previous_context=prev_context,
    )

    result.context.file_sources = list(
        set((prev_context.file_sources if prev_context else []) + [file.filename or "unknown"])
    )

    if session_id:
        try:
            await db.upsert_user_context(
                session_id=session_id,
                context=result.context,
                confidence=result.confidence,
                status=result.status,
            )
        except Exception as e:
            print(f"Failed to persist context: {e}")

    return {
        **result.model_dump(),
        "extracted_text_preview": extracted_text[:500] if extracted_text else None,
        "file_name": file.filename,
    }


@router.post("/confirm-context")
async def confirm_context(
    session_id: str = Form(...),
):
    """Mark a user context as confirmed so downstream analysis can proceed."""
    try:
        await db.confirm_user_context(session_id)
        return {"status": "confirmed", "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _extract_docx_text(file_bytes: bytes) -> str:
    """Basic DOCX text extraction using zipfile (no external dependency)."""
    import zipfile
    import io
    import xml.etree.ElementTree as ET

    try:
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
            with z.open("word/document.xml") as f:
                tree = ET.parse(f)
                root = tree.getroot()
                ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
                paragraphs = root.findall(".//w:p", ns)
                text_parts = []
                for p in paragraphs:
                    texts = p.findall(".//w:t", ns)
                    line = "".join(t.text or "" for t in texts)
                    if line.strip():
                        text_parts.append(line)
                return "\n".join(text_parts)
    except Exception as e:
        return f"[ERROR: Could not extract DOCX text: {e}]"
