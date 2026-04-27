package com.backend.winai.util;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Normaliza telefones para envio UaZap (apenas dígitos, preferência DDI 55).
 */
public final class BroadcastPhoneParser {

    private static final Pattern DIGITS = Pattern.compile("\\D+");

    private BroadcastPhoneParser() {}

    /**
     * Monta E.164 em dígitos a partir de DDI, DDD e número (Brasil: DDI 55, DDD com 2 dígitos, celular 9 dígitos começando em 9).
     * Retorna null se inválido.
     */
    public static String normalizeStructured(String ddiRaw, String dddRaw, String numberRaw) {
        String ddi = ddiRaw == null ? "" : DIGITS.matcher(ddiRaw.trim()).replaceAll("");
        String ddd = dddRaw == null ? "" : DIGITS.matcher(dddRaw.trim()).replaceAll("");
        String num = numberRaw == null ? "" : DIGITS.matcher(numberRaw.trim()).replaceAll("");
        if (ddi.isEmpty()) {
            ddi = "55";
        }
        if ("55".equals(ddi)) {
            if (ddd.length() != 2) {
                return null;
            }
            if (num.length() != 8 && num.length() != 9) {
                return null;
            }
            if (num.length() == 9 && num.charAt(0) != '9') {
                return null;
            }
            return ddi + ddd + num;
        }
        if (ddi.length() < 1 || num.length() < 6) {
            return null;
        }
        String combined = ddi + ddd + num;
        if (combined.length() < 12 || combined.length() > 15) {
            return null;
        }
        return combined;
    }

    /** Retorna null se inválido; caso contrário só dígitos (ex.: 5511999999999). */
    public static String normalize(String raw) {
        if (raw == null) {
            return null;
        }
        String digits = DIGITS.matcher(raw.trim()).replaceAll("");
        if (digits.isEmpty()) {
            return null;
        }
        if (digits.length() == 11 && !digits.startsWith("55")) {
            digits = "55" + digits;
        } else if (digits.length() == 10 && digits.charAt(0) != '0') {
            digits = "55" + digits;
        }
        if (digits.length() < 12 || digits.length() > 15) {
            return null;
        }
        return digits;
    }

    public static List<String> parseLinesDedupe(Iterable<String> lines) {
        Set<String> seen = new LinkedHashSet<>();
        List<String> out = new ArrayList<>();
        for (String line : lines) {
            if (line == null) {
                continue;
            }
            String n = normalize(line);
            if (n != null && seen.add(n)) {
                out.add(n);
            }
        }
        return out;
    }
}
