package com.backend.winai.config;

import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configura o DataSource para Supabase Connection Pooler (Transaction mode, porta 6543).
 * Desabilita prepared statements para evitar erros "S_1 does not exist" / "S_3 already exists".
 * PgBouncer em transaction mode não mantém prepared statements entre transações.
 */
@Configuration
public class DataSourcePoolerConfig {

    private static final Logger log = LoggerFactory.getLogger(DataSourcePoolerConfig.class);

    private static final String POOLER_PARAMS = "prepareThreshold=0";

    @Bean
    public BeanPostProcessor hikariPoolerPostProcessor() {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
                if (bean instanceof HikariDataSource ds) {
                    String url = ds.getJdbcUrl();
                    if (url != null && isPoolerUrl(url) && !url.contains("prepareThreshold")) {
                        String newUrl = url + (url.contains("?") ? "&" : "?") + POOLER_PARAMS;
                        ds.setJdbcUrl(newUrl);
                        log.info("DataSource configurado para Supabase pooler (prepareThreshold=0)");
                    }
                }
                return bean;
            }

            private boolean isPoolerUrl(String url) {
                return url.contains("pooler.supabase.com") || url.contains("pooler.");
            }
        };
    }
}
