-- Adicionar coluna support_mode na tabela whatsapp_conversations
-- Esta coluna controla se a conversa está em modo IA ou HUMAN

ALTER TABLE winai.whatsapp_conversations
ADD COLUMN IF NOT EXISTS support_mode VARCHAR(10) DEFAULT 'IA';

COMMENT ON COLUMN winai.whatsapp_conversations.support_mode IS 'Modo de suporte: IA (automático) ou HUMAN (manual)';

-- Atualizar conversas existentes para modo IA
UPDATE winai.whatsapp_conversations
SET support_mode = 'IA'
WHERE support_mode IS NULL;
