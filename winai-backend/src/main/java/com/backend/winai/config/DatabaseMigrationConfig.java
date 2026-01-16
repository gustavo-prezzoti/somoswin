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

                // Garantir extensão vector e coluna embedding
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
