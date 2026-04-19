-- Permite remover membro da empresa (desvincular conta) sem apagar o registro de usuário
ALTER TABLE winai.users
    ALTER COLUMN company_id DROP NOT NULL;
