-- Supabase / PostgreSQL migration: research_logs table
-- Caches every search query the agent performs to prevent redundant API calls.

CREATE TABLE IF NOT EXISTS research_logs (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id      TEXT NOT NULL,
    query           TEXT NOT NULL,
    query_hash      TEXT NOT NULL,                          -- SHA-256 of normalized query
    provider        TEXT NOT NULL DEFAULT 'duckduckgo',     -- duckduckgo | serper
    results         JSONB NOT NULL DEFAULT '[]'::jsonb,     -- raw search results
    result_count    INTEGER NOT NULL DEFAULT 0,
    depth_level     INTEGER NOT NULL DEFAULT 1,             -- 1 = core, 2 = nested
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_research_logs_hash ON research_logs (query_hash);
CREATE INDEX IF NOT EXISTS idx_research_logs_session ON research_logs (session_id);

ALTER TABLE research_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON research_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);
