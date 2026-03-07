import json
from typing import Dict, Any, Optional
import google.generativeai as genai
from app.core.config import settings
from app.models.context_schemas import (
    UserContext,
    ExtractionResponse,
    GapInfo,
    ConflictInfo,
)

genai.configure(api_key=settings.GOOGLE_GEMINI_API_KEY)

_model = genai.GenerativeModel(
    "gemini-2.0-flash",
    generation_config=genai.GenerationConfig(temperature=0.2, max_output_tokens=2048),
)

EXTRACTION_PROMPT = """You are a structured-data extraction agent for a German university
application platform (uni-assist). Given a user's free-text goal and optional document
content, extract as much metadata as you can.

USER INPUT:
{user_input}

{file_section}

{previous_section}

Return ONLY valid JSON matching this schema exactly:

{{
  "degree_type": "Bachelor" | "Master" | "PhD" | null,
  "language_level": "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "native" | null,
  "target_country": string | null,
  "target_university": string | null,
  "target_program": string | null,
  "gpa_estimated": number (0.0-4.0 scale) | null,
  "gaps_in_info": [
    {{"field": "<field_name>", "question": "<specific follow-up question>"}}
  ],
  "conflicts": [
    {{
      "field": "<field_name>",
      "user_value": "<what user typed>",
      "document_value": "<what document shows>",
      "resolution_question": "<question to resolve>"
    }}
  ],
  "confidence": {{
    "degree_type": 0.0-1.0,
    "language_level": 0.0-1.0,
    "target_country": 0.0-1.0,
    "target_university": 0.0-1.0,
    "target_program": 0.0-1.0,
    "gpa_estimated": 0.0-1.0
  }}
}}

Rules:
- If user mentions Germany specifically, set target_country to "Germany"
- For language_level, look for CEFR levels (A1-C2), test names (TestDaF, DSH, IELTS, TOEFL), or descriptions
- If the user says "B2" but a document shows "A1", add a conflict entry
- Only include gaps for fields that are still null AND are important for a uni-assist application
- GPA must be converted to the German 1.0-4.0 scale if possible (1.0 = best)
- Confidence 1.0 = explicitly stated, 0.7 = strongly implied, 0.4 = guessed
- Return ONLY the JSON, no markdown fences, no extra text
"""


def _build_file_section(file_text: Optional[str]) -> str:
    if not file_text:
        return ""
    return f"DOCUMENT CONTENT (extracted from uploaded file):\n{file_text[:6000]}"


def _build_previous_section(prev: Optional[UserContext]) -> str:
    if not prev:
        return ""
    known = {k: v for k, v in prev.model_dump().items()
             if v is not None and k not in ("gaps_in_info", "conflicts", "raw_prompt", "file_sources")}
    if not known:
        return ""
    return (
        "PREVIOUSLY EXTRACTED CONTEXT (merge new info, detect conflicts):\n"
        + json.dumps(known, indent=2)
    )


def _detect_conflicts(
    new_ctx: Dict[str, Any],
    prev: Optional[UserContext],
    file_text: Optional[str],
) -> list[ConflictInfo]:
    """Post-hoc conflict detection beyond what the LLM catches."""
    conflicts: list[ConflictInfo] = []

    if not prev:
        return [ConflictInfo(**c) for c in new_ctx.get("conflicts", [])]

    prev_dict = prev.model_dump()
    merge_fields = ["degree_type", "language_level", "target_country",
                    "target_university", "target_program", "gpa_estimated"]

    for field in merge_fields:
        old_val = prev_dict.get(field)
        new_val = new_ctx.get(field)
        if old_val and new_val and str(old_val).lower() != str(new_val).lower():
            conflicts.append(ConflictInfo(
                field=field,
                user_value=str(old_val),
                document_value=str(new_val),
                resolution_question=(
                    f"Your earlier input said {field.replace('_', ' ')} is '{old_val}', "
                    f"but the latest info shows '{new_val}'. Which is correct?"
                ),
            ))

    llm_conflicts = [ConflictInfo(**c) for c in new_ctx.get("conflicts", [])]
    seen = {(c.field, c.user_value, c.document_value) for c in conflicts}
    for c in llm_conflicts:
        key = (c.field, c.user_value, c.document_value)
        if key not in seen:
            conflicts.append(c)

    return conflicts


def _generate_follow_ups(ctx: UserContext) -> list[str]:
    """Turn gaps into user-friendly questions."""
    questions = [g.question for g in ctx.gaps_in_info]

    if not ctx.target_country:
        questions.append("Which country are you planning to study in?")
    if not ctx.language_level and ctx.target_country and "german" in (ctx.target_country or "").lower():
        questions.append(
            "I see you want to study in Germany, but what is your current German level? "
            "Do you have a TestDaF, DSH, or other certificate?"
        )
    if not ctx.degree_type:
        questions.append("Are you applying for a Bachelor's, Master's, or PhD program?")

    seen: set[str] = set()
    unique: list[str] = []
    for q in questions:
        normalized = q.strip().lower()
        if normalized not in seen:
            seen.add(normalized)
            unique.append(q)
    return unique


async def extract_user_context(
    user_input: str,
    file_text: Optional[str] = None,
    previous_context: Optional[UserContext] = None,
) -> ExtractionResponse:
    """Core extraction function. Calls Gemini to parse free text into structured data."""

    prompt = EXTRACTION_PROMPT.format(
        user_input=user_input[:4000],
        file_section=_build_file_section(file_text),
        previous_section=_build_previous_section(previous_context),
    )

    try:
        response = _model.generate_content(prompt)
        text = response.text.strip()

        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        parsed: Dict[str, Any] = json.loads(text)
    except (json.JSONDecodeError, Exception) as e:
        print(f"Context extraction error: {e}")
        return ExtractionResponse(
            context=previous_context or UserContext(raw_prompt=user_input),
            confidence={},
            follow_up_questions=["Could you describe your situation in more detail?"],
            status="needs_info",
        )

    conflicts = _detect_conflicts(parsed, previous_context, file_text)
    confidence = parsed.pop("confidence", {})

    gaps = [GapInfo(**g) for g in parsed.pop("gaps_in_info", [])]
    parsed.pop("conflicts", None)

    ctx = UserContext(
        degree_type=parsed.get("degree_type"),
        language_level=parsed.get("language_level"),
        target_country=parsed.get("target_country"),
        target_university=parsed.get("target_university"),
        target_program=parsed.get("target_program"),
        gpa_estimated=parsed.get("gpa_estimated"),
        gaps_in_info=gaps,
        conflicts=conflicts,
        raw_prompt=user_input,
        file_sources=(previous_context.file_sources if previous_context else []),
    )

    follow_ups = _generate_follow_ups(ctx)

    required_fields = ["degree_type", "language_level", "target_country"]
    filled = sum(1 for f in required_fields if getattr(ctx, f) is not None)

    if conflicts:
        status = "conflict"
    elif filled == len(required_fields) and not gaps:
        status = "complete"
    else:
        status = "needs_info"

    return ExtractionResponse(
        context=ctx,
        confidence=confidence,
        follow_up_questions=follow_ups,
        status=status,
    )
