package com.backend.winai.util;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class AgentDocumentAttachParser {

    private static final Pattern TAG = Pattern.compile(
            "(?i)[`*_\"'\\[(]{0,3}\\s*ATTACH[\\s_-]?DOC\\s*[:=]\\s*[`*_\"']{0,2}\\s*([0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12})\\s*[`*_\"'\\])]{0,3}[.,;!?]?");

    private AgentDocumentAttachParser() {}

    public record Result(String visibleText, Optional<UUID> attachDocumentId, List<UUID> attachDocumentIds) {}

    public static Result parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return new Result("", Optional.empty(), List.of());
        }

        Matcher matcher = TAG.matcher(raw);
        Set<UUID> collected = new LinkedHashSet<>();
        while (matcher.find()) {
            UUID id = tryParseUuid(matcher.group(1));
            if (id != null) {
                collected.add(id);
            }
        }

        if (collected.isEmpty()) {
            return new Result(raw.trim(), Optional.empty(), List.of());
        }

        String cleaned = TAG.matcher(raw).replaceAll(" ");
        cleaned = cleaned.replaceAll("[ \\t]+\\R", "\n");
        cleaned = cleaned.replaceAll("\\R{3,}", "\n\n");
        cleaned = cleaned.replaceAll("[ \\t]{2,}", " ");
        cleaned = cleaned.trim();

        List<UUID> all = new ArrayList<>(collected);
        return new Result(cleaned, Optional.of(all.get(0)), List.copyOf(all));
    }

    private static UUID tryParseUuid(String hex) {
        if (hex == null) return null;
        String compact = hex.replace("-", "");
        if (compact.length() != 32) return null;
        try {
            String dashed = compact.substring(0, 8) + "-"
                    + compact.substring(8, 12) + "-"
                    + compact.substring(12, 16) + "-"
                    + compact.substring(16, 20) + "-"
                    + compact.substring(20);
            return UUID.fromString(dashed);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
