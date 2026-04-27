-- Documentos enviáveis pelo agente (Supabase Storage + metadados por empresa)
CREATE TABLE winai.company_agent_documents (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES winai.companies (id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    storage_bucket VARCHAR(128) NOT NULL,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    mime_type VARCHAR(255) NOT NULL,
    original_filename VARCHAR(1024),
    file_size BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_company_agent_documents_company ON winai.company_agent_documents (company_id);

-- Quais documentos cada agente (knowledge base) pode anexar
CREATE TABLE winai.knowledge_base_agent_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID NOT NULL REFERENCES winai.knowledge_bases (id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES winai.company_agent_documents (id) ON DELETE CASCADE,
    CONSTRAINT uk_kb_agent_document UNIQUE (knowledge_base_id, document_id)
);

CREATE INDEX idx_kb_agent_documents_kb ON winai.knowledge_base_agent_documents (knowledge_base_id);
CREATE INDEX idx_kb_agent_documents_doc ON winai.knowledge_base_agent_documents (document_id);
