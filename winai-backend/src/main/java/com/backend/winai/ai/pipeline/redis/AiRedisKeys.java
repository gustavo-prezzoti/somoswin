package com.backend.winai.ai.pipeline.redis;

/**
 * Namespace central das chaves Redis usadas pelo pipeline da IA.
 * Padrão: {@code winai:ai:<scope>:v1:<sector>:<id>}
 *
 * Manter aqui o controle de versão de schema das chaves — qualquer mudança de
 * formato deve incrementar a versão para evitar leitura de dados antigos.
 */
public final class AiRedisKeys {

    private AiRedisKeys() {}

    private static final String PREFIX = "winai:ai";
    private static final String V = "v1";

    /** UM inflight job por (sector, contact) ao mesmo tempo. SETNX. */
    public static String inflight(String sector, String contact) {
        return PREFIX + ":inflight:" + V + ":" + safe(sector) + ":" + safe(contact);
    }

    /** Lista FIFO (RPUSH) de payloads recebidos enquanto inflight estava ativo. */
    public static String buffer(String sector, String contact) {
        return PREFIX + ":buffer:" + V + ":" + safe(sector) + ":" + safe(contact);
    }

    /** Dedup distribuído por wa_message_id processado (entre réplicas). */
    public static String processedWa(String sector, String waMessageId) {
        return PREFIX + ":processed_wa:" + V + ":" + safe(sector) + ":" + safe(waMessageId);
    }

    /** Dedup distribuído por wa_message_id já enfileirado (publisher). */
    public static String enqueueWa(String sector, String waMessageId) {
        return PREFIX + ":enqueue_wa:" + V + ":" + safe(sector) + ":" + safe(waMessageId);
    }

    /** Dedup outbound por contato (anti-rajada distribuída entre réplicas). */
    public static String outgoingSend(String sector, String contact) {
        return PREFIX + ":outgoing_send:" + V + ":" + safe(sector) + ":" + safe(contact);
    }

    private static String safe(String s) {
        if (s == null || s.isBlank()) return "_";
        return s.replace(' ', '_').replace(':', '_');
    }
}
