-- =============================================================================
-- Corrige empresas/conversas antigas: modo IA sem cadeia válida de configuração.
-- Alinhado a AIAgentService.isAIEnabledForConversation:
--   IA só se existir conexão WhatsApp ativa com Base de Conhecimento vinculada
--   e knowledge_bases.is_active = true.
--
-- Uso (exemplo):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f fix_legacy_ia_without_kb.sql
--
-- Revise o relatório (SELECTs finais) antes do UPDATE em produção, se preferir
-- rodar em etapas.
-- =============================================================================

BEGIN;

-- Empresas que têm "setup de IA" válido (ao menos uma conexão ativa + KB ativa vinculada)
CREATE TEMP TABLE tmp_companies_with_valid_ia_setup ON COMMIT DROP AS
SELECT DISTINCT uwc.company_id
FROM winai.user_whatsapp_connections uwc
INNER JOIN winai.knowledge_base_connections kbc ON kbc.connection_id = uwc.id
INNER JOIN winai.knowledge_bases kb ON kb.id = kbc.knowledge_base_id
WHERE COALESCE(uwc.is_active, TRUE) = TRUE
  AND COALESCE(kb.is_active, FALSE) = TRUE;

-- Pré-visualização: empresas com default IA mas sem setup (serão ajustadas)
SELECT c.id,
       c.name,
       c.default_support_mode
FROM winai.companies c
WHERE UPPER(TRIM(COALESCE(c.default_support_mode, ''))) = 'IA'
  AND c.id NOT IN (SELECT company_id FROM tmp_companies_with_valid_ia_setup);

UPDATE winai.companies c
SET default_support_mode = 'HUMAN'
WHERE UPPER(TRIM(COALESCE(c.default_support_mode, ''))) = 'IA'
  AND c.id NOT IN (SELECT company_id FROM tmp_companies_with_valid_ia_setup);

-- Conversas ainda em IA nessas empresas → HUMAN (coerente com empresa sem IA apta)
UPDATE winai.whatsapp_conversations w
SET support_mode = 'HUMAN'
WHERE UPPER(TRIM(COALESCE(w.support_mode, ''))) = 'IA'
  AND w.company_id NOT IN (SELECT company_id FROM tmp_companies_with_valid_ia_setup);

COMMIT;

-- Verificação pós-execução (rodar separadamente se quiser):
-- SELECT id, name, default_support_mode FROM winai.companies WHERE default_support_mode ILIKE 'IA';
-- SELECT COUNT(*) FROM winai.whatsapp_conversations WHERE support_mode ILIKE 'IA';
