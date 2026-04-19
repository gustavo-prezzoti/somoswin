-- Modo padrão null = nenhum agente (KB) / não configurado; IA ou HUMAN quando definido explicitamente.
ALTER TABLE winai.companies ALTER COLUMN default_support_mode DROP DEFAULT;
ALTER TABLE winai.companies ALTER COLUMN default_support_mode DROP NOT NULL;

-- Empresas sem base de conhecimento: alinhar para null (antes podia ficar HUMAN órfão)
UPDATE winai.companies c
SET default_support_mode = NULL
WHERE NOT EXISTS (SELECT 1 FROM winai.knowledge_bases kb WHERE kb.company_id = c.id);
