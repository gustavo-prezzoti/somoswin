-- ========================================
-- Win AI Backend - Database Setup
-- Execute este script no SQL Editor do Supabase
-- ========================================

-- 1. Criar o schema dedicado para o backend
CREATE SCHEMA IF NOT EXISTS winai;

-- 2. Criar um role específico para o backend
-- (No Supabase, não podemos criar users diretamente, mas podemos criar roles)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'winai_backend') THEN
        CREATE ROLE winai_backend WITH LOGIN PASSWORD 'WinAI_Backend_2026!@#';
    END IF;
END
$$;

-- 3. Conceder permissões ao role no schema winai
GRANT USAGE ON SCHEMA winai TO winai_backend;
GRANT ALL PRIVILEGES ON SCHEMA winai TO winai_backend;

-- 4. Conceder permissões em todas as tabelas futuras do schema
ALTER DEFAULT PRIVILEGES IN SCHEMA winai
GRANT ALL PRIVILEGES ON TABLES TO winai_backend;

ALTER DEFAULT PRIVILEGES IN SCHEMA winai
GRANT ALL PRIVILEGES ON SEQUENCES TO winai_backend;

ALTER DEFAULT PRIVILEGES IN SCHEMA winai
GRANT ALL PRIVILEGES ON FUNCTIONS TO winai_backend;

-- 5. Definir o schema padrão para o role
ALTER ROLE winai_backend SET search_path TO winai, public;

-- 6. Também garantir que o postgres (usado pelo pooler) tenha acesso
GRANT USAGE ON SCHEMA winai TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA winai TO postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA winai
GRANT ALL PRIVILEGES ON TABLES TO postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA winai
GRANT ALL PRIVILEGES ON SEQUENCES TO postgres;

-- ========================================
-- Verificação
-- ========================================
-- Executar para verificar se foi criado:
-- SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'winai';
-- SELECT rolname FROM pg_roles WHERE rolname = 'winai_backend';

COMMENT ON SCHEMA winai IS 'Schema dedicado para o backend do Win AI - separado do public por segurança';
