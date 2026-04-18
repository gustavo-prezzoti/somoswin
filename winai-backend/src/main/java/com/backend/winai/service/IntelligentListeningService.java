package com.backend.winai.service;

import com.backend.winai.dto.request.IntelligentListeningAiSummaryRequest;
import com.backend.winai.dto.request.IntelligentListeningStartRequest;
import com.backend.winai.dto.request.IntelligentListeningTranscriptRequest;
import com.backend.winai.dto.response.IntelligentListeningSessionResponse;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.Lead;
import com.backend.winai.entity.Meeting;
import com.backend.winai.entity.MeetingKind;
import com.backend.winai.entity.MeetingStatus;
import com.backend.winai.repository.LeadRepository;
import com.backend.winai.repository.MeetingRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class IntelligentListeningService {

    private static final DateTimeFormatter CRM_TS = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    /** Taxa de referência USD→BRL quando a IA informa só valor_mencionado_usd ou para conferência. */
    private static final BigDecimal USD_BRL_REFERENCE_RATE = new BigDecimal("5.50");

    private final MeetingRepository meetingRepository;
    private final LeadRepository leadRepository;
    private final OpenAiService openAiService;
    private final ObjectMapper objectMapper;

    private static final Map<MeetingStatus, String> STATUS_LABELS = Map.of(
            MeetingStatus.SCHEDULED, "Agendada",
            MeetingStatus.CONFIRMED, "Em andamento",
            MeetingStatus.COMPLETED, "Concluída",
            MeetingStatus.NO_SHOW, "Não compareceu",
            MeetingStatus.CANCELLED, "Cancelada",
            MeetingStatus.RESCHEDULED, "Reagendada");

    @Transactional
    public IntelligentListeningSessionResponse startSession(Company company, IntelligentListeningStartRequest request) {
        Lead lead = leadRepository.findByIdAndCompany(request.getLeadId(), company)
                .orElseThrow(() -> new RuntimeException("Lead não encontrado"));

        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();
        String title = request.getTitle() != null && !request.getTitle().isBlank()
                ? request.getTitle().trim()
                : "Escuta Inteligente — " + lead.getName();

        Meeting m = Meeting.builder()
                .company(company)
                .lead(lead)
                .title(title)
                .contactName(lead.getName())
                .contactEmail(lead.getEmail())
                .contactPhone(lead.getPhone())
                .meetingDate(today)
                .meetingTime(now)
                .durationMinutes(180)
                .status(MeetingStatus.CONFIRMED)
                .meetingKind(MeetingKind.INTELLIGENT_LISTENING)
                .scheduledBy("Escuta Inteligente")
                .notes("Sessão criada na plataforma — associe microfone e áudio do sistema ao gravar.")
                .build();

        m = meetingRepository.save(m);
        log.info("Escuta inteligente criada: {} para lead {}", m.getId(), lead.getId());
        return toResponse(m);
    }

    public List<IntelligentListeningSessionResponse> listByLead(Company company, UUID leadId) {
        leadRepository.findByIdAndCompany(leadId, company)
                .orElseThrow(() -> new RuntimeException("Lead não encontrado"));
        return meetingRepository
                .findByCompanyAndLead_IdAndMeetingKindOrderByCreatedAtDesc(company, leadId,
                        MeetingKind.INTELLIGENT_LISTENING)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public IntelligentListeningSessionResponse getSession(Company company, UUID sessionId) {
        return toResponse(loadIntelligentListening(company, sessionId));
    }

    @Transactional
    public IntelligentListeningSessionResponse patchTranscription(Company company, UUID sessionId,
            IntelligentListeningTranscriptRequest body) {
        Meeting m = loadIntelligentListening(company, sessionId);
        if (body.getTranscriptionFull() != null) {
            String t = body.getTranscriptionFull().trim();
            m.setTranscriptionFull(t.isEmpty() ? null : t);
        }
        m = meetingRepository.save(m);
        return toResponse(m);
    }

    @Transactional
    public IntelligentListeningSessionResponse patchAiSummary(Company company, UUID sessionId,
            IntelligentListeningAiSummaryRequest body) {
        Meeting m = loadIntelligentListening(company, sessionId);
        if (body == null || body.getAiSummary() == null) {
            return toResponse(m);
        }
        String s = body.getAiSummary().trim();
        m.setAiSummary(s.isEmpty() ? null : s);
        m = meetingRepository.save(m);
        return toResponse(m);
    }

    @Transactional
    public IntelligentListeningSessionResponse uploadAndTranscribe(Company company, UUID sessionId,
            MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Arquivo de áudio obrigatório");
        }
        Meeting m = loadIntelligentListening(company, sessionId);
        try {
            byte[] bytes = file.getBytes();
            String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "gravacao.webm";
            String text = openAiService.transcribeAudio(bytes, filename);
            if (text == null || text.isBlank()) {
                throw new RuntimeException(
                        "Não foi possível obter texto deste áudio. Grave pelo menos alguns segundos com fala audível, "
                                + "verifique o microfone e, no Meet, ative o compartilhamento de áudio da guia.");
            }
            m.setTranscriptionFull(text);
            m = meetingRepository.save(m);
            return toResponse(m);
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Falha ao processar áudio: " + e.getMessage(), e);
        }
    }

    @Transactional
    public IntelligentListeningSessionResponse analyze(Company company, UUID sessionId) {
        Meeting m = loadIntelligentListening(company, sessionId);
        if (m.getTranscriptionFull() == null || m.getTranscriptionFull().isBlank()) {
            throw new RuntimeException("Não há transcrição. Grave o áudio ou informe o texto antes.");
        }
        String json = openAiService.analyzeIntelligentListeningTranscript(m.getTranscriptionFull());
        if (json == null || json.isBlank()) {
            throw new RuntimeException("A IA não retornou análise. Tente novamente.");
        }
        m.setAiSummary(sanitizeJsonBlock(json));
        m = meetingRepository.save(m);
        return toResponse(m);
    }

    @Transactional
    public void deleteSession(Company company, UUID sessionId) {
        Meeting m = loadIntelligentListening(company, sessionId);
        meetingRepository.delete(m);
        log.info("Escuta inteligente removida: {}", sessionId);
    }

    @Transactional
    public IntelligentListeningSessionResponse completeToCrm(Company company, UUID sessionId) {
        Meeting m = loadIntelligentListening(company, sessionId);
        m.setStatus(MeetingStatus.COMPLETED);

        Lead lead = m.getLead();
        if (lead != null) {
            lead = leadRepository.findByIdAndCompany(lead.getId(), company).orElse(lead);
            String summaryPart = m.getAiSummary() != null && !m.getAiSummary().isBlank()
                    ? formatAiSummaryForCrmNotes(m.getAiSummary())
                    : (m.getTranscriptionFull() != null
                            ? "**Transcrição (sem análise IA)**\n\n" + m.getTranscriptionFull().trim()
                            : "");
            if (!summaryPart.isEmpty()) {
                String ref = m.getId().toString();
                String shortRef = ref.length() > 8 ? ref.substring(0, 8) : ref;
                String block = "\n\n--- Escuta Inteligente · " + CRM_TS.format(LocalDateTime.now()) + " · ref. "
                        + shortRef + " ---\n\n" + summaryPart;
                String merged = (lead.getNotes() != null ? lead.getNotes() : "") + block;
                lead.setNotes(merged);
                BigDecimal fromEscuta = extractNegotiatedValueBrl(m.getAiSummary());
                if (fromEscuta != null && lead.getEstimatedValue() == null) {
                    lead.setEstimatedValue(fromEscuta);
                }
                leadRepository.save(lead);
            }
        }
        m = meetingRepository.save(m);
        return toResponse(m);
    }

    private Meeting loadIntelligentListening(Company company, UUID sessionId) {
        Meeting m = meetingRepository.findByIdAndCompany(sessionId, company)
                .orElseThrow(() -> new RuntimeException("Sessão não encontrada"));
        if (m.getMeetingKind() != MeetingKind.INTELLIGENT_LISTENING) {
            throw new RuntimeException("Esta reunião não é uma escuta inteligente");
        }
        return m;
    }

    private IntelligentListeningSessionResponse toResponse(Meeting m) {
        UUID leadId = m.getLead() != null ? m.getLead().getId() : null;
        String leadName = m.getLead() != null ? m.getLead().getName() : m.getContactName();
        return IntelligentListeningSessionResponse.builder()
                .id(m.getId())
                .leadId(leadId)
                .leadName(leadName)
                .title(m.getTitle())
                .meetingDate(m.getMeetingDate())
                .meetingTime(m.getMeetingTime())
                .status(m.getStatus().name())
                .statusLabel(STATUS_LABELS.getOrDefault(m.getStatus(), m.getStatus().name()))
                .createdAt(m.getCreatedAt())
                .transcriptionFull(m.getTranscriptionFull())
                .aiSummary(m.getAiSummary())
                .negotiatedValueBrl(extractNegotiatedValueBrl(m.getAiSummary()))
                .build();
    }

    /**
     * Extrai valor em BRL do JSON de análise: prioriza {@code valor_mencionado_brl};
     * se ausente e houver {@code valor_mencionado_usd}, converte com taxa USD→BRL de referência.
     */
    private BigDecimal extractNegotiatedValueBrl(String aiSummaryJson) {
        if (aiSummaryJson == null || aiSummaryJson.isBlank()) {
            return null;
        }
        try {
            String clean = sanitizeJsonBlock(aiSummaryJson).trim();
            JsonNode root = objectMapper.readTree(clean);
            BigDecimal brl = parseMoneyNode(root.get("valor_mencionado_brl"));
            if (brl != null) {
                return brl;
            }
            BigDecimal usd = parseMoneyNode(root.get("valor_mencionado_usd"));
            if (usd != null) {
                return usd.multiply(USD_BRL_REFERENCE_RATE).setScale(2, RoundingMode.HALF_UP);
            }
        } catch (Exception e) {
            log.debug("Não foi possível extrair valor_mencionado_brl: {}", e.getMessage());
        }
        return null;
    }

    private static BigDecimal parseMoneyNode(JsonNode v) {
        if (v == null || v.isNull()) {
            return null;
        }
        if (v.isNumber()) {
            return BigDecimal.valueOf(v.asDouble()).setScale(2, RoundingMode.HALF_UP);
        }
        if (v.isTextual()) {
            String s = v.asText().replace(".", "").replace(",", ".");
            s = s.replaceAll("[^0-9.]", "");
            if (s.isBlank()) {
                return null;
            }
            return new BigDecimal(s).setScale(2, RoundingMode.HALF_UP);
        }
        return null;
    }

    /**
     * Converte o JSON de análise da IA em texto legível (Markdown leve) para as notas do lead.
     */
    private String formatAiSummaryForCrmNotes(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return "";
        }
        String json = sanitizeJsonBlock(rawJson).trim();
        try {
            JsonNode root = objectMapper.readTree(json);
            StringBuilder sb = new StringBuilder();
            BigDecimal neg = extractNegotiatedValueBrl(rawJson);
            if (neg != null) {
                NumberFormat br = NumberFormat.getCurrencyInstance(new Locale("pt", "BR"));
                appendMarkdownSection(sb, "Valor mencionado na reunião (est.)", br.format(neg));
            }
            appendMarkdownSection(sb, "Resumo", root.path("resumo").asText("").trim());
            appendMarkdownBulletSection(sb, "Pontos fortes", root.path("pontos_fortes"));
            appendMarkdownBulletSection(sb, "Pontos de atenção", root.path("pontos_fracos"));
            appendMarkdownBulletSection(sb, "Melhorias sugeridas", root.path("melhorias"));
            appendMarkdownBulletSection(sb, "Próximos passos", root.path("proximos_passos"));
            return sb.toString().trim();
        } catch (Exception e) {
            log.warn("Não foi possível formatar análise JSON para CRM: {}", e.getMessage());
            return json;
        }
    }

    private static void appendMarkdownSection(StringBuilder sb, String title, String body) {
        if (body == null || body.isBlank()) {
            return;
        }
        if (sb.length() > 0) {
            sb.append("\n\n");
        }
        sb.append("**").append(title).append("**\n\n").append(body);
    }

    private static void appendMarkdownBulletSection(StringBuilder sb, String title, JsonNode arr) {
        if (arr == null || !arr.isArray() || arr.isEmpty()) {
            return;
        }
        StringBuilder lines = new StringBuilder();
        for (JsonNode n : arr) {
            String line = n.asText("").trim();
            if (!line.isEmpty()) {
                lines.append("• ").append(line).append("\n");
            }
        }
        if (lines.length() == 0) {
            return;
        }
        if (sb.length() > 0) {
            sb.append("\n\n");
        }
        sb.append("**").append(title).append("**\n\n").append(lines.toString().trim());
    }

    private static String sanitizeJsonBlock(String raw) {
        if (raw == null) {
            return null;
        }
        String t = raw.trim();
        if (t.startsWith("```")) {
            int start = t.indexOf('{');
            int end = t.lastIndexOf('}');
            if (start >= 0 && end > start) {
                return t.substring(start, end + 1);
            }
        }
        return t;
    }
}
