-- Migração para adicionar campos de integração Asaas na tabela companies
-- V8__Add_Asaas_Fields_To_Companies.sql

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'winai' AND table_name = 'companies' AND column_name = 'asaas_customer_id') THEN
        ALTER TABLE winai.companies ADD COLUMN asaas_customer_id VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'winai' AND table_name = 'companies' AND column_name = 'asaas_subscription_id') THEN
        ALTER TABLE winai.companies ADD COLUMN asaas_subscription_id VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'winai' AND table_name = 'companies' AND column_name = 'subscription_status') THEN
        ALTER TABLE winai.companies ADD COLUMN subscription_status VARCHAR(30) DEFAULT 'PENDING';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'winai' AND table_name = 'companies' AND column_name = 'subscription_due_date') THEN
        ALTER TABLE winai.companies ADD COLUMN subscription_due_date DATE;
    END IF;
END $$;

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_companies_asaas_customer_id ON winai.companies(asaas_customer_id);
CREATE INDEX IF NOT EXISTS idx_companies_asaas_subscription_id ON winai.companies(asaas_subscription_id);

-- Adicionar coluna asaas_id na tabela plans para mapear com planos no Asaas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'winai' AND table_name = 'plans' AND column_name = 'asaas_plan_id') THEN
        ALTER TABLE winai.plans ADD COLUMN asaas_plan_id VARCHAR(100);
    END IF;
END $$;
