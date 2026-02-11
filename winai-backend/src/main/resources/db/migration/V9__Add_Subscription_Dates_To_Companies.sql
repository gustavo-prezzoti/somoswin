-- Migração para adicionar datas de vigência da assinatura
-- V9__Add_Subscription_Dates_To_Companies.sql

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'winai' AND table_name = 'companies' AND column_name = 'subscription_start_date') THEN
        ALTER TABLE winai.companies ADD COLUMN subscription_start_date DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'winai' AND table_name = 'companies' AND column_name = 'subscription_end_date') THEN
        ALTER TABLE winai.companies ADD COLUMN subscription_end_date DATE;
    END IF;
END $$;
