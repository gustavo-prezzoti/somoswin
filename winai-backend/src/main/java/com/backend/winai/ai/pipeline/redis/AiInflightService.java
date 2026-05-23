package com.backend.winai.ai.pipeline.redis;

import com.backend.winai.ai.pipeline.config.AiPipelineProperties;
import com.backend.winai.ai.pipeline.model.AiPayload;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import lombok.extern.slf4j.Slf4j;

/**
 * Camada Redis para a coordenação entre publisher e consumer da IA.
 *
 * Regras implementadas (espelha redisx/ai_inflight.go do AI Worker):
 *  - NO MÁXIMO UM job de IA em voo por (sector, contact).
 *  - Mensagens novas que chegam durante a geração viram RPUSH no buffer.
 *  - Após a resposta da IA, fazemos release + drain do buffer em ÚMA chamada.
 *  - Dedupe por wa_message_id (entre réplicas) com TTL longo.
 *  - Fail-open em erro de Redis para não derrubar o webhook.
 */
@Service
@Slf4j
public class AiInflightService {

    private final StringRedisTemplate redis;
    private final AiPipelineProperties props;
    private final ObjectMapper mapper;

    public AiInflightService(StringRedisTemplate redis, AiPipelineProperties props) {
        this.redis = redis;
        this.props = props;
        this.mapper = new ObjectMapper();
    }

    /**
     * Tenta claim do inflight. Retorna true se este é o ÚNICO job em voo agora
     * e pode publicar/processar. False se já existe um inflight ativo (caller
     * deve então usar {@link #pushBuffer(String, String, AiPayload)}).
     *
     * Fail-open: em erro de Redis, retorna true para não bloquear o pipeline.
     */
    public boolean tryClaimInflight(String sector, String contact) {
        try {
            String key = AiRedisKeys.inflight(sector, contact);
            Boolean ok = redis.opsForValue()
                    .setIfAbsent(key, String.valueOf(System.currentTimeMillis()),
                            Duration.ofSeconds(props.getInflightTtlSec()));
            return Boolean.TRUE.equals(ok);
        } catch (RedisConnectionFailureException e) {
            log.warn("Redis indisponível em tryClaimInflight: {}", e.getMessage());
            return true;
        } catch (Exception e) {
            log.warn("Erro em tryClaimInflight: {}", e.getMessage());
            return true;
        }
    }

    /**
     * Empurra um payload para o buffer FIFO daquele contato. Usado quando
     * tryClaimInflight retornou false (já existe job em voo).
     */
    public void pushBuffer(String sector, String contact, AiPayload payload) {
        try {
            String key = AiRedisKeys.buffer(sector, contact);
            redis.opsForList().rightPush(key, serialize(payload));
            redis.expire(key, Duration.ofSeconds(props.getInflightTtlSec()));
        } catch (Exception e) {
            log.warn("Erro ao bufferizar payload: {}", e.getMessage());
        }
    }

    /**
     * Lê (sem remover) os payloads atualmente bufferizados.
     * Usado pelo coalesce-interrupt durante a geração do GPT.
     */
    public List<AiPayload> peekBuffer(String sector, String contact) {
        try {
            String key = AiRedisKeys.buffer(sector, contact);
            List<String> raw = redis.opsForList().range(key, 0, -1);
            if (raw == null || raw.isEmpty()) return Collections.emptyList();
            List<AiPayload> out = new ArrayList<>(raw.size());
            for (String s : raw) {
                AiPayload p = deserialize(s);
                if (p != null) out.add(p);
            }
            return out;
        } catch (Exception e) {
            log.warn("Erro peekBuffer: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Faz POP de TODOS os payloads no buffer (LPOP em loop). Não toca no inflight.
     */
    public List<AiPayload> drainBuffer(String sector, String contact) {
        try {
            String key = AiRedisKeys.buffer(sector, contact);
            List<AiPayload> out = new ArrayList<>();
            while (true) {
                String s = redis.opsForList().leftPop(key);
                if (s == null) break;
                AiPayload p = deserialize(s);
                if (p != null) out.add(p);
            }
            return out;
        } catch (Exception e) {
            log.warn("Erro drainBuffer: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Libera o inflight E retorna todos os payloads acumulados no buffer
     * durante o processamento. Equivalente ao ReleaseAIInflightAndDrainBuffer
     * do AI Worker original.
     */
    public List<AiPayload> releaseInflightAndDrain(String sector, String contact) {
        List<AiPayload> drained = drainBuffer(sector, contact);
        try {
            redis.delete(AiRedisKeys.inflight(sector, contact));
        } catch (Exception e) {
            log.warn("Erro liberando inflight {}/{}: {}", sector, contact, e.getMessage());
        }
        return drained;
    }

    /**
     * Claim atômico de wa_message_id (dedupe entre réplicas). True se este é o
     * primeiro processamento; false se outra réplica já processou.
     */
    public boolean tryClaimProcessedWa(String sector, String waMessageId) {
        if (waMessageId == null || waMessageId.isBlank()) return true;
        try {
            String key = AiRedisKeys.processedWa(sector, waMessageId);
            Boolean ok = redis.opsForValue().setIfAbsent(key, "1",
                    Duration.ofSeconds(props.getProcessedWaTtlSec()));
            return Boolean.TRUE.equals(ok);
        } catch (Exception e) {
            log.warn("tryClaimProcessedWa: {}", e.getMessage());
            return true;
        }
    }

    /**
     * Claim atômico no publisher por wa_message_id (evita reenfileirar webhook
     * duplicado).
     */
    public boolean tryClaimEnqueueWa(String sector, String waMessageId) {
        if (waMessageId == null || waMessageId.isBlank()) return true;
        try {
            String key = AiRedisKeys.enqueueWa(sector, waMessageId);
            Boolean ok = redis.opsForValue().setIfAbsent(key, "1",
                    Duration.ofSeconds(props.getEnqueueWaTtlSec()));
            return Boolean.TRUE.equals(ok);
        } catch (Exception e) {
            log.warn("tryClaimEnqueueWa: {}", e.getMessage());
            return true;
        }
    }

    /**
     * Cooldown distribuído entre réplicas para outbound do mesmo contato.
     * Apenas o primeiro a registrar pode enviar; demais ignoram para evitar
     * rajada.
     */
    public boolean tryRegisterOutboundCooldown(String sector, String contact, long cooldownMs) {
        try {
            String key = AiRedisKeys.outgoingSend(sector, contact);
            Boolean ok = redis.opsForValue().setIfAbsent(key,
                    String.valueOf(System.currentTimeMillis()),
                    Duration.ofMillis(Math.max(1_000L, cooldownMs)));
            return Boolean.TRUE.equals(ok);
        } catch (Exception e) {
            log.warn("tryRegisterOutboundCooldown: {}", e.getMessage());
            return true;
        }
    }

    private String serialize(AiPayload payload) {
        try {
            return mapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Falha ao serializar AiPayload", e);
        }
    }

    private AiPayload deserialize(String raw) {
        try {
            return mapper.readValue(raw, AiPayload.class);
        } catch (Exception e) {
            log.warn("Payload no buffer corrompido, ignorando: {}", e.getMessage());
            return null;
        }
    }
}
