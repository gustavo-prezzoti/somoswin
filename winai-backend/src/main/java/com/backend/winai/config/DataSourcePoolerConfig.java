package com.backend.winai.config;

import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Ajusta URL JDBC antes do pool abrir conexões:
 * <ul>
 *   <li>Mesmo valor libpq do Python ({@code postgresql://...}) → {@code jdbc:postgresql://...}</li>
 *   <li>Supabase: {@code sslmode=require} quando ausente</li>
 *   <li>PgBouncer em modo transação: {@code prepareThreshold=0}</li>
 * </ul>
 */
@Configuration
public class DataSourcePoolerConfig {

    private static final Logger log = LoggerFactory.getLogger(DataSourcePoolerConfig.class);

    private static final String POOLER_PARAMS = "prepareThreshold=0";

    @Bean
    public BeanPostProcessor hikariPoolerPostProcessor() {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
                if (bean instanceof HikariDataSource ds) {
                    normalizeLibpqUrl(ds);
                    warnSupabasePoolerUsername(ds);
                    appendPoolerPrepareThreshold(ds);
                }
                return bean;
            }

            /**
             * Pooler Supabase (transaction, :6543) exige usuário {@code postgres.PROJECT_REF}.
             * Só {@code postgres} → PgBouncer: {@code FATAL: Tenant or user not found}.
             */
            private void warnSupabasePoolerUsername(HikariDataSource ds) {
                String url = ds.getJdbcUrl();
                if (url == null || !url.contains("pooler.supabase.com")) {
                    return;
                }
                String user = ds.getUsername();
                if (user == null || user.isBlank()) {
                    return;
                }
                if ("postgres".equalsIgnoreCase(user.trim())) {
                    log.warn(
                            "Supabase pooler: usuário \"postgres\" costuma falhar com \"Tenant or user not found\". "
                                    + "Use o usuário do Dashboard → Connect → Transaction pooling (formato postgres.SEU_PROJECT_REF), "
                                    + "em SPRING_DATASOURCE_USERNAME ou DATABASE_USERNAME. "
                                    + "Se a senha está só na DATABASE_URL, não defina usuário separado como \"postgres\"."
                    );
                }
            }

            /** Aceita DATABASE_URL estilo libpq (postgresql://) igual ao Flask/Python. */
            private void normalizeLibpqUrl(HikariDataSource ds) {
                String url = ds.getJdbcUrl();
                if (url == null || url.isBlank()) {
                    return;
                }
                url = url.trim();
                if (!url.startsWith("postgresql://")) {
                    return;
                }
                String jdbc = "jdbc:" + url;
                jdbc = ensureSupabaseSsl(jdbc);
                ds.setJdbcUrl(jdbc);
                log.info("JDBC URL normalizada (postgresql:// → jdbc:postgresql://)");
            }

            private String ensureSupabaseSsl(String jdbcUrl) {
                boolean supabase = jdbcUrl.contains("supabase.co") || jdbcUrl.contains("supabase.com");
                if (!supabase || jdbcUrl.contains("sslmode=")) {
                    return jdbcUrl;
                }
                return jdbcUrl + (jdbcUrl.contains("?") ? "&" : "?") + "sslmode=require";
            }

            private void appendPoolerPrepareThreshold(HikariDataSource ds) {
                String url = ds.getJdbcUrl();
                if (url != null && isPoolerUrl(url) && !url.contains("prepareThreshold")) {
                    String newUrl = url + (url.contains("?") ? "&" : "?") + POOLER_PARAMS;
                    ds.setJdbcUrl(newUrl);
                    log.info("DataSource configurado para Supabase pooler (prepareThreshold=0)");
                }
            }

            private boolean isPoolerUrl(String url) {
                return url.contains("pooler.supabase.com") || url.contains("pooler.");
            }
        };
    }
}
