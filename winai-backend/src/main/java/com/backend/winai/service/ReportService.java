package com.backend.winai.service;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.Lead;
import com.backend.winai.entity.LeadStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class ReportService {
    
    @PersistenceContext
    private EntityManager entityManager;

    private static final Map<LeadStatus, String> STATUS_LABELS = Map.of(
            LeadStatus.NEW, "Novo",
            LeadStatus.CONTACTED, "Contactado",
            LeadStatus.QUALIFIED, "Qualificado",
            LeadStatus.MEETING_SCHEDULED, "Reunião Agendada",
            LeadStatus.WON, "Ganho",
            LeadStatus.LOST, "Perdido");

    /**
     * Gera relatório Excel de leads com filtros
     */
    @Transactional(readOnly = true)
    public byte[] generateLeadsReport(Company company, LocalDate startDate, LocalDate endDate, LeadStatus status) {
        try (Workbook workbook = new XSSFWorkbook()) {
            // Criar sheet principal
            Sheet sheet = workbook.createSheet("Relatório de Leads");

            // Estilos
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle titleStyle = createTitleStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);
            CellStyle numberStyle = createNumberStyle(workbook);

            int rowNum = 0;

            // Título e informações do relatório
            Row titleRow = sheet.createRow(rowNum++);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("RELATÓRIO DE LEADS - " + company.getName());
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, 7));

            rowNum++; // Linha em branco

            // Informações do período
            Row periodRow = sheet.createRow(rowNum++);
            periodRow.createCell(0).setCellValue("Período:");
            periodRow.createCell(1).setCellValue(
                    (startDate != null ? startDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "Início") +
                    " até " +
                    (endDate != null ? endDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "Fim")
            );

            Row statusRow = sheet.createRow(rowNum++);
            statusRow.createCell(0).setCellValue("Status:");
            statusRow.createCell(1).setCellValue(status != null ? STATUS_LABELS.getOrDefault(status, status.name()) : "Todos");

            Row dateRow = sheet.createRow(rowNum++);
            dateRow.createCell(0).setCellValue("Data de Geração:");
            Cell dateCell = dateRow.createCell(1);
            dateCell.setCellValue(LocalDateTime.now());
            dateCell.setCellStyle(dateStyle);

            rowNum++; // Linha em branco

            // Cabeçalhos
            Row headerRow = sheet.createRow(rowNum++);
            String[] headers = {"ID", "Nome", "E-mail", "Telefone", "Status", "Proprietário", "Origem", "Data de Criação", "Última Atualização", "Observações"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Buscar leads com filtros usando CriteriaBuilder para evitar problemas com tipos null no PostgreSQL
            LocalDateTime startDateTime = startDate != null ? startDate.atStartOfDay() : null;
            LocalDateTime endDateTime = endDate != null ? endDate.atTime(23, 59, 59) : null;
            
            List<Lead> leads = findLeadsWithFilters(company, startDateTime, endDateTime, status);

            // Dados dos leads
            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
            for (Lead lead : leads) {
                Row row = sheet.createRow(rowNum++);
                
                row.createCell(0).setCellValue(lead.getId().toString());
                row.createCell(1).setCellValue(lead.getName());
                row.createCell(2).setCellValue(lead.getEmail());
                row.createCell(3).setCellValue(lead.getPhone() != null ? lead.getPhone() : "");
                row.createCell(4).setCellValue(STATUS_LABELS.getOrDefault(lead.getStatus(), lead.getStatus().name()));
                row.createCell(5).setCellValue(lead.getOwnerName() != null ? lead.getOwnerName() : "");
                row.createCell(6).setCellValue(lead.getSource() != null ? lead.getSource() : "");
                
                Cell createdAtCell = row.createCell(7);
                if (lead.getCreatedAt() != null) {
                    createdAtCell.setCellValue(lead.getCreatedAt().format(dateFormatter));
                    createdAtCell.setCellStyle(dateStyle);
                }
                
                Cell updatedAtCell = row.createCell(8);
                if (lead.getUpdatedAt() != null) {
                    updatedAtCell.setCellValue(lead.getUpdatedAt().format(dateFormatter));
                    updatedAtCell.setCellStyle(dateStyle);
                }
                
                row.createCell(9).setCellValue(lead.getNotes() != null ? lead.getNotes() : "");
            }

            rowNum++; // Linha em branco

            // Estatísticas
            Row statsTitleRow = sheet.createRow(rowNum++);
            Cell statsTitleCell = statsTitleRow.createCell(0);
            statsTitleCell.setCellValue("ESTATÍSTICAS");
            statsTitleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowNum - 1, rowNum - 1, 0, 2));

            // Contar por status
            Map<LeadStatus, Long> statusCounts = leads.stream()
                    .collect(java.util.stream.Collectors.groupingBy(Lead::getStatus, java.util.stream.Collectors.counting()));

            rowNum++; // Linha em branco
            Row totalRow = sheet.createRow(rowNum++);
            totalRow.createCell(0).setCellValue("Total de Leads:");
            Cell totalCell = totalRow.createCell(1);
            totalCell.setCellValue(leads.size());
            totalCell.setCellStyle(numberStyle);

            for (Map.Entry<LeadStatus, Long> entry : statusCounts.entrySet()) {
                Row statusCountRow = sheet.createRow(rowNum++);
                statusCountRow.createCell(0).setCellValue(STATUS_LABELS.getOrDefault(entry.getKey(), entry.getKey().name()) + ":");
                Cell countCell = statusCountRow.createCell(1);
                countCell.setCellValue(entry.getValue());
                countCell.setCellStyle(numberStyle);
            }

            // Ajustar largura das colunas
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
                // Limitar largura máxima
                if (sheet.getColumnWidth(i) > 15000) {
                    sheet.setColumnWidth(i, 15000);
                }
            }

            // Converter para byte array
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            return outputStream.toByteArray();

        } catch (IOException e) {
            log.error("Erro ao gerar relatório Excel", e);
            throw new RuntimeException("Erro ao gerar relatório Excel", e);
        }
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 11);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREEN.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle createTitleStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 14);
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.LEFT);
        return style;
    }

    private CellStyle createDateStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        DataFormat format = workbook.createDataFormat();
        style.setDataFormat(format.getFormat("dd/mm/yyyy hh:mm"));
        return style;
    }

    private CellStyle createNumberStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setAlignment(HorizontalAlignment.RIGHT);
        return style;
    }

    /**
     * Busca leads com filtros usando CriteriaBuilder para evitar problemas com tipos null no PostgreSQL
     */
    private List<Lead> findLeadsWithFilters(Company company, LocalDateTime startDate, LocalDateTime endDate, LeadStatus status) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Lead> query = cb.createQuery(Lead.class);
        Root<Lead> root = query.from(Lead.class);

        List<Predicate> predicates = new ArrayList<>();
        
        // Sempre filtrar por company
        predicates.add(cb.equal(root.get("company"), company));
        
        // Adicionar filtros condicionalmente
        if (startDate != null) {
            predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDate));
        }
        
        if (endDate != null) {
            predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endDate));
        }
        
        if (status != null) {
            predicates.add(cb.equal(root.get("status"), status));
        }
        
        query.where(predicates.toArray(new Predicate[0]));
        query.orderBy(cb.desc(root.get("createdAt")));
        
        return entityManager.createQuery(query).getResultList();
    }
}

