package com.backend.winai.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * Configuração de threads assíncronas para o sistema.
 * Define um Thread Pool dedicado para o worker de follow-up,
 * garantindo isolamento das threads principais do Tomcat.
 */
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig implements AsyncConfigurer {

    /**
     * Thread Pool dedicado para processamento de follow-ups.
     * Características:
     * - 2 threads dedicadas (mínimo)
     * - 4 threads máximo (permite escalar sob carga)
     * - Fila de 100 tasks (buffer para picos)
     * - Prefixo "FollowUp-Worker-" para fácil identificação em logs
     * - CallerRunsPolicy: se fila cheia, executa na thread que chamou
     * (backpressure)
     */
    @Bean(name = "followUpTaskExecutor")
    public ThreadPoolTaskExecutor followUpTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("FollowUp-Worker-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }

    @Override
    public Executor getAsyncExecutor() {
        return followUpTaskExecutor();
    }
}
