-- Migration script to update user_whatsapp_connections table
-- From user-based to company-based ownership
-- Run this script manually on your PostgreSQL database

-- Step 1: Add the new columns if they don't exist
ALTER TABLE winai.user_whatsapp_connections 
ADD COLUMN IF NOT EXISTS company_id UUID;

ALTER TABLE winai.user_whatsapp_connections 
ADD COLUMN IF NOT EXISTS created_by_user_id UUID;

-- Step 2: If you have existing data with user_id, migrate it
-- This assumes users belong to a company and we want to preserve the connection
-- You may need to adjust this based on your data

-- Option A: If user_id column exists and you want to copy the user to created_by
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'winai' 
               AND table_name = 'user_whatsapp_connections' 
               AND column_name = 'user_id') THEN
        -- Copy user_id to created_by_user_id
        UPDATE winai.user_whatsapp_connections 
        SET created_by_user_id = user_id 
        WHERE created_by_user_id IS NULL AND user_id IS NOT NULL;
        
        -- Set company_id from the user's company
        UPDATE winai.user_whatsapp_connections uwc
        SET company_id = u.company_id
        FROM winai.users u
        WHERE uwc.user_id = u.id 
        AND uwc.company_id IS NULL;
    END IF;
END $$;

-- Step 3: If there are still NULL company_ids, you need to assign them manually
-- or set a default company. This query shows which records need attention:
-- SELECT * FROM winai.user_whatsapp_connections WHERE company_id IS NULL;

-- Step 4: Make company_id NOT NULL after all records have a company assigned
-- ALTER TABLE winai.user_whatsapp_connections ALTER COLUMN company_id SET NOT NULL;

-- Step 5: Add foreign key constraints
ALTER TABLE winai.user_whatsapp_connections 
DROP CONSTRAINT IF EXISTS fk_user_whatsapp_connections_company;

ALTER TABLE winai.user_whatsapp_connections 
ADD CONSTRAINT fk_user_whatsapp_connections_company 
FOREIGN KEY (company_id) REFERENCES winai.companies(id);

ALTER TABLE winai.user_whatsapp_connections 
DROP CONSTRAINT IF EXISTS fk_user_whatsapp_connections_created_by;

ALTER TABLE winai.user_whatsapp_connections 
ADD CONSTRAINT fk_user_whatsapp_connections_created_by 
FOREIGN KEY (created_by_user_id) REFERENCES winai.users(id);

-- Step 6: Update the unique constraint (from user_id + instance_name to company_id + instance_name)
ALTER TABLE winai.user_whatsapp_connections 
DROP CONSTRAINT IF EXISTS user_whatsapp_connections_user_id_instance_name_key;

ALTER TABLE winai.user_whatsapp_connections 
DROP CONSTRAINT IF EXISTS uk_user_whatsapp_connections_company_instance;

ALTER TABLE winai.user_whatsapp_connections 
ADD CONSTRAINT uk_user_whatsapp_connections_company_instance 
UNIQUE (company_id, instance_name);

-- Step 7: Optionally drop the old user_id column after data migration is complete
-- WARNING: Only do this after verifying all data has been migrated correctly
-- ALTER TABLE winai.user_whatsapp_connections DROP COLUMN IF EXISTS user_id;
