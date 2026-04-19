-- =============================================================================
-- Remove vínculos em knowledge_base_connections que apontam para knowledge_bases
-- já excluídos (dados legados quando o agente era apagado sem limpar o vínculo).
--
-- Uso:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f cleanup_orphan_knowledge_base_connections.sql
-- =============================================================================

BEGIN;

-- Pré-visualização (opcional: rodar só este SELECT antes)
-- SELECT kbc.id, kbc.knowledge_base_id, kbc.connection_id
-- FROM winai.knowledge_base_connections kbc
-- WHERE NOT EXISTS (SELECT 1 FROM winai.knowledge_bases kb WHERE kb.id = kbc.knowledge_base_id);

DELETE FROM winai.knowledge_base_connections AS kbc
WHERE NOT EXISTS (
    SELECT 1 FROM winai.knowledge_bases kb WHERE kb.id = kbc.knowledge_base_id
);

COMMIT;
