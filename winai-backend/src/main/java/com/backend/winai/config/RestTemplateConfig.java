package com.backend.winai.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * Configuração global de RestTemplate com timeouts adequados
 * para evitar travamentos em chamadas à APIs externas
 */
@Configuration
public class RestTemplateConfig {

    /**
     * RestTemplate padrão com timeout de 90 segundos (1 minuto e meio)
     */
    @Bean
    @Primary
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(90000); // 90 segundos
        factory.setReadTimeout(90000); // 90 segundos
        return new RestTemplate(factory);
    }

    /**
     * RestTemplate com timeout curto para operações que precisam de resposta rápida
     */
    @Bean(name = "quickRestTemplate")
    public RestTemplate quickRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10000); // 10 segundos
        factory.setReadTimeout(15000); // 15 segundos
        return new RestTemplate(factory);
    }

    /**
     * RestTemplate com timeout longo para operações como geração de QR code
     */
    @Bean(name = "qrCodeRestTemplate")
    public RestTemplate qrCodeRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(30000); // 30 segundos
        factory.setReadTimeout(60000); // 60 segundos (QR code pode demorar)
        return new RestTemplate(factory);
    }
}
