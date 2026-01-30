-- Migration V14: Adjust Cascading Deletes
-- Goal: Ensure core data (Users, Leads) is preserved when parents (Companies, Connections) are deleted.

-- 1. Adjust users(company_id)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'fk_users_company' AND table_name = 'users' AND table_schema = 'winai') THEN
        ALTER TABLE winai.users DROP CONSTRAINT fk_users_company;
    END IF;
    
    -- Re-add with ON DELETE SET NULL
    ALTER TABLE winai.users 
    ADD CONSTRAINT fk_users_company 
    FOREIGN KEY (company_id) REFERENCES winai.companies(id) ON DELETE SET NULL;
END $$;

-- 2. Adjust leads(company_id)
DO $$
BEGIN
    -- Ensure the column is nullable
    ALTER TABLE winai.leads ALTER COLUMN company_id DROP NOT NULL;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'fk_leads_company' AND table_name = 'leads' AND table_schema = 'winai') THEN
        ALTER TABLE winai.leads DROP CONSTRAINT fk_leads_company;
    END IF;
    
    -- Re-add with ON DELETE SET NULL
    ALTER TABLE winai.leads 
    ADD CONSTRAINT fk_leads_company 
    FOREIGN KEY (company_id) REFERENCES winai.companies(id) ON DELETE SET NULL;
END $$;

-- 3. Adjust whatsapp_conversations(company_id)
DO $$
BEGIN
    -- Ensure the column is nullable
    ALTER TABLE winai.whatsapp_conversations ALTER COLUMN company_id DROP NOT NULL;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'fk_whatsapp_conversations_company' AND table_name = 'whatsapp_conversations' AND table_schema = 'winai') THEN
        ALTER TABLE winai.whatsapp_conversations DROP CONSTRAINT fk_whatsapp_conversations_company;
    END IF;
    
    -- Re-add with ON DELETE SET NULL
    ALTER TABLE winai.whatsapp_conversations 
    ADD CONSTRAINT fk_whatsapp_conversations_company 
    FOREIGN KEY (company_id) REFERENCES winai.companies(id) ON DELETE SET NULL;
END $$;

-- 4. Adjust whatsapp_conversations(lead_id)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'fk_whatsapp_conversations_lead' AND table_name = 'whatsapp_conversations' AND table_schema = 'winai') THEN
        ALTER TABLE winai.whatsapp_conversations DROP CONSTRAINT fk_whatsapp_conversations_lead;
    END IF;
    
    -- Re-add with ON DELETE SET NULL
    ALTER TABLE winai.whatsapp_conversations 
    ADD CONSTRAINT fk_whatsapp_conversations_lead 
    FOREIGN KEY (lead_id) REFERENCES winai.leads(id) ON DELETE SET NULL;
END $$;

-- 5. Adjust user_whatsapp_connections(user_id)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'fk_user_whatsapp_connections_user' AND table_name = 'user_whatsapp_connections' AND table_schema = 'winai') THEN
        ALTER TABLE winai.user_whatsapp_connections DROP CONSTRAINT fk_user_whatsapp_connections_user;
    END IF;
    
    -- Re-add with ON DELETE SET NULL
    ALTER TABLE winai.user_whatsapp_connections 
    ADD CONSTRAINT fk_user_whatsapp_connections_user 
    FOREIGN KEY (user_id) REFERENCES winai.users(id) ON DELETE SET NULL;
END $$;

-- 6. Adjust user_whatsapp_connections(company_id)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'fk_user_whatsapp_connections_company' AND table_name = 'user_whatsapp_connections' AND table_schema = 'winai') THEN
        ALTER TABLE winai.user_whatsapp_connections DROP CONSTRAINT fk_user_whatsapp_connections_company;
    END IF;
    
    -- Re-add with ON DELETE SET NULL
    ALTER TABLE winai.user_whatsapp_connections 
    ADD CONSTRAINT fk_user_whatsapp_connections_company 
    FOREIGN KEY (company_id) REFERENCES winai.companies(id) ON DELETE SET NULL;
END $$;
