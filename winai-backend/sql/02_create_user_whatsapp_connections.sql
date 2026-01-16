-- Migration: Create user_whatsapp_connections table
-- Description: Tabela para associar usuários com conexões do WhatsApp (instâncias do Uazap)
-- Author: System
-- Date: 2026-01-13

-- Criar tabela user_whatsapp_connections
CREATE TABLE IF NOT EXISTS winai.user_whatsapp_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    instance_name VARCHAR(255) NOT NULL,
    instance_token TEXT,
    instance_base_url VARCHAR(500),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key para users
    CONSTRAINT fk_user_whatsapp_connections_user 
        FOREIGN KEY (user_id) 
        REFERENCES winai.users(id) 
        ON DELETE CASCADE,
    
    -- Constraint de unicidade: um usuário não pode ter duas conexões com a mesma instância
    CONSTRAINT uk_user_instance 
        UNIQUE (user_id, instance_name)
);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_user_whatsapp_connections_user_id 
    ON winai.user_whatsapp_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_user_whatsapp_connections_instance_name 
    ON winai.user_whatsapp_connections(instance_name);

CREATE INDEX IF NOT EXISTS idx_user_whatsapp_connections_is_active 
    ON winai.user_whatsapp_connections(is_active);

-- Comentários na tabela e colunas
COMMENT ON TABLE winai.user_whatsapp_connections IS 
    'Tabela de associação entre usuários e conexões do WhatsApp (instâncias do Uazap)';

COMMENT ON COLUMN winai.user_whatsapp_connections.id IS 
    'ID único da associação';

COMMENT ON COLUMN winai.user_whatsapp_connections.user_id IS 
    'ID do usuário associado';

COMMENT ON COLUMN winai.user_whatsapp_connections.instance_name IS 
    'Nome da instância do Uazap (ex: somoswin)';

COMMENT ON COLUMN winai.user_whatsapp_connections.instance_token IS 
    'Token de autenticação da instância';

COMMENT ON COLUMN winai.user_whatsapp_connections.instance_base_url IS 
    'URL base da API da instância (ex: https://somoswin.uazapi.com)';

COMMENT ON COLUMN winai.user_whatsapp_connections.description IS 
    'Descrição opcional da conexão';

COMMENT ON COLUMN winai.user_whatsapp_connections.is_active IS 
    'Indica se a conexão está ativa';

COMMENT ON COLUMN winai.user_whatsapp_connections.created_at IS 
    'Data de criação da associação';

COMMENT ON COLUMN winai.user_whatsapp_connections.updated_at IS 
    'Data da última atualização';
