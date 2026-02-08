-- Migração para criar tabela de Planos e adicionar campos obrigatórios
-- V7__Create_Plans_And_Company_Fields.sql

-- Tabela de planos de assinatura
CREATE TABLE IF NOT EXISTS winai.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    setup_fee DECIMAL(10,2) NOT NULL,
    lead_limit INTEGER,
    user_limit INTEGER,
    whatsapp_limit INTEGER NOT NULL DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir os 3 planos
INSERT INTO winai.plans (name, display_name, price, setup_fee, lead_limit, user_limit, whatsapp_limit, description)
VALUES 
    ('STARTER', 'Starter', 497.00, 1500.00, 300, 2, 1, 'Plano inicial para pequenas empresas. 300 leads/mês, 2 usuários, 1 conexão WhatsApp.'),
    ('PRO', 'Pro', 997.00, 1500.00, 800, 5, 1, 'Plano profissional para empresas em crescimento. 800 leads/mês, 5 usuários, 1 conexão WhatsApp.'),
    ('ENTERPRISE', 'Enterprise', 1997.00, 1500.00, NULL, NULL, 5, 'Plano empresarial sem limites. Leads ilimitados, usuários ilimitados, até 5 conexões WhatsApp.')
ON CONFLICT (name) DO NOTHING;

-- Adicionar colunas à tabela companies (se não existirem)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'winai' AND table_name = 'companies' AND column_name = 'contratante') THEN
        ALTER TABLE winai.companies ADD COLUMN contratante VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'winai' AND table_name = 'companies' AND column_name = 'documento') THEN
        ALTER TABLE winai.companies ADD COLUMN documento VARCHAR(20);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'winai' AND table_name = 'companies' AND column_name = 'email_contratante') THEN
        ALTER TABLE winai.companies ADD COLUMN email_contratante VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'winai' AND table_name = 'companies' AND column_name = 'plan_id') THEN
        ALTER TABLE winai.companies ADD COLUMN plan_id UUID REFERENCES winai.plans(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'winai' AND table_name = 'companies' AND column_name = 'plan_type') THEN
        ALTER TABLE winai.companies ADD COLUMN plan_type VARCHAR(50) DEFAULT 'STARTER';
    END IF;
END $$;

-- Atualizar enum de plan para usar novos valores (PRO ao invés de PROFESSIONAL)
UPDATE winai.companies SET plan_type = 'PRO' WHERE plan_type = 'PROFESSIONAL';
UPDATE winai.companies SET plan_type = 'STARTER' WHERE plan_type = 'ULTRA';

-- Índice para buscar empresas por plano
CREATE INDEX IF NOT EXISTS idx_companies_plan_id ON winai.companies(plan_id);
