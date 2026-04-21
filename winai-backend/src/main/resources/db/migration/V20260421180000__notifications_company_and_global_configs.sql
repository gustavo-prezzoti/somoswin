-- Notificações in-app: vínculo com empresa (filtro por company no app)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'winai' AND table_name = 'notifications'
    ) THEN
        ALTER TABLE winai.notifications
            ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES winai.companies(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON winai.notifications(company_id);
    END IF;
END $$;

-- Configuração admin: transbordo humano / alerta WhatsApp interno por empresa
CREATE TABLE IF NOT EXISTS winai.global_notification_configs (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL UNIQUE REFERENCES winai.companies(id) ON DELETE CASCADE,
    human_handoff_notification_enabled BOOLEAN DEFAULT FALSE,
    human_handoff_phone VARCHAR(50),
    human_handoff_message VARCHAR(1000),
    human_handoff_client_message VARCHAR(1000),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_global_notification_configs_company ON winai.global_notification_configs(company_id);
