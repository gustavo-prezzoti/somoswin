-- Diagnóstico estratégico / playbook 90 dias por empresa (rascunho consultor + snapshot publicado ao cliente)

CREATE TABLE winai.company_strategic_diagnosis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES winai.companies (id) ON DELETE CASCADE,
    draft_answers_json JSONB,
    draft_activities_json JSONB,
    draft_project_start_date DATE,
    draft_current_step INT NOT NULL DEFAULT -1,
    published_answers_json JSONB,
    published_activities_json JSONB,
    published_project_start_date DATE,
    published_canal_prioritario VARCHAR(64),
    published_metrics_json JSONB,
    published_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by_user_id UUID,
    CONSTRAINT uq_company_strategic_diagnosis_company UNIQUE (company_id)
);

CREATE INDEX idx_company_strategic_diagnosis_company ON winai.company_strategic_diagnosis (company_id);
