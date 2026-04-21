-- Títulos personalizados das colunas do Kanban CRM por empresa (JSON: { "NEW": "...", ... })
ALTER TABLE winai.companies
    ADD COLUMN IF NOT EXISTS crm_kanban_column_titles TEXT;
