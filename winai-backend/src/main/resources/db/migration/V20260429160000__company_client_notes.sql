-- Notas administrativas por cliente (empresa), persistidas para /admin/clientes
CREATE TABLE winai.company_client_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES winai.companies (id) ON DELETE CASCADE,
    author_user_id UUID NOT NULL REFERENCES winai.users (id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_company_client_notes_company ON winai.company_client_notes (company_id, created_at DESC);
