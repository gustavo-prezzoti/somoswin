-- Perfil da empresa (Dados do Negócio) + convites de acesso

ALTER TABLE winai.companies
    ADD COLUMN IF NOT EXISTS website VARCHAR(1024);

ALTER TABLE winai.companies
    ADD COLUMN IF NOT EXISTS instagram_handle VARCHAR(255);

ALTER TABLE winai.companies
    ADD COLUMN IF NOT EXISTS revenue_range VARCHAR(255);

ALTER TABLE winai.companies
    ADD COLUMN IF NOT EXISTS team_size VARCHAR(64);

ALTER TABLE winai.companies
    ADD COLUMN IF NOT EXISTS city_state VARCHAR(255);

ALTER TABLE winai.users
    ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);

CREATE TABLE IF NOT EXISTS winai.access_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES winai.companies (id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    invited_name VARCHAR(255),
    job_title VARCHAR(255),
    role VARCHAR(32) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL,
    invited_by_user_id UUID REFERENCES winai.users (id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_invitations_company ON winai.access_invitations (company_id);
CREATE INDEX IF NOT EXISTS idx_access_invitations_email_lower ON winai.access_invitations (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS uq_access_inv_pending_company_email
    ON winai.access_invitations (company_id, LOWER(email))
    WHERE status = 'PENDING';
