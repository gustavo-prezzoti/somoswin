-- Tags personalizáveis do CRM por empresa (carteira, segmento, produto, etc.)
CREATE TABLE winai.crm_lead_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES winai.companies (id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ux_crm_lead_tags_company_lower_name ON winai.crm_lead_tags (company_id, LOWER(TRIM(name)));

CREATE INDEX idx_crm_lead_tags_company ON winai.crm_lead_tags (company_id);

CREATE TABLE winai.lead_crm_tag_links (
    lead_id UUID NOT NULL REFERENCES winai.leads (id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES winai.crm_lead_tags (id) ON DELETE CASCADE,
    PRIMARY KEY (lead_id, tag_id)
);

CREATE INDEX idx_lead_crm_tag_links_tag ON winai.lead_crm_tag_links (tag_id);
