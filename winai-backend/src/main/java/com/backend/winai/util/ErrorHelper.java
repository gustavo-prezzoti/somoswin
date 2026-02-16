package com.backend.winai.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class ErrorHelper {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private ErrorHelper() {
    }

    public static String normalizeMessage(String rawMessage) {
        if (rawMessage == null || rawMessage.isBlank()) {
            return "Erro desconhecido";
        }
        String asaas = extractAsaasError(rawMessage);
        if (asaas != null) return asaas;
        String jsonErrors = extractJsonErrors(rawMessage);
        if (jsonErrors != null) return jsonErrors;
        return cleanMessage(rawMessage);
    }

    private static String extractAsaasError(String raw) {
        try {
            int start = raw.indexOf("{\"errors\"");
            if (start < 0) start = raw.indexOf("{\"error\"");
            if (start < 0) return null;
            int depth = 0;
            int end = -1;
            for (int i = start; i < raw.length(); i++) {
                char c = raw.charAt(i);
                if (c == '{') depth++;
                else if (c == '}') {
                    depth--;
                    if (depth == 0) {
                        end = i;
                        break;
                    }
                }
            }
            if (end < 0) return null;
            String json = raw.substring(start, end + 1);
            JsonNode root = MAPPER.readTree(json);
            JsonNode errors = root.get("errors");
            if (errors != null && errors.isArray() && errors.size() > 0) {
                JsonNode first = errors.get(0);
                String desc = first.has("description") ? first.get("description").asText() : null;
                if (desc != null && !desc.isBlank()) return desc;
            }
            JsonNode error = root.get("error");
            if (error != null && error.isObject() && error.has("description")) {
                return error.get("description").asText();
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private static String extractJsonErrors(String raw) {
        Pattern p = Pattern.compile("\"description\"\\s*:\\s*\"([^\"]+)\"");
        Matcher m = p.matcher(raw);
        if (m.find()) return m.group(1);
        return null;
    }

    private static String cleanMessage(String msg) {
        if (msg.length() > 300) {
            return msg.substring(0, 297) + "...";
        }
        return msg;
    }
}
