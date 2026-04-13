-- Google Ads OAuth per company (refresh token + customer selection)
CREATE TABLE IF NOT EXISTS winai.google_ads_connections (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES winai.companies(id) ON DELETE CASCADE,
    refresh_token TEXT,
    customer_id VARCHAR(32),
    login_customer_id VARCHAR(32),
    connected BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_google_ads_company UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS idx_google_ads_connections_company ON winai.google_ads_connections(company_id);

-- Monthly KPI targets for Paid Traffic cards (optional)
CREATE TABLE IF NOT EXISTS winai.company_paid_traffic_targets (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES winai.companies(id) ON DELETE CASCADE,
    year_month VARCHAR(7) NOT NULL,
    investment_goal NUMERIC(14, 2),
    roas_goal NUMERIC(10, 2),
    cpl_goal NUMERIC(10, 2),
    ctr_goal NUMERIC(10, 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_company_paid_traffic_targets UNIQUE (company_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_company_paid_traffic_targets_company ON winai.company_paid_traffic_targets(company_id);
