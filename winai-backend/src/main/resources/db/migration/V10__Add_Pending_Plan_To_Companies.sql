-- Migration para adicionar campo de plano pendente (troca de plano)
-- V10__Add_Pending_Plan_To_Companies.sql

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'winai' AND table_name = 'companies' AND column_name = 'pending_plan_id') THEN
        ALTER TABLE winai.companies ADD COLUMN pending_plan_id UUID REFERENCES winai.plans(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'winai' AND table_name = 'companies' AND column_name = 'pending_plan_payment_id') THEN
        ALTER TABLE winai.companies ADD COLUMN pending_plan_payment_id VARCHAR(255);
    END IF;
END $$;
