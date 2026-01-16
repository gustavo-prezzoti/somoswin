CREATE TABLE IF NOT EXISTS winai.knowledge_base_connections (
    id UUID PRIMARY KEY,
    knowledge_base_id UUID NOT NULL REFERENCES winai.knowledge_bases(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES winai.user_whatsapp_connections(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(connection_id) -- Garante que uma conexão WhatsApp só tenha um Agente atribuído
);

CREATE INDEX IF NOT EXISTS idx_kbc_knowledge_base ON winai.knowledge_base_connections(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_kbc_connection ON winai.knowledge_base_connections(connection_id);
