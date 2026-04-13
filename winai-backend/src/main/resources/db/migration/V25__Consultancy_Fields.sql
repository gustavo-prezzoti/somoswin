-- Consultoria Estratégica: campos em meetings, perfil consultor em companies, solicitações de call

ALTER TABLE winai.meetings
    ADD COLUMN IF NOT EXISTS meeting_kind VARCHAR(32) NOT NULL DEFAULT 'STANDARD';

ALTER TABLE winai.meetings
    ADD COLUMN IF NOT EXISTS recording_url TEXT;

ALTER TABLE winai.meetings
    ADD COLUMN IF NOT EXISTS transcription_full TEXT;

ALTER TABLE winai.meetings
    ADD COLUMN IF NOT EXISTS ai_summary TEXT;

ALTER TABLE winai.meetings
    ADD COLUMN IF NOT EXISTS topics_preview VARCHAR(500);

ALTER TABLE winai.companies
    ADD COLUMN IF NOT EXISTS consultant_display_name VARCHAR(255);

ALTER TABLE winai.companies
    ADD COLUMN IF NOT EXISTS consultant_role VARCHAR(255);

ALTER TABLE winai.companies
    ADD COLUMN IF NOT EXISTS consultant_avatar_url TEXT;

CREATE TABLE IF NOT EXISTS winai.consultancy_call_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES winai.companies (id) ON DELETE CASCADE,
    requested_by_user_id UUID REFERENCES winai.users (id) ON DELETE SET NULL,
    subject VARCHAR(500) NOT NULL,
    urgency VARCHAR(32) NOT NULL DEFAULT 'normal',
    topics TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultancy_call_requests_company_created
    ON winai.consultancy_call_requests (company_id, created_at DESC);
