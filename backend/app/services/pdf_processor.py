import PyPDF2
from io import BytesIO
from typing import Tuple

class PDFProcessor:
    @staticmethod
    def extract_text(file_bytes: bytes) -> Tuple[str, bool]:
        """
        Extract text from PDF
        Returns: (text, is_text_selectable)
        """
        try:
            pdf_reader = PyPDF2.PdfReader(BytesIO(file_bytes))
            
            text = ""
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                text += page_text + "\n\n"
            
            # Check if PDF is readable (not scanned image)
            is_readable = len(text.strip()) > 100
            
            if not is_readable:
                text = "[WARNING: This appears to be a scanned image PDF. " \
                       "Very little text extracted. This is a common rejection reason.]\n\n" + text
            
            return text, is_readable
            
        except Exception as e:
            return f"[ERROR: Could not extract text: {str(e)}]", False
    
    @staticmethod
    def validate_pdf(file_bytes: bytes, max_size: int = 10 * 1024 * 1024) -> Tuple[bool, str]:
        """
        Validate PDF file
        Returns: (is_valid, error_message)
        """
        # Check size
        if len(file_bytes) > max_size:
            return False, f"File too large (max {max_size // (1024*1024)}MB)"
        
        # Check if valid PDF
        try:
            pdf_reader = PyPDF2.PdfReader(BytesIO(file_bytes))
            
            if len(pdf_reader.pages) == 0:
                return False, "PDF has no pages"
            
            if len(pdf_reader.pages) > 20:
                return False, "PDF has too many pages (max 20)"
            
            return True, "Valid PDF"
            
        except Exception as e:
            return False, f"Invalid PDF: {str(e)}"

pdf_processor = PDFProcessor()