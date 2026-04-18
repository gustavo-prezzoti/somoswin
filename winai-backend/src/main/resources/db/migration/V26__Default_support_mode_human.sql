-- Padrão humano até o admin habilitar IA no painel (novas linhas)
ALTER TABLE winai.companies ALTER COLUMN default_support_mode SET DEFAULT 'HUMAN';
ALTER TABLE winai.whatsapp_conversations ALTER COLUMN support_mode SET DEFAULT 'HUMAN';
