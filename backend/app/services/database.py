from supabase import create_client, Client
from app.core.config import settings
from typing import Optional, Dict, Any, List
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

    @staticmethod
    async def upsert_user_context(
        session_id: str,
        context: Any,
        confidence: Dict[str, float],
        status: str,
    ) -> Dict[str, Any]:
        """Insert or update user_context for a session."""
        from app.models.context_schemas import UserContext

        ctx: UserContext = context
        data = {
            "session_id": session_id,
            "raw_prompt": ctx.raw_prompt,
            "degree_type": ctx.degree_type,
            "language_level": ctx.language_level,
            "target_country": ctx.target_country,
            "target_university": ctx.target_university,
            "target_program": ctx.target_program,
            "gpa_estimated": ctx.gpa_estimated,
            "gaps_in_info": json.dumps([g.model_dump() for g in ctx.gaps_in_info]),
            "conflicts": json.dumps([c.model_dump() for c in ctx.conflicts]),
            "file_sources": ctx.file_sources,
            "confidence": json.dumps(confidence),
            "status": status,
            "confirmed": False,
        }

        result = (
            supabase.table("user_context")
            .upsert(data, on_conflict="session_id")
            .execute()
        )
        return result.data[0] if result.data else data

    @staticmethod
    async def confirm_user_context(session_id: str) -> Dict[str, Any]:
        """Mark a user context as confirmed."""
        result = (
            supabase.table("user_context")
            .update({"confirmed": True, "status": "confirmed"})
            .eq("session_id", session_id)
            .execute()
        )
        return result.data[0] if result.data else {}

    @staticmethod
    async def get_user_context(session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve user context by session ID."""
        try:
            result = (
                supabase.table("user_context")
                .select("*")
                .eq("session_id", session_id)
                .execute()
            )
            return result.data[0] if result.data else None
        except APIError:
            return None

    # ── Research log methods ──────────────────────────────────────────

    @staticmethod
    async def find_cached_research(query_hash: str) -> Optional[Dict[str, Any]]:
        """Check if a search query was already executed (cache hit)."""
        try:
            result = (
                supabase.table("research_logs")
                .select("*")
                .eq("query_hash", query_hash)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            return result.data[0] if result.data else None
        except APIError:
            return None

    @staticmethod
    async def log_research(
        session_id: str,
        query: str,
        query_hash: str,
        provider: str,
        results: list,
        depth_level: int = 1,
    ) -> Dict[str, Any]:
        """Log a search query and its results for deduplication."""
        data = {
            "session_id": session_id,
            "query": query,
            "query_hash": query_hash,
            "provider": provider,
            "results": json.dumps(results),
            "result_count": len(results),
            "depth_level": depth_level,
        }
        try:
            result = supabase.table("research_logs").insert(data).execute()
            return result.data[0] if result.data else data
        except Exception as e:
            print(f"Failed to log research: {e}")
            return data


db = DatabaseService()