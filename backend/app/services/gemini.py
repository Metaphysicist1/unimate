import google.generativeai as genai
from app.core.config import settings
import json
import base64
from typing import Dict, Any

# Configure Gemini
genai.configure(api_key=settings.GOOGLE_GEMINI_API_KEY)


model = genai.GenerativeModel('gemini-2.0-flash')

class GeminiService:
    @staticmethod
    async def extract_text_from_pdf(file_bytes: bytes) -> str:
        """Extract text from PDF using Gemini Vision"""
        try:
            # Convert to base64
            base64_pdf = base64.b64encode(file_bytes).decode('utf-8')
            
            # Create document part
            document_part = {
                "mime_type": "application/pdf",
                "data": base64_pdf
            }
            
            prompt = "Extract all text from this document. Return only the text, no commentary."
            
            response = model.generate_content([prompt, document_part])
            return response.text
            
        except Exception as e:
            print(f"Gemini extraction error: {e}")
            return f"[ERROR: Could not extract text: {str(e)}]"
    
    @staticmethod
    async def analyze_documents(
        transcript_text: str,
        degree_text: str,
        language_text: str,
        country: str,
        universities: list
    ) -> Dict[Any, Any]:
        """Analyze documents with Gemini"""
        
        prompt = f"""
You are an expert uni-assist application auditor for German universities.

Analyze these student documents for common rejection risks:

STUDENT INFO:
- Country: {country}
- Target Universities: {', '.join(universities)}
- Program: Computer Science / Informatik

DOCUMENTS:

TRANSCRIPT:
{transcript_text[:4000]}

DEGREE CERTIFICATE:
{degree_text[:2000]}

LANGUAGE CERTIFICATE:
{language_text[:2000]}

ANALYSIS CHECKLIST:

TRANSCRIPT ISSUES:
1. Is text clearly readable or appears to be scanned image?
2. Shows semester-by-semester breakdown (not just cumulative GPA)?
3. Has "contact hours" or "semester hours" column?
4. Includes grade scale explanation (e.g., "4.0 scale")?
5. Course names are specific (not just codes like "CS 101")?

DEGREE CERTIFICATE ISSUES:
1. Mentions apostille or notarization?
2. Explicitly states "Bachelor of Science in Computer Science"?
3. Is in English or German?
4. Graduation date is consistent?

LANGUAGE CERTIFICATE ISSUES:
1. Test type identifiable (TestDaF, DSH, Goethe, telc)?
2. Level is B2 or higher (not B1, A2, A1)?
3. Shows clear "PASSED" statement?
4. Certificate less than 2 years old?

COUNTRY-SPECIFIC ({country}):
- Common document issues for students from {country}
- Apostille requirements
- Typical transcript format problems

UNIVERSITY-SPECIFIC:
- TU Munich: VPD required, separate math courses listing
- RWTH Aachen: Strict ECTS conversion
- LMU Munich: Vorprüfungsdokumentation for some countries
- FU Berlin: More flexible requirements

Return ONLY valid JSON (no markdown, no extra text):

{{
  "overall_risk": "LOW" | "MEDIUM" | "HIGH",
  "rejection_probability": 0-100,
  "issues_found": [
    {{
      "severity": "CRITICAL" | "WARNING" | "INFO",
      "category": "Transcript" | "Degree Certificate" | "Language Certificate" | "Country-Specific" | "University-Specific",
      "title": "Brief issue title",
      "description": "One sentence explanation",
      "how_to_fix": "Detailed 2-3 sentence step-by-step fix",
      "estimated_cost": "€X or Free",
      "estimated_time": "X days",
      "common_percentage": 0-100,
      "example": {{
        "student_country": "Country name",
        "target_uni": "University name",
        "what_they_did": "How they fixed it",
        "outcome": "accepted"
      }}
    }}
  ],
  "what_looks_good": [
    "Positive finding 1",
    "Positive finding 2",
    "Positive finding 3"
  ],
  "action_plan": {{
    "must_fix": ["Critical item 1", "Critical item 2"],
    "recommended": ["Optional item 1", "Optional item 2"]
  }}
}}

IMPORTANT:
- Find AT LEAST 3-4 issues (no document is perfect)
- Be specific and actionable
- Include real examples for each issue
- Return ONLY the JSON object, nothing else
"""
        
        try:
            response = model.generate_content(prompt)
            text = response.text
            
            # Extract JSON from response
            json_text = text
            if '```json' in text:
                json_text = text.split('```json')[1].split('```')[0].strip()
            elif '```' in text:
                json_text = text.split('```')[1].split('```')[0].strip()
            
            # Parse JSON
            analysis = json.loads(json_text)
            return analysis
            
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Response text: {text}")
            
            # Fallback response
            return {
                "overall_risk": "HIGH",
                "rejection_probability": 75,
                "issues_found": [{
                    "severity": "CRITICAL",
                    "category": "System Error",
                    "title": "Analysis failed - please contact support",
                    "description": "We couldn't complete the automated analysis",
                    "how_to_fix": "Email your documents to support@uniassistcheck.com for manual review",
                    "estimated_cost": "Free",
                    "estimated_time": "24 hours",
                    "common_percentage": 0,
                    "example": None
                }],
                "what_looks_good": ["Documents uploaded successfully"],
                "action_plan": {
                    "must_fix": ["Contact support for manual review"],
                    "recommended": []
                }
            }
        except Exception as e:
            print(f"Gemini analysis error: {e}")
            raise

gemini = GeminiService()