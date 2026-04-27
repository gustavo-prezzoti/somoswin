package com.backend.winai.service;

import com.backend.winai.dto.request.UpdateAgentDocumentRequest;
import com.backend.winai.dto.response.CompanyAgentDocumentResponse;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.CompanyAgentDocument;
import com.backend.winai.repository.CompanyAgentDocumentRepository;
import com.backend.winai.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CompanyAgentDocumentService {

    public static final String BUCKET = "company-agent-documents";

    private final CompanyAgentDocumentRepository documentRepository;
    private final CompanyRepository companyRepository;
    private final SupabaseStorageService supabaseStorageService;

    @Value("${agent.documents.max-bytes:20971520}")
    private long maxBytes;

    @Value("${agent.documents.max-instructions-chars:6000}")
    private int maxInstructionsChars;

    @Transactional(readOnly = true)
    public List<CompanyAgentDocumentResponse> listByCompany(UUID companyId) {
        return documentRepository.findByCompany_IdOrderByCreatedAtDesc(companyId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CompanyAgentDocumentResponse getById(UUID documentId) {
        CompanyAgentDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Documento não encontrado"));
        return toResponse(doc);
    }

    @Transactional
    public CompanyAgentDocumentResponse upload(UUID companyId, String title, MultipartFile file, String sendWhenInstructions)
            throws IOException {
        if (title == null || title.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Título é obrigatório");
        }
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo é obrigatório");
        }
        if (file.getSize() > maxBytes) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Arquivo excede o tamanho máximo permitido (" + (maxBytes / 1024 / 1024) + " MB)");
        }
        String mime = file.getContentType();
        if (mime == null || !isAllowedMime(mime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Tipo de arquivo não permitido. Use imagens, PDF ou documentos Office.");
        }

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Empresa não encontrada"));

        UUID docId = UUID.randomUUID();
        String safeOriginal = sanitizeFilename(file.getOriginalFilename());
        String filePath = companyId + "/" + docId + "/" + safeOriginal;

        supabaseStorageService.ensureBucketExists(BUCKET);
        String publicUrl = supabaseStorageService.uploadFile(BUCKET, filePath, file);

        String instructions = normalizeAndValidateInstructions(sendWhenInstructions);

        CompanyAgentDocument entity = CompanyAgentDocument.builder()
                .id(docId)
                .company(company)
                .title(title.trim())
                .sendWhenInstructions(instructions)
                .storageBucket(BUCKET)
                .storagePath(filePath)
                .publicUrl(publicUrl)
                .mimeType(mime)
                .originalFilename(file.getOriginalFilename())
                .fileSize(file.getSize())
                .build();
        documentRepository.save(entity);
        log.info("Agent document uploaded: {} for company {}", docId, companyId);
        return toResponse(entity);
    }

    @Transactional
    public CompanyAgentDocumentResponse update(UUID documentId, UpdateAgentDocumentRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Corpo da requisição obrigatório");
        }
        CompanyAgentDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Documento não encontrado"));
        boolean touched = false;
        if (request.getTitle() != null) {
            String t = request.getTitle().trim();
            if (t.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Título não pode ser vazio");
            }
            doc.setTitle(t);
            touched = true;
        }
        if (request.getSendWhenInstructions() != null) {
            doc.setSendWhenInstructions(normalizeAndValidateInstructions(request.getSendWhenInstructions()));
            touched = true;
        }
        if (!touched) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nada para atualizar (title ou sendWhenInstructions)");
        }
        documentRepository.save(doc);
        return toResponse(doc);
    }

    @Transactional
    public void delete(UUID documentId) {
        CompanyAgentDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Documento não encontrado"));
        supabaseStorageService.tryDeletePublicStorageObject(doc.getPublicUrl());
        documentRepository.delete(doc);
    }

    public boolean isAllowedMime(String mime) {
        String m = mime.toLowerCase();
        return m.startsWith("image/")
                || "application/pdf".equals(m)
                || "application/msword".equals(m)
                || "application/vnd.openxmlformats-officedocument.wordprocessingml.document".equals(m)
                || "application/vnd.ms-excel".equals(m)
                || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".equals(m)
                || "application/vnd.ms-powerpoint".equals(m)
                || "application/vnd.openxmlformats-officedocument.presentationml.presentation".equals(m);
    }

    private static String sanitizeFilename(String name) {
        if (name == null || name.isBlank()) {
            return "file.bin";
        }
        String n = name.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (n.length() > 200) {
            n = n.substring(n.length() - 200);
        }
        return n.isEmpty() ? "file.bin" : n;
    }

    private String normalizeAndValidateInstructions(String raw) {
        if (raw == null) {
            return null;
        }
        String t = raw.trim();
        if (t.isEmpty()) {
            return null;
        }
        if (t.length() > maxInstructionsChars) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Instruções excedem o máximo de " + maxInstructionsChars + " caracteres");
        }
        return t;
    }

    private CompanyAgentDocumentResponse toResponse(CompanyAgentDocument d) {
        return CompanyAgentDocumentResponse.builder()
                .id(d.getId())
                .companyId(d.getCompany().getId())
                .title(d.getTitle())
                .sendWhenInstructions(d.getSendWhenInstructions())
                .publicUrl(d.getPublicUrl())
                .mimeType(d.getMimeType())
                .originalFilename(d.getOriginalFilename())
                .fileSize(d.getFileSize())
                .createdAt(d.getCreatedAt())
                .updatedAt(d.getUpdatedAt())
                .build();
    }
}
