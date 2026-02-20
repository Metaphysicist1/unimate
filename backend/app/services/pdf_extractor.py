import pdfplumber
import io
from typing import Tuple


class PDFExtractorService:
    """Local PDF text extraction without API calls"""

    @staticmethod
    def extract_text_from_pdf(file_bytes: bytes) -> str:
        """
        Extract text from PDF using pdfplumber (free, local)
        Works with both text-based and image-based PDFs
        """
        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                text = ""
                for page_num, page in enumerate(pdf.pages, 1):
                    page_text = page.extract_text() or ""
                    if page_text.strip():
                        text += f"\n--- Page {page_num} ---\n{page_text}"

                if not text.strip():
                    return "[WARNING: PDF appears to be empty or contains only images without OCR]"

                return text.strip()

        except Exception as e:
            print(f"PDF extraction error: {e}")
            return f"[ERROR: Could not extract text: {str(e)}]"

    @staticmethod
    def extract_metadata(file_bytes: bytes) -> dict:
        """Extract PDF metadata"""
        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                return {
                    "page_count": len(pdf.pages),
                    "metadata": pdf.metadata or {}
                }
        except Exception as e:
            print(f"Metadata extraction error: {e}")
            return {"page_count": 0, "metadata": {}}


pdf_extractor = PDFExtractorService()
