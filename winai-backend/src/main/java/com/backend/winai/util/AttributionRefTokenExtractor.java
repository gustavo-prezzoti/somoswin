package com.backend.winai.util;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extrai código opaco da mensagem (ref: / sw_ref: / amplia_ref:).
 * Formato alinhado ao token Base64-URL gerado no backend.
 */
public final class AttributionRefTokenExtractor {

    private static final Pattern REF = Pattern.compile(
            "(?i)(?:^|[\\s?&])(?:ref|sw_ref|amplia_ref)\\s*[:=]\\s*([A-Za-z0-9_-]{10,24})(?=\\s|$|[^A-Za-z0-9_-])");

    private AttributionRefTokenExtractor() {
    }

    public static Optional<String> findPublicToken(String text) {
        if (text == null || text.isBlank()) {
            return Optional.empty();
        }
        Matcher m = REF.matcher(text);
        if (m.find()) {
            return Optional.of(m.group(1));
        }
        return Optional.empty();
    }
}
