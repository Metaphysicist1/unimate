-- Supabase / PostgreSQL migration: user_context table
-- Stores both raw prompt and structured metadata extracted by the Gatekeeper Agent.

CREATE TABLE IF NOT EXISTS user_context (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id      TEXT UNIQUE NOT NULL,

    -- Raw input
    raw_prompt      TEXT NOT NULL DEFAULT '',

    -- Structured metadata (extracted by LLM)
    degree_type     TEXT,                                   -- Bachelor | Master | PhD
    language_level  TEXT,                                   -- A1-C2 | native
    target_country  TEXT,
    target_university TEXT,
    target_program  TEXT,
    gpa_estimated   DOUBLE PRECISION,                       -- German 1.0-4.0 scale

    -- Extraction metadata
    gaps_in_info    JSONB DEFAULT '[]'::jsonb,               -- [{field, question}]
    conflicts       JSONB DEFAULT '[]'::jsonb,               -- [{field, user_value, document_value, resolution_question}]
    file_sources    TEXT[] DEFAULT '{}',                     -- filenames of uploaded docs
    confidence      JSONB DEFAULT '{}'::jsonb,               -- {field: 0.0-1.0}

    -- Pipeline state
    status          TEXT NOT NULL DEFAULT 'needs_info'
                    CHECK (status IN ('needs_info', 'complete', 'conflict', 'confirmed')),
    confirmed       BOOLEAN DEFAULT FALSE,

    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_context_updated_at
    BEFORE UPDATE ON user_context
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Fast lookups by session
CREATE INDEX IF NOT EXISTS idx_user_context_session_id ON user_context (session_id);

-- Enable Row Level Security (Supabase best practice)
ALTER TABLE user_context ENABLE ROW LEVEL SECURITY;

-- Service-role policy (backend writes via service key)
CREATE POLICY "service_role_all" ON user_context
    FOR ALL
    USING (true)
    WITH CHECK (true);
