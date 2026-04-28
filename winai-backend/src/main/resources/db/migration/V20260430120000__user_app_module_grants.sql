-- Permissões granulares do app cliente (Somoswin): módulos por usuário da empresa.
ALTER TABLE winai.users
    ADD COLUMN IF NOT EXISTS app_full_access BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE winai.users
    ADD COLUMN IF NOT EXISTS app_module_grants JSONB;

COMMENT ON COLUMN winai.users.app_full_access IS 'Quando true, ignora app_module_grants para o app cliente.';
COMMENT ON COLUMN winai.users.app_module_grants IS 'Mapa moduleKey -> permitido; NULL = compatível com antes (todos os módulos permitidos).';
