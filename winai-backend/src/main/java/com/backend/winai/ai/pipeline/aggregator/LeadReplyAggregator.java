package com.backend.winai.ai.pipeline.aggregator;

import com.backend.winai.ai.pipeline.config.AiPipelineProperties;
import com.backend.winai.ai.pipeline.model.AiPayload;
import com.backend.winai.ai.pipeline.model.PayloadMerger;

import org.springframework.beans.factory.DisposableBean;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

import lombok.extern.slf4j.Slf4j;

/**
 * Janela de agregação por (companyId, conversationId).
 *
 * Comportamento:
 *  - Cada nova mensagem RESETA o timer com o waitSeconds calculado pelo decisor.
 *  - HARD CAP: se o tempo total desde a primeira mensagem do burst ultrapassa
 *    {@code aggregator.hard-cap-sec}, faz flush imediato.
 *  - waitSeconds == 0 com pendência existente também dispara flush imediato.
 *
 * O flush invoca o callback registrado em {@link #setOnFlush(Consumer)} com o
 * payload mesclado. O caller deve então rodar o pipeline de fato (decoder de
 * inflight + GPT). Aggregator não conhece Redis: é puramente in-memory.
 */
@Service
@Slf4j
public class LeadReplyAggregator implements DisposableBean {

    private final AiPipelineProperties props;

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4, r -> {
        Thread t = new Thread(r, "ai-aggregator");
        t.setDaemon(true);
        return t;
    });

    private final ConcurrentHashMap<String, Entry> pending = new ConcurrentHashMap<>();
    private volatile Consumer<AiPayload> onFlush = p -> {};

    public LeadReplyAggregator(AiPipelineProperties props) {
        this.props = props;
    }

    public void setOnFlush(Consumer<AiPayload> onFlush) {
        this.onFlush = onFlush != null ? onFlush : p -> {};
    }

    /**
     * Recebe uma nova mensagem com o waitSeconds calculado pelo decisor.
     */
    public void offer(AiPayload payload, int waitSeconds) {
        if (payload == null) return;
        String key = keyOf(payload);
        long now = System.currentTimeMillis();

        Entry entry = pending.compute(key, (k, current) -> {
            if (current == null) {
                Entry e = new Entry();
                e.firstAt = now;
                e.payloads.add(payload);
                return e;
            }
            current.payloads.add(payload);
            return current;
        });

        long ageMs = now - entry.firstAt;
        long hardCapMs = props.hardCapSec() * 1000L;
        if (waitSeconds <= 0 || ageMs >= hardCapMs) {
            flushNow(key, ageMs >= hardCapMs ? "hard-cap" : "immediate");
            return;
        }

        synchronized (entry) {
            if (entry.timer != null) {
                entry.timer.cancel(false);
            }
            ScheduledFuture<?> sf = scheduler.schedule(() -> flushNow(key, "timer"),
                    waitSeconds, TimeUnit.SECONDS);
            entry.timer = sf;
            log.debug("[aggregator] {} aguardando {}s (n={})", key, waitSeconds, entry.payloads.size());
        }
    }

    private void flushNow(String key, String reason) {
        Entry entry = pending.remove(key);
        if (entry == null) return;
        synchronized (entry) {
            if (entry.timer != null) {
                entry.timer.cancel(false);
                entry.timer = null;
            }
        }
        if (entry.payloads.isEmpty()) return;
        AiPayload merged = PayloadMerger.merge(entry.payloads);
        if (merged == null) return;
        log.info("[aggregator] flush ({}) {} msgs key={}", reason, entry.payloads.size(), key);
        try {
            onFlush.accept(merged);
        } catch (Exception e) {
            log.error("[aggregator] erro no callback de flush para {}: {}", key, e.getMessage(), e);
        }
    }

    private static String keyOf(AiPayload p) {
        String company = p.getCompanyId() != null ? p.getCompanyId() : "_";
        String conv = p.getConversationId() != null ? p.getConversationId() : "_";
        return company + ":" + conv;
    }

    @Override
    public void destroy() {
        scheduler.shutdown();
        try {
            if (!scheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static final class Entry {
        long firstAt;
        final List<AiPayload> payloads = new ArrayList<>();
        ScheduledFuture<?> timer;
    }
}
