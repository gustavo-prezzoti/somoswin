CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS winai.knowledge_bases (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES winai.companies(id),
    name VARCHAR(255) NOT NULL,
    content TEXT, -- Conteúdo original completo
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS winai.knowledge_base_chunks (
    id UUID PRIMARY KEY,
    knowledge_base_id UUID NOT NULL REFERENCES winai.knowledge_bases(id) ON DELETE CASCADE,
    content_chunk TEXT NOT NULL,
    embedding vector(1536),
    chunk_index INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS knowledge_base_chunks_embedding_idx ON winai.knowledge_base_chunks USING hnsw (embedding vector_cosine_ops);
