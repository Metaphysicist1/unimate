import google.generativeai as genai
from app.core.config import settings
import json
import base64
from typing import Dict, Any

# Configure Gemini
genai.configure(api_key=settings.GOOGLE_GEMINI_API_KEY)

model = genai.GenerativeModel(
    'gemini-2.0-flash',
    generation_config=genai.GenerationConfig(temperature=0.7, max_output_tokens=2048),
)

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
        user_prompt: str,
        program: str,
        country: str,
        universities: list,
        paid: bool = False
    ) -> Dict[Any, Any]:
        """Analyze student application with Gemini"""
        
        prompt = f"""
            You are an expert uni-assist application auditor for German universities.

            Analyze these student info for common rejection risks:

            STUDENT INFO:
            - Country: {country}
            - Target Universities: {', '.join(universities)}
            - Program:  {program[:4000]}

            account status: {"paid" if paid else "free tier"}
            Student provided the following additional information:
            {user_prompt[:4000]}

            ANALYSIS CHECKLIST:

            After all checks:
            ─────────────────────────────
            SUMMARY OF POTENTIAL PROBLEMS
            (list only real issues — do not invent problems)

            MISSING / UNCLEAR INFORMATION
            (bullet list of every piece of information you still need — be very specific)

            NEXT QUESTIONS TO USER
            (numbered list of clear, concrete questions — ask only the most important 3–6 at once)

            Rules you MUST follow:
            • Be polite but very direct and formal
            • Never say “probably”, “maybe”, “looks like” — only facts the user actually told you
            • If user gave zero information about a document → write: "No information provided about [document type]" and ask whether they have it / plan to describe it
            • Current date for language certificate age calculation = March 02, 2026 (or tell user the date you're using if they give another one)
            • For language certificates: only B2 or higher is usually accepted — clearly state if level is too low
            • If user describes something very vaguely (example: "there is a grade table"), ask for exact wording or structure
            • Do NOT give overall "pass/fail" verdict unless user explicitly asks for final opinion after providing enough details

            Start every response by briefly confirming which documents the user has already described.

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

            # print(f"Gemini analysis successful. Parsed JSON: {analysis}")
            
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