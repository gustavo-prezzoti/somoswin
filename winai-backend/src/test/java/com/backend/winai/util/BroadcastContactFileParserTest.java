package com.backend.winai.util;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BroadcastContactFileParserTest {

    @Test
    void csvFirstColumnPerLine() {
        String csv = "5511999999999\n5511888888888;nome\n";
        List<String> lines = BroadcastContactFileParser.extractRawLines(
                csv.getBytes(StandardCharsets.UTF_8), "contatos.csv");
        assertEquals(2, lines.size());
        assertEquals("5511999999999", lines.get(0));
        assertEquals("5511888888888", lines.get(1));
    }

    @Test
    void xlsxFirstColumn() throws Exception {
        byte[] xlsx;
        try (org.apache.poi.xssf.usermodel.XSSFWorkbook wb = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            var sheet = wb.createSheet();
            var r0 = sheet.createRow(0);
            r0.createCell(0).setCellValue("5511777777777");
            var r1 = sheet.createRow(1);
            r1.createCell(0).setCellValue("5511666666666");
            java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
            wb.write(bos);
            xlsx = bos.toByteArray();
        }
        List<String> lines = BroadcastContactFileParser.extractRawLines(xlsx, "lista.xlsx");
        assertEquals(2, lines.size());
        assertTrue(lines.contains("5511777777777"));
        assertTrue(lines.contains("5511666666666"));
    }
}
