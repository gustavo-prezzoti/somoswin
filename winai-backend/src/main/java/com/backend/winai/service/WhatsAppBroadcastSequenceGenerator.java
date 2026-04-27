package com.backend.winai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Gera a sequência de textos para remarketing (N mensagens entre 5 e 10) a partir do prompt da empresa
 * e da primeira mensagem. Usa OpenAI quando disponível; caso contrário, fallback determinístico.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppBroadcastSequenceGenerator {

    private final OpenAiService openAiService;
    private final ObjectMapper objectMapper;

    public List<String> generateSequence(int n, String companyPrompt, String anchorMessage) {
        if (n < 1) {
            throw new IllegalArgumentException("n deve ser >= 1");
        }
        String rules = companyPrompt == null ? "" : companyPrompt.trim();
        String anchor = anchorMessage == null ? "" : anchorMessage.trim();
        if (anchor.isEmpty()) {
            return fallbackSequence(n, "Olá! Tudo bem?");
        }
        try {
            String system = """
                    Você gera sequências de mensagens curtas para WhatsApp (remarketing), em português do Brasil.
                    Responda APENAS com um JSON array de strings, sem markdown, sem texto extra.
                    Cada string é uma mensagem; mantenha tom natural, sem spam, respeitando as regras do usuário.
                    A primeira mensagem da sequência deve ser fiel à âncora fornecida (pode ajustar pontuação mínima).
                    As demais continuam o fluxo de forma coerente, sem repetir literalmente a mesma frase.""";
            String user = String.format(
                    "Quantidade exata de mensagens: %d\nRegras da empresa:\n%s\n\nPrimeira mensagem (âncora):\n%s",
                    n, rules.isEmpty() ? "(nenhuma regra extra)" : rules, anchor);
            String raw = openAiService.generateResponse(system, user);
            if (raw != null) {
                String trimmed = raw.trim();
                if (trimmed.startsWith("```")) {
                    int start = trimmed.indexOf('[');
                    int end = trimmed.lastIndexOf(']');
                    if (start >= 0 && end > start) {
                        trimmed = trimmed.substring(start, end + 1);
                    }
                }
                List<String> parsed = objectMapper.readValue(trimmed, new TypeReference<>() {});
                if (parsed != null && parsed.size() == n) {
                    List<String> cleaned = new ArrayList<>();
                    for (String s : parsed) {
                        if (s == null || s.isBlank()) {
                            throw new IllegalArgumentException("mensagem vazia");
                        }
                        cleaned.add(s.trim());
                    }
                    return cleaned;
                }
            }
        } catch (Exception e) {
            log.warn("[BroadcastSequence] IA indisponível ou JSON inválido: {}", e.getMessage());
        }
        return fallbackSequence(n, anchor);
    }

    private static List<String> fallbackSequence(int n, String anchor) {
        List<String> out = new ArrayList<>(n);
        out.add(anchor);
        for (int i = 1; i < n; i++) {
            out.add(anchor + "\n\n(" + (i + 1) + "/" + n + ")");
        }
        return out;
    }
}
