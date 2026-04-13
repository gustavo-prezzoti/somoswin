package com.backend.winai.util;

import lombok.Builder;
import lombok.Value;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extrai parâmetros UTM de texto de mensagem (URL ou query solta).
 */
public final class UtmParseUtil {

    private static final Pattern PAIR = Pattern.compile(
            "(?:[?&]|^)(utm_source|utm_medium|utm_campaign|utm_content|utm_term)=([^&#\\s]+)",
            Pattern.CASE_INSENSITIVE);

    private UtmParseUtil() {
    }

    public static Optional<UtmSnapshot> parseFromText(String text) {
        if (text == null || text.isBlank()) {
            return Optional.empty();
        }
        Map<String, String> map = new LinkedHashMap<>();
        Matcher m = PAIR.matcher(text);
        while (m.find()) {
            String key = m.group(1).toLowerCase();
            String raw = m.group(2);
            try {
                map.put(key, URLDecoder.decode(raw, StandardCharsets.UTF_8));
            } catch (Exception e) {
                map.put(key, raw);
            }
        }
        if (map.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(UtmSnapshot.builder()
                .utmSource(map.get("utm_source"))
                .utmMedium(map.get("utm_medium"))
                .utmCampaign(map.get("utm_campaign"))
                .utmContent(map.get("utm_content"))
                .utmTerm(map.get("utm_term"))
                .build());
    }

    @Value
    @Builder
    public static class UtmSnapshot {
        String utmSource;
        String utmMedium;
        String utmCampaign;
        String utmContent;
        String utmTerm;
    }
}
