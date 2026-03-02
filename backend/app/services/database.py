from supabase import create_client, Client
from app.core.config import settings
from typing import Optional, Dict, Any
from postgrest.exceptions import APIError
import json

# Initialize Supabase client
supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_KEY
)

class DatabaseService:
    @staticmethod
    async def create_application(
        user_prompt: str,
        country: Optional[str] = None,
        universities: Optional[str] = None,
        program: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create new application record"""
        data = {
            "user_prompt": user_prompt,
            "country": country,
            "universities": universities,
            "program": program,
            "paid": False
        }
        
        result = supabase.table("data_db").insert(data).execute()
        return result.data[0]
    
    @staticmethod
    async def get_application(app_id: str) -> Optional[Dict[str, Any]]:
        """Get application by ID"""
        try:
            result = supabase.table("data_db").select("*").eq("id", app_id).execute()
        except APIError:
            # Likely an invalid UUID or bad input from client — return None
            return None

        if result.data:
            return result.data[0]
        return None
    
    @staticmethod
    async def update_application(
        app_id: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Update application"""
        result = supabase.table("analyze_results").update(kwargs).eq("id", app_id).execute()
        return result.data[0]
    
    @staticmethod
    async def save_analysis(
        app_id: str,
        analysis: dict
    ):
        """Save analysis results"""
        data = {
            "status": "completed",
            "risk_level": analysis["overall_risk"],
            "rejection_probability": analysis["rejection_probability"],
            "analysis_results": json.dumps(analysis),
            "completed_at": "now()"
        }
        
        return await DatabaseService.update_application(app_id, **data)
    
    @staticmethod
    async def mark_as_paid(app_id: str):
        """Mark application as paid"""
        return await DatabaseService.update_application(app_id, paid=True)
    
    @staticmethod
    async def upload_file(
        file_bytes: bytes,
        file_path: str,
        content_type: str
    ) -> str:
        """Upload file to Supabase Storage"""
        result = supabase.storage.from_("documents").upload(
            file_path,
            file_bytes,
            {"content-type": content_type}
        )
        
        # Get public URL
        url = supabase.storage.from_("documents").get_public_url(file_path)
        return url

db = DatabaseService()