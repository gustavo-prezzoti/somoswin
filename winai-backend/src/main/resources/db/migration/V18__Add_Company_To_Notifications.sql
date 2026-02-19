-- Adiciona company_id às notificações para filtrar por empresa
ALTER TABLE winai.notifications ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES winai.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON winai.notifications(company_id);
