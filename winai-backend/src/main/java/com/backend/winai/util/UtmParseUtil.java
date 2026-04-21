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
 * Extrai parâmetros UTM e click ids (gclid, fbclid, msclkid) de texto de mensagem (URL ou query solta).
 */
public final class UtmParseUtil {

    private static final Pattern UTM_PAIR = Pattern.compile(
            "(?:[?&]|^)(utm_source|utm_medium|utm_campaign|utm_content|utm_term)=([^&#\\s]+)",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern CLICK_PAIR = Pattern.compile(
            "(?:[?&]|^)(gclid|fbclid|msclkid)=([^&#\\s]+)",
            Pattern.CASE_INSENSITIVE);

    private UtmParseUtil() {
    }

    public static Optional<UtmSnapshot> parseFromText(String text) {
        if (text == null || text.isBlank()) {
            return Optional.empty();
        }
        Map<String, String> utmMap = new LinkedHashMap<>();
        Matcher utm = UTM_PAIR.matcher(text);
        while (utm.find()) {
            putDecoded(utmMap, utm.group(1).toLowerCase(), utm.group(2));
        }
        Map<String, String> clickMap = new LinkedHashMap<>();
        Matcher clk = CLICK_PAIR.matcher(text);
        while (clk.find()) {
            putDecoded(clickMap, clk.group(1).toLowerCase(), clk.group(2));
        }
        if (utmMap.isEmpty() && clickMap.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(UtmSnapshot.builder()
                .utmSource(utmMap.get("utm_source"))
                .utmMedium(utmMap.get("utm_medium"))
                .utmCampaign(utmMap.get("utm_campaign"))
                .utmContent(utmMap.get("utm_content"))
                .utmTerm(utmMap.get("utm_term"))
                .gclid(clickMap.get("gclid"))
                .fbclid(clickMap.get("fbclid"))
                .msclkid(clickMap.get("msclkid"))
                .build());
    }

    private static void putDecoded(Map<String, String> map, String key, String raw) {
        try {
            map.put(key, URLDecoder.decode(raw, StandardCharsets.UTF_8));
        } catch (Exception e) {
            map.put(key, raw);
        }
    }

    @Value
    @Builder
    public static class UtmSnapshot {
        String utmSource;
        String utmMedium;
        String utmCampaign;
        String utmContent;
        String utmTerm;
        String gclid;
        String fbclid;
        String msclkid;
    }
}
