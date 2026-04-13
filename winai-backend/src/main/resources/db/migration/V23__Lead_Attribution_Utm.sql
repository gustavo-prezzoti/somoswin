-- Rastreamento de origem (WhatsApp track_* / UTM) para performance por referência
ALTER TABLE winai.leads
    ADD COLUMN IF NOT EXISTS track_id VARCHAR(255);

ALTER TABLE winai.leads
    ADD COLUMN IF NOT EXISTS track_source VARCHAR(2000);

ALTER TABLE winai.leads
    ADD COLUMN IF NOT EXISTS utm_source VARCHAR(255);

ALTER TABLE winai.leads
    ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(255);

ALTER TABLE winai.leads
    ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(255);

ALTER TABLE winai.leads
    ADD COLUMN IF NOT EXISTS utm_content VARCHAR(255);

ALTER TABLE winai.leads
    ADD COLUMN IF NOT EXISTS utm_term VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_leads_company_created_attribution
    ON winai.leads (company_id, created_at)
    WHERE (track_source IS NOT NULL OR utm_campaign IS NOT NULL OR utm_source IS NOT NULL);

COMMENT ON COLUMN winai.leads.track_id IS 'ID de rastreamento (ex.: provedor WhatsApp)';
COMMENT ON COLUMN winai.leads.track_source IS 'Origem de rastreamento (ref / parâmetros do clique)';
COMMENT ON COLUMN winai.leads.utm_campaign IS 'utm_campaign extraído da URL ou mensagem';
