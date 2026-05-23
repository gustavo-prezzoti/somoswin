package com.backend.winai.ai.pipeline.filters;

import com.backend.winai.ai.pipeline.config.AiPipelineProperties;

import org.springframework.beans.factory.DisposableBean;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import lombok.extern.slf4j.Slf4j;

/**
 * Cooldown em memória (per-process) entre respostas da IA para o mesmo contato.
 * Complementa o cooldown distribuído (Redis) — barra rajada local mesmo se Redis
 * falhar. Defaults: 5s entre respostas, GC a cada 5 minutos descartando entradas
 * com >10 min.
 */
@Service
@Slf4j
public class AiCooldownService implements DisposableBean {

    private final AiPipelineProperties props;
    private final ConcurrentHashMap<String, Long> lastReplyAt = new ConcurrentHashMap<>();
    private final ScheduledExecutorService gc = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "ai-cooldown-gc");
        t.setDaemon(true);
        return t;
    });

    public AiCooldownService(AiPipelineProperties props) {
        this.props = props;
        long gcEvery = Math.max(60L, props.getCooldownGcIntervalSec());
        gc.scheduleAtFixedRate(this::sweep, gcEvery, gcEvery, TimeUnit.SECONDS);
    }

    /** @return true se pode responder agora (passou o cooldown); false se está rate-limited. */
    public boolean tryConsume(String contactKey) {
        if (contactKey == null) return true;
        long now = System.currentTimeMillis();
        long min = props.getReplyCooldownMs();
        Long prev = lastReplyAt.get(contactKey);
        if (prev != null && (now - prev) < min) {
            log.info("[cooldown] RATE-LIMITED contact={} dt={}ms < {}ms", contactKey, now - prev, min);
            return false;
        }
        lastReplyAt.put(contactKey, now);
        return true;
    }

    private void sweep() {
        long cutoff = System.currentTimeMillis() - 10 * 60 * 1000L;
        lastReplyAt.entrySet().removeIf(e -> e.getValue() == null || e.getValue() < cutoff);
    }

    @Override
    public void destroy() {
        gc.shutdown();
    }
}
