-- Campanhas de disparo em massa (Base Ativa) + destinatários por linha
CREATE TABLE winai.whatsapp_broadcast_campaign (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES winai.companies(id) ON DELETE CASCADE,
    created_by_user_id UUID REFERENCES winai.users(id) ON DELETE SET NULL,
    connection_id UUID REFERENCES winai.user_whatsapp_connections(id) ON DELETE SET NULL,
    name VARCHAR(500) NOT NULL,
    status VARCHAR(32) NOT NULL,
    message_text TEXT NOT NULL,
    image_url TEXT,
    video_url TEXT,
    total_recipients INT NOT NULL DEFAULT 0,
    sent_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_wbc_company_created ON winai.whatsapp_broadcast_campaign (company_id, created_at DESC);
CREATE INDEX idx_wbc_company_status ON winai.whatsapp_broadcast_campaign (company_id, status);

CREATE TABLE winai.whatsapp_broadcast_recipient (
    id UUID PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES winai.whatsapp_broadcast_campaign(id) ON DELETE CASCADE,
    phone_e164 VARCHAR(32) NOT NULL,
    lead_id UUID REFERENCES winai.leads(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL,
    error_message TEXT,
    provider_message_id VARCHAR(255),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wbr_campaign_status ON winai.whatsapp_broadcast_recipient (campaign_id, status);
CREATE INDEX idx_wbr_sent_at ON winai.whatsapp_broadcast_recipient (sent_at);
CREATE UNIQUE INDEX idx_wbr_campaign_phone ON winai.whatsapp_broadcast_recipient (campaign_id, phone_e164);

COMMENT ON TABLE winai.whatsapp_broadcast_campaign IS 'Campanhas Base Ativa / remarketing WhatsApp (UaZap)';
COMMENT ON COLUMN winai.whatsapp_broadcast_recipient.phone_e164 IS 'Apenas dígitos, ex.: 5511999999999';
