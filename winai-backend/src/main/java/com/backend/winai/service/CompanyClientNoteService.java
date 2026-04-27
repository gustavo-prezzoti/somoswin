package com.backend.winai.service;

import com.backend.winai.dto.request.CreateCompanyClientNoteRequest;
import com.backend.winai.dto.response.CompanyClientNoteResponse;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.CompanyClientNote;
import com.backend.winai.entity.User;
import com.backend.winai.repository.CompanyClientNoteRepository;
import com.backend.winai.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CompanyClientNoteService {

    private final CompanyClientNoteRepository companyClientNoteRepository;
    private final CompanyRepository companyRepository;

    @Transactional(readOnly = true)
    public List<CompanyClientNoteResponse> listByCompany(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Empresa não encontrada"));
        return companyClientNoteRepository.findByCompanyOrderByCreatedAtDesc(company).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public CompanyClientNoteResponse create(UUID companyId, CreateCompanyClientNoteRequest request, User author) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Empresa não encontrada"));
        String body = request.getBody() != null ? request.getBody().trim() : "";
        if (body.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Texto da nota é obrigatório");
        }
        CompanyClientNote note = CompanyClientNote.builder()
                .company(company)
                .author(author)
                .body(body)
                .build();
        CompanyClientNote saved = companyClientNoteRepository.save(note);
        return toResponse(saved);
    }

    private CompanyClientNoteResponse toResponse(CompanyClientNote n) {
        return CompanyClientNoteResponse.builder()
                .id(n.getId())
                .body(n.getBody())
                .createdAt(n.getCreatedAt() != null ? n.getCreatedAt().toString() : null)
                .authorUserId(n.getAuthor().getId())
                .authorName(n.getAuthor().getName())
                .build();
    }
}
