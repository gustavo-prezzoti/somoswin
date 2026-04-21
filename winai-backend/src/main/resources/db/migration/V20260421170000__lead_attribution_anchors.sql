-- Âncoras semânticas: texto do anúncio + embedding → UTM na primeira mensagem inbound (pgvector).
CREATE TABLE IF NOT EXISTS winai.lead_attribution_anchors (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES winai.companies(id) ON DELETE CASCADE,
    anchor_text TEXT NOT NULL,
    embedding vector(1536),
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_content VARCHAR(255),
    utm_term VARCHAR(255),
    gclid VARCHAR(1024),
    fbclid VARCHAR(2048),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    label VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_attr_anchor_company ON winai.lead_attribution_anchors(company_id);
