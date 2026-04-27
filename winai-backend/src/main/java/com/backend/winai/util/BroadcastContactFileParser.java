package com.backend.winai.util;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Planilhas CSV/TXT ou XLSX: coluna única (telefone bruto) ou três colunas DDI, DDD, telefone.
 * Cabeçalho opcional na primeira linha (ex.: ddi, ddd, telefone).
 */
public final class BroadcastContactFileParser {

    private static final DataFormatter FORMATTER = new DataFormatter();
    private static final Pattern HAS_DIGIT = Pattern.compile("\\d");

    private BroadcastContactFileParser() {}

    /** @deprecated use {@link #parseToE164Lines} — mantém o mesmo comportamento (já normalizado). */
    @Deprecated
    public static List<String> extractRawLines(byte[] bytes, String filename) {
        return new ArrayList<>(parseToE164Lines(bytes, filename));
    }

    /**
     * Extrai números únicos já normalizados (somente dígitos, ex. 5511999999999).
     */
    public static List<String> parseToE164Lines(byte[] bytes, String filename) {
        if (bytes == null || bytes.length == 0) {
            return List.of();
        }
        String name = filename != null ? filename.toLowerCase(Locale.ROOT) : "";
        Set<String> seen = new LinkedHashSet<>();
        if (name.endsWith(".csv") || name.endsWith(".txt")) {
            addFromDelimitedText(new String(bytes, StandardCharsets.UTF_8), seen, true);
        } else if (name.endsWith(".xlsx")) {
            addFromXlsx(bytes, seen);
        } else {
            throw new IllegalArgumentException("Formato não suportado. Use .csv, .txt ou .xlsx");
        }
        return new ArrayList<>(seen);
    }

    private static void addFromDelimitedText(String text, Set<String> seen, boolean detectHeaderOnFirstLine) {
        String[] lines = text.split("\\R");
        boolean first = detectHeaderOnFirstLine;
        for (String line : lines) {
            if (line == null || line.isBlank()) {
                continue;
            }
            String[] parts = line.split("[;,\t]");
            for (int i = 0; i < parts.length; i++) {
                parts[i] = parts[i].trim();
            }
            if (first && parts.length >= 3 && rowLooksLikeHeader(parts[0], parts[1], parts[2])) {
                first = false;
                continue;
            }
            first = false;
            addLineParts(seen, parts);
        }
    }

    private static void addFromXlsx(byte[] bytes, Set<String> seen) {
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            Sheet sheet = wb.getNumberOfSheets() > 0 ? wb.getSheetAt(0) : null;
            if (sheet == null) {
                return;
            }
            boolean firstRow = true;
            for (Row row : sheet) {
                if (row == null) {
                    continue;
                }
                String c0 = cellTrim(row.getCell(0));
                String c1 = cellTrim(row.getCell(1));
                String c2 = cellTrim(row.getCell(2));
                if (c0.isEmpty() && c1.isEmpty() && c2.isEmpty()) {
                    continue;
                }
                if (firstRow && rowLooksLikeHeader(c0, c1, c2)) {
                    firstRow = false;
                    continue;
                }
                firstRow = false;
                if (!c1.isEmpty() || !c2.isEmpty()) {
                    String e164 = BroadcastPhoneParser.normalizeStructured(c0, c1, c2);
                    if (e164 != null) {
                        seen.add(e164);
                    }
                } else if (!c0.isEmpty()) {
                    String e164 = BroadcastPhoneParser.normalize(c0);
                    if (e164 != null) {
                        seen.add(e164);
                    }
                }
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Não foi possível ler o Excel: " + e.getMessage(), e);
        }
    }

    private static void addLineParts(Set<String> seen, String[] parts) {
        if (parts.length >= 3 && (!parts[1].isEmpty() || !parts[2].isEmpty())) {
            String e164 = BroadcastPhoneParser.normalizeStructured(parts[0], parts[1], parts[2]);
            if (e164 != null) {
                seen.add(e164);
            }
            return;
        }
        if (parts.length > 0 && !parts[0].isEmpty()) {
            String e164 = BroadcastPhoneParser.normalize(parts[0]);
            if (e164 != null) {
                seen.add(e164);
            }
        }
    }

    private static boolean rowLooksLikeHeader(String a, String b, String c) {
        if (a.isEmpty()) {
            return false;
        }
        if (HAS_DIGIT.matcher(a + b + c).find()) {
            return false;
        }
        String la = a.toLowerCase(Locale.ROOT);
        String lb = b.toLowerCase(Locale.ROOT);
        String lc = c.toLowerCase(Locale.ROOT);
        return la.contains("ddi") && lb.contains("ddd") && (lc.contains("telefone") || lc.contains("celular") || lc.contains("fone"));
    }

    private static String cellTrim(Cell c) {
        if (c == null) {
            return "";
        }
        return FORMATTER.formatCellValue(c).trim();
    }
}
