ALTER TABLE winai.leads
    ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(14, 2);

ALTER TABLE winai.leads
    ADD COLUMN IF NOT EXISTS lead_score INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN winai.leads.estimated_value IS 'Valor estimado do negócio em R$';
COMMENT ON COLUMN winai.leads.lead_score IS 'Score 0–100 para priorização no CRM';
