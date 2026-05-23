package com.backend.winai.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DatabaseMigrationConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseMigrationConfig.class);

    @Bean
    public CommandLineRunner migrateDatabase(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                log.info("Iniciando migração de banco de dados...");

                // Alterar user_id para nullable
                try {
                    jdbcTemplate
                            .execute("ALTER TABLE winai.user_whatsapp_connections ALTER COLUMN user_id DROP NOT NULL");
                    log.info("Coluna user_id alterada para DROP NOT NULL com sucesso.");
                } catch (Exception e) {
                    log.warn("Erro ao alterar user_id (ignorado, pode já ter sido alterado): {}", e.getMessage());
                }

                try {
                    String[] columns = {
                            "recurring_interval_minutes", "recurrence_minutes",
                            "custom_prompt", "custom_message",
                            "trigger_on_ai_message", "trigger_on_ai_response",
                            "time_window_start", "start_hour",
                            "time_window_end", "end_hour",
                            "message_type", "active", "recurring",
                            "recurrence_interval_minutes", "repeat"
                    };

                    for (String col : columns) {
                        try {
                            jdbcTemplate.execute(
                                    "ALTER TABLE winai.followup_configs ALTER COLUMN " + col + " DROP NOT NULL");
                        } catch (Exception e) {
                            // Ignora se coluna não existir
                        }
                    }
                    log.info("Constraints de followup_configs ajustadas com sucesso.");
                } catch (Exception e) {
                    log.warn("Erro ao ajustar constraints de followup_configs: {}", e.getMessage());
                }

                try {
                    // Supabase: pgvector mora em `extensions`. Garante o schema antes do install.
                    jdbcTemplate.execute("CREATE SCHEMA IF NOT EXISTS extensions");
                    try {
                        jdbcTemplate.execute("CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions");
                    } catch (Exception primary) {
                        // Fallback: PG comum sem o schema `extensions` permitido → instala no default (public).
                        log.warn("pgvector no schema extensions falhou ({}). Tentando schema default.", primary.getMessage());
                        jdbcTemplate.execute("CREATE EXTENSION IF NOT EXISTS vector");
                    }
                    jdbcTemplate.execute(
                            "ALTER TABLE winai.knowledge_base_chunks ADD COLUMN IF NOT EXISTS embedding extensions.vector(1536)");
                    log.info("Extensão vector e coluna embedding verificadas com sucesso.");
                } catch (Exception e) {
                    log.error(
                            "Erro ao configurar pgvector (verifique se a extensão vector está disponível no PostgreSQL): {}",
                            e.getMessage());
                }

                try {
                    jdbcTemplate.execute(
                            """
                            CREATE TABLE IF NOT EXISTS winai.amplia_staff_roles (
                                id UUID PRIMARY KEY,
                                name VARCHAR(120) NOT NULL,
                                description TEXT,
                                active BOOLEAN NOT NULL DEFAULT TRUE,
                                full_access BOOLEAN NOT NULL DEFAULT FALSE,
                                permissions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
                                legacy_staff_type VARCHAR(32),
                                created_at TIMESTAMPTZ,
                                updated_at TIMESTAMPTZ,
                                CONSTRAINT uk_amplia_staff_roles_name UNIQUE (name)
                            )
                            """);
                    jdbcTemplate.execute(
                            "ALTER TABLE winai.users ADD COLUMN IF NOT EXISTS amplia_staff_role_id UUID "
                                    + "REFERENCES winai.amplia_staff_roles(id)");
                    jdbcTemplate.execute(
                            """
                            CREATE INDEX IF NOT EXISTS idx_users_amplia_staff_role
                            ON winai.users(amplia_staff_role_id)
                            """);
                    int seeded = jdbcTemplate.update(
                            """
                            INSERT INTO winai.amplia_staff_roles (
                                id, name, description, active, full_access, permissions_json, legacy_staff_type, created_at, updated_at
                            )
                            SELECT 'a1111111-1111-1111-1111-111111111101'::uuid,
                                   'Vendedor',
                                   'Papel padrão (equipe comercial)',
                                   TRUE,
                                   FALSE,
                                   '{"dashboard": true, "clientes": true, "metaads": true, "metas": true, "alertas": true, "performance": true}'::jsonb,
                                   'VENDEDOR',
                                   now(), now()
                            WHERE NOT EXISTS (SELECT 1 FROM winai.amplia_staff_roles WHERE name = 'Vendedor')
                            """);
                    int seeded2 = jdbcTemplate.update(
                            """
                            INSERT INTO winai.amplia_staff_roles (
                                id, name, description, active, full_access, permissions_json, legacy_staff_type, created_at, updated_at
                            )
                            SELECT 'a1111111-1111-1111-1111-111111111102'::uuid,
                                   'Consultor',
                                   'Papel padrão (consultoria)',
                                   TRUE,
                                   FALSE,
                                   '{"dashboard": true, "clientes": true, "usuarios": false, "metaads": true, "metas": true, "alertas": true, "performance": true, "contratos": true, "consultoria": true}'::jsonb,
                                   'CONSULTOR',
                                   now(), now()
                            WHERE NOT EXISTS (SELECT 1 FROM winai.amplia_staff_roles WHERE name = 'Consultor')
                            """);
                    int seeded3 = jdbcTemplate.update(
                            """
                            INSERT INTO winai.amplia_staff_roles (
                                id, name, description, active, full_access, permissions_json, legacy_staff_type, created_at, updated_at
                            )
                            SELECT 'a1111111-1111-1111-1111-111111111103'::uuid,
                                   'Gestor',
                                   'Papel padrão (visão ampla)',
                                   TRUE,
                                   TRUE,
                                   '{}'::jsonb,
                                   'GESTOR',
                                   now(), now()
                            WHERE NOT EXISTS (SELECT 1 FROM winai.amplia_staff_roles WHERE name = 'Gestor')
                            """);
                    int bf1 = jdbcTemplate.update(
                            """
                            UPDATE winai.users u SET amplia_staff_role_id = r.id
                            FROM winai.amplia_staff_roles r
                            WHERE u.amplia_internal_staff = true
                              AND u.amplia_staff_type::text = 'VENDEDOR'
                              AND r.legacy_staff_type = 'VENDEDOR'
                              AND u.amplia_staff_role_id IS NULL
                            """);
                    int bf2 = jdbcTemplate.update(
                            """
                            UPDATE winai.users u SET amplia_staff_role_id = r.id
                            FROM winai.amplia_staff_roles r
                            WHERE u.amplia_internal_staff = true
                              AND u.amplia_staff_type::text = 'CONSULTOR'
                              AND r.legacy_staff_type = 'CONSULTOR'
                              AND u.amplia_staff_role_id IS NULL
                            """);
                    int bf3 = jdbcTemplate.update(
                            """
                            UPDATE winai.users u SET amplia_staff_role_id = r.id
                            FROM winai.amplia_staff_roles r
                            WHERE u.amplia_internal_staff = true
                              AND u.amplia_staff_type::text = 'GESTOR'
                              AND r.legacy_staff_type = 'GESTOR'
                              AND u.amplia_staff_role_id IS NULL
                            """);

                    log.info(
                            "Migração amplia_staff_roles: tabela/seed/backfill ok (seed {}, {}, {}, bf {}, {}, {})",
                            seeded,
                            seeded2,
                            seeded3,
                            bf1,
                            bf2,
                            bf3);
                } catch (Exception e) {
                    log.warn("Erro na migração amplia_staff_roles: {}", e.getMessage());
                }

                try {
                    jdbcTemplate.execute("""
                            CREATE TABLE IF NOT EXISTS winai.lead_attribution_anchors (
                                id UUID PRIMARY KEY,
                                company_id UUID NOT NULL REFERENCES winai.companies(id) ON DELETE CASCADE,
                                anchor_text TEXT NOT NULL,
                                embedding extensions.vector(1536),
                                utm_source VARCHAR(255),
                                utm_medium VARCHAR(255),
                                utm_campaign VARCHAR(255),
                                utm_content VARCHAR(255),
                                utm_term VARCHAR(255),
                                gclid VARCHAR(1024),
                                fbclid VARCHAR(2048),
                                active BOOLEAN NOT NULL DEFAULT TRUE,
                                label VARCHAR(255),
                                notes TEXT,
                                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                            )
                            """);
                    jdbcTemplate.execute(
                            "CREATE INDEX IF NOT EXISTS idx_lead_attr_anchor_company ON winai.lead_attribution_anchors(company_id)");
                    try {
                        jdbcTemplate.execute(
                                "CREATE INDEX IF NOT EXISTS idx_lead_attr_anchor_embedding ON winai.lead_attribution_anchors USING hnsw (embedding extensions.vector_cosine_ops)");
                    } catch (Exception idxEx) {
                        log.debug("Índice HNSW em lead_attribution_anchors opcional (pgvector): {}", idxEx.getMessage());
                    }
                    log.info("Tabela lead_attribution_anchors verificada.");
                } catch (Exception e) {
                    log.warn("Erro ao criar lead_attribution_anchors: {}", e.getMessage());
                }

                try {
                    jdbcTemplate.execute(
                            "ALTER TABLE winai.leads ADD COLUMN IF NOT EXISTS ai_facts_summary TEXT");
                    jdbcTemplate.execute(
                            "ALTER TABLE winai.leads ADD COLUMN IF NOT EXISTS ai_intent_summary TEXT");
                    log.info("Colunas ai_facts_summary / ai_intent_summary verificadas em winai.leads.");
                } catch (Exception e) {
                    log.warn("Erro ao adicionar colunas de summary no lead: {}", e.getMessage());
                }

            } catch (Exception e) {
                log.warn("Erro geral na migração: {}", e.getMessage());
            }
        };
    }
}
