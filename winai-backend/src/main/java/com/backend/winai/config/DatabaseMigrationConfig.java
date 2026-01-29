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
                            "time_window_end", "end_hour"
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
                    jdbcTemplate.execute("CREATE EXTENSION IF NOT EXISTS vector");
                    jdbcTemplate.execute(
                            "ALTER TABLE winai.knowledge_base_chunks ADD COLUMN IF NOT EXISTS embedding vector(1536)");
                    log.info("Extensão vector e coluna embedding verificadas com sucesso.");
                } catch (Exception e) {
                    log.error(
                            "Erro ao configurar pgvector (verifique se a extensão vector está disponível no PostgreSQL): {}",
                            e.getMessage());
                }

            } catch (Exception e) {
                log.warn("Erro geral na migração: {}", e.getMessage());
            }
        };
    }
}
