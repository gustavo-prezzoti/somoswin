-- Agendamento config: horário início/fim, ativo, por empresa
CREATE TABLE IF NOT EXISTS winai.agendamento_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES winai.companies(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT false,
    start_time TIME NOT NULL DEFAULT '09:00',
    end_time TIME NOT NULL DEFAULT '18:00',
    slot_duration_minutes INT NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id)
);

CREATE INDEX IF NOT EXISTS idx_agendamento_config_company ON winai.agendamento_config(company_id);
