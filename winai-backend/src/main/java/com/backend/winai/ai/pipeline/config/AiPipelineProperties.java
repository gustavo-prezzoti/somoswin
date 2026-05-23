package com.backend.winai.ai.pipeline.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Tunables que governam o pipeline da IA (decisor, aggregator, inflight, cooldowns).
 * Valores default e tetos físicos espelham as regras de negócio do AI Worker.
 */
@Configuration
@ConfigurationProperties(prefix = "ai.pipeline")
public class AiPipelineProperties {

    /** Janela mínima de espera por mais mensagens (s). Permitido: 5..12. */
    private int decisorMinWaitSec = 5;
    /** Janela máxima de espera por mais mensagens (s). Permitido: 5..12. */
    private int decisorMaxWaitSec = 12;
    /** Piso absoluto aplicado ao resultado do decisor (s). Permitido: 5..12. */
    private int aggregatorFloorWaitSec = 5;
    /** Teto absoluto da janela de agregação desde a primeira msg do burst (s). Permitido: até 20. */
    private int aggregatorHardCapSec = 24;
    /** Quantas mensagens recentes do histórico vão para o decisor. */
    private int decisorHistoryCount = 10;
    /** Modelo usado pelo decisor (deve ser barato/rápido). */
    private String decisorModel = "gpt-4o-mini";
    /** Modelo usado pelo merge agent (interrupt). */
    private String mergeModel = "gpt-4o-mini";

    /** Idade máxima da mensagem (do timestamp WA) para entrar na fila (ms). */
    private long publisherStaleMs = 5 * 60 * 1000L;
    /** Idade máxima da mensagem ao chegar no consumer (ms). */
    private long consumerStaleMs = 5 * 60 * 1000L;

    /** Cooldown mínimo entre respostas da IA para o mesmo contato (ms). */
    private long replyCooldownMs = 5_000L;
    /** Limite mínimo de runes para considerar um echo duplicado do usuário. */
    private int duplicateUserEchoMinRunes = 24;
    /** Idade máxima do último turno comparado para echo duplicado (ms). */
    private long duplicateUserEchoMaxAgeMs = 4 * 60 * 1000L;

    /** Iterações máximas do merge agent durante geração. */
    private int coalesceMaxIters = 24;
    /** Espera curta ao fim da geração para capturar mensagem em trânsito. */
    private int coalesceTailWaits = 6;
    /** Sleep entre tail-waits (ms). */
    private long coalesceTailSleepMs = 120L;
    /** Limite de tokens da resposta mesclada. */
    private int coalesceMergeTokens = 650;

    /** TTL do inflight (s). Resgatado mesmo se worker travar. */
    private long inflightTtlSec = 25 * 60L;
    /** TTL do dedupe wa_message_id (s). */
    private long processedWaTtlSec = 48 * 3600L;
    /** TTL de claim de enfileiramento por wa_message_id (s). */
    private long enqueueWaTtlSec = 72 * 3600L;
    /** TTL do dedupe outbound por contato (s). */
    private long outgoingSendTtlSec = 72 * 3600L;

    /** Intervalo do GC do cooldown em memória (s). */
    private long cooldownGcIntervalSec = 5 * 60L;

    /** Minutos sem mensagem para considerar conversa IA inativa e encerrar. */
    private long inactivityTimeoutMin = 24 * 60L;
    /** Cron do job de encerramento por inatividade. */
    private String inactivityCron = "0 0 * * * *";

    /** Habilita pipeline novo. Desligado falha-aberto para fluxo legado. */
    private boolean enabled = true;

    // ---------- bounded accessors ----------

    public int minWaitSec() { return clamp(decisorMinWaitSec, 5, 12); }
    public int maxWaitSec() {
        int v = clamp(decisorMaxWaitSec, 5, 12);
        return Math.max(v, minWaitSec());
    }
    public int floorWaitSec() {
        int v = clamp(aggregatorFloorWaitSec, 5, 12);
        return Math.min(v, maxWaitSec());
    }
    public int hardCapSec() {
        int v = Math.max(aggregatorHardCapSec, maxWaitSec());
        return Math.min(v, 60);
    }

    // ---------- getters/setters ----------

    public int getDecisorMinWaitSec() { return decisorMinWaitSec; }
    public void setDecisorMinWaitSec(int decisorMinWaitSec) { this.decisorMinWaitSec = decisorMinWaitSec; }

    public int getDecisorMaxWaitSec() { return decisorMaxWaitSec; }
    public void setDecisorMaxWaitSec(int decisorMaxWaitSec) { this.decisorMaxWaitSec = decisorMaxWaitSec; }

