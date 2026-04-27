-- Remarketing: sequência de mensagens agendadas por destinatário (Base Ativa)

ALTER TABLE winai.whatsapp_broadcast_campaign
    ADD COLUMN IF NOT EXISTS company_prompt TEXT;

ALTER TABLE winai.whatsapp_broadcast_campaign
    ADD COLUMN IF NOT EXISTS sequence_size INT;

ALTER TABLE winai.whatsapp_broadcast_campaign
    ADD COLUMN IF NOT EXISTS schedule_timezone VARCHAR(64) NOT NULL DEFAULT 'America/Sao_Paulo';

CREATE TABLE IF NOT EXISTS winai.whatsapp_broadcast_dispatch (
    id UUID PRIMARY KEY,
    recipient_id UUID NOT NULL REFERENCES winai.whatsapp_broadcast_recipient(id) ON DELETE CASCADE,
    sequence_index INT NOT NULL,
    body_text TEXT NOT NULL,
    scheduled_send_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL,
    sent_at TIMESTAMPTZ,
    provider_message_id VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_broadcast_dispatch_recipient_seq UNIQUE (recipient_id, sequence_index)
);

CREATE INDEX IF NOT EXISTS idx_broadcast_dispatch_pending_due
    ON winai.whatsapp_broadcast_dispatch (scheduled_send_at ASC)
    WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_broadcast_dispatch_recipient
    ON winai.whatsapp_broadcast_dispatch (recipient_id);
