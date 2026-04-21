-- Tokens opacos para mensagem "normal" em anúncios Click-to-WhatsApp (de-para → UTM no webhook).
CREATE TABLE winai.whatsapp_attribution_tokens (
    id UUID PRIMARY KEY,
    token VARCHAR(24) NOT NULL,
    company_id UUID NOT NULL REFERENCES winai.companies(id) ON DELETE CASCADE,
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_content VARCHAR(255),
    utm_term VARCHAR(255),
    gclid VARCHAR(1024),
    fbclid VARCHAR(2048),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_whatsapp_attr_token UNIQUE (token)
);

CREATE INDEX idx_whatsapp_attr_token_company ON winai.whatsapp_attribution_tokens(company_id);
