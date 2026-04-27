-- Instruções por documento: quando a IA deve anexar (vai para o catálogo do prompt)
ALTER TABLE winai.company_agent_documents
    ADD COLUMN IF NOT EXISTS send_when_instructions TEXT;
