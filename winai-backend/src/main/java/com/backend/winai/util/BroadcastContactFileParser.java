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
import java.util.List;

/**
 * Extrai texto bruto de planilhas (CSV/TXT ou XLSX) para normalização em {@link BroadcastPhoneParser}.
 */
public final class BroadcastContactFileParser {

    private static final DataFormatter FORMATTER = new DataFormatter();

    private BroadcastContactFileParser() {}

    public static List<String> extractRawLines(byte[] bytes, String filename) {
        if (bytes == null || bytes.length == 0) {
            return List.of();
        }
        String name = filename != null ? filename.toLowerCase() : "";
        if (name.endsWith(".csv") || name.endsWith(".txt")) {
            return extractFromDelimitedText(new String(bytes, StandardCharsets.UTF_8));
        }
        if (name.endsWith(".xlsx")) {
            return extractFromXlsx(bytes);
        }
        throw new IllegalArgumentException("Formato não suportado. Use .csv, .txt ou .xlsx");
    }

    private static List<String> extractFromDelimitedText(String text) {
        List<String> out = new ArrayList<>();
        for (String line : text.split("\\R")) {
            if (line == null || line.isBlank()) {
                continue;
            }
            String[] parts = line.split("[;,\t]");
            String first = parts[0].trim();
            if (!first.isEmpty()) {
                out.add(first);
            }
        }
        return out;
    }

    private static List<String> extractFromXlsx(byte[] bytes) {
        List<String> out = new ArrayList<>();
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            Sheet sheet = wb.getNumberOfSheets() > 0 ? wb.getSheetAt(0) : null;
            if (sheet == null) {
                return out;
            }
            for (Row row : sheet) {
                if (row == null) {
                    continue;
                }
                Cell c = row.getCell(0);
                if (c == null) {
                    continue;
                }
                String v = FORMATTER.formatCellValue(c).trim();
                if (!v.isEmpty()) {
                    out.add(v);
                }
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Não foi possível ler o Excel: " + e.getMessage(), e);
        }
        return out;
    }
}
