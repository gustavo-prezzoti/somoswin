-- Associação N:N cliente (empresa) ↔ colaborador interno Amplia (carteira para métricas)
CREATE TABLE winai.company_staff_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES winai.companies (id) ON DELETE CASCADE,
    staff_user_id UUID NOT NULL REFERENCES winai.users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_user_id UUID REFERENCES winai.users (id) ON DELETE SET NULL,
    CONSTRAINT uq_company_staff_assignment UNIQUE (company_id, staff_user_id)
);

CREATE INDEX idx_company_staff_assignment_staff ON winai.company_staff_assignment (staff_user_id);
CREATE INDEX idx_company_staff_assignment_company ON winai.company_staff_assignment (company_id);