    public int getAggregatorFloorWaitSec() { return aggregatorFloorWaitSec; }
    public void setAggregatorFloorWaitSec(int aggregatorFloorWaitSec) { this.aggregatorFloorWaitSec = aggregatorFloorWaitSec; }

    public int getAggregatorHardCapSec() { return aggregatorHardCapSec; }
    public void setAggregatorHardCapSec(int aggregatorHardCapSec) { this.aggregatorHardCapSec = aggregatorHardCapSec; }

    public int getDecisorHistoryCount() { return decisorHistoryCount; }
    public void setDecisorHistoryCount(int decisorHistoryCount) { this.decisorHistoryCount = decisorHistoryCount; }

    public String getDecisorModel() { return decisorModel; }
    public void setDecisorModel(String decisorModel) { this.decisorModel = decisorModel; }

    public String getMergeModel() { return mergeModel; }
    public void setMergeModel(String mergeModel) { this.mergeModel = mergeModel; }

    public long getPublisherStaleMs() { return publisherStaleMs; }
    public void setPublisherStaleMs(long publisherStaleMs) { this.publisherStaleMs = publisherStaleMs; }

    public long getConsumerStaleMs() { return consumerStaleMs; }
    public void setConsumerStaleMs(long consumerStaleMs) { this.consumerStaleMs = consumerStaleMs; }

    public long getReplyCooldownMs() { return replyCooldownMs; }
    public void setReplyCooldownMs(long replyCooldownMs) { this.replyCooldownMs = replyCooldownMs; }

    public int getDuplicateUserEchoMinRunes() { return duplicateUserEchoMinRunes; }
    public void setDuplicateUserEchoMinRunes(int duplicateUserEchoMinRunes) { this.duplicateUserEchoMinRunes = duplicateUserEchoMinRunes; }

    public long getDuplicateUserEchoMaxAgeMs() { return duplicateUserEchoMaxAgeMs; }
    public void setDuplicateUserEchoMaxAgeMs(long duplicateUserEchoMaxAgeMs) { this.duplicateUserEchoMaxAgeMs = duplicateUserEchoMaxAgeMs; }

    public int getCoalesceMaxIters() { return coalesceMaxIters; }
    public void setCoalesceMaxIters(int coalesceMaxIters) { this.coalesceMaxIters = coalesceMaxIters; }

    public int getCoalesceTailWaits() { return coalesceTailWaits; }
    public void setCoalesceTailWaits(int coalesceTailWaits) { this.coalesceTailWaits = coalesceTailWaits; }

    public long getCoalesceTailSleepMs() { return coalesceTailSleepMs; }
    public void setCoalesceTailSleepMs(long coalesceTailSleepMs) { this.coalesceTailSleepMs = coalesceTailSleepMs; }

    public int getCoalesceMergeTokens() { return coalesceMergeTokens; }
    public void setCoalesceMergeTokens(int coalesceMergeTokens) { this.coalesceMergeTokens = coalesceMergeTokens; }

    public long getInflightTtlSec() { return inflightTtlSec; }
    public void setInflightTtlSec(long inflightTtlSec) { this.inflightTtlSec = inflightTtlSec; }

    public long getProcessedWaTtlSec() { return processedWaTtlSec; }
    public void setProcessedWaTtlSec(long processedWaTtlSec) { this.processedWaTtlSec = processedWaTtlSec; }

    public long getEnqueueWaTtlSec() { return enqueueWaTtlSec; }
    public void setEnqueueWaTtlSec(long enqueueWaTtlSec) { this.enqueueWaTtlSec = enqueueWaTtlSec; }

    public long getOutgoingSendTtlSec() { return outgoingSendTtlSec; }
    public void setOutgoingSendTtlSec(long outgoingSendTtlSec) { this.outgoingSendTtlSec = outgoingSendTtlSec; }

    public long getCooldownGcIntervalSec() { return cooldownGcIntervalSec; }
    public void setCooldownGcIntervalSec(long cooldownGcIntervalSec) { this.cooldownGcIntervalSec = cooldownGcIntervalSec; }

    public long getInactivityTimeoutMin() { return inactivityTimeoutMin; }
    public void setInactivityTimeoutMin(long inactivityTimeoutMin) { this.inactivityTimeoutMin = inactivityTimeoutMin; }

    public String getInactivityCron() { return inactivityCron; }
    public void setInactivityCron(String inactivityCron) { this.inactivityCron = inactivityCron; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    private static int clamp(int v, int lo, int hi) {
        return Math.min(Math.max(v, lo), hi);
    }
}
