-- Fix: A coluna 'plan' antiga existe com NOT NULL mas o Hibernate usa 'plan_type'.
-- A entidade Java mapeia o enum para plan_type, mas a coluna plan original permaneceu no banco.

DO $$
BEGIN
    -- Verificar se a coluna 'plan' existe (separada de 'plan_type')
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'winai' AND table_name = 'companies' AND column_name = 'plan'
    ) THEN
        -- Dropar a coluna plan antiga (o Hibernate usa plan_type)
        ALTER TABLE winai.companies DROP COLUMN plan;
        RAISE NOTICE 'Coluna plan removida com sucesso';
    END IF;
END $$;
