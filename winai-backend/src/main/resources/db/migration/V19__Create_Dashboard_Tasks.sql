CREATE TABLE IF NOT EXISTS winai.dashboard_tasks (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES winai.companies(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    category VARCHAR(100),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_tasks_company_id ON winai.dashboard_tasks(company_id);
