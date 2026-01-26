package com.backend.winai.service;

import com.backend.winai.dto.request.ProfessionalRequest;
import com.backend.winai.dto.response.ProfessionalResponse;
import com.backend.winai.entity.Professional;
import com.backend.winai.entity.Professional.ProfessionalType;
import com.backend.winai.repository.ProfessionalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProfessionalService {

    private final ProfessionalRepository professionalRepository;

    public Page<ProfessionalResponse> findAll(int page, int size, String sortBy, String direction) {
        Sort sort = direction.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return professionalRepository.findAll(pageable).map(ProfessionalResponse::fromEntity);
    }

    public Page<ProfessionalResponse> findByType(ProfessionalType type, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("rating").descending());
        return professionalRepository.findByType(type, pageable).map(ProfessionalResponse::fromEntity);
    }

    public List<ProfessionalResponse> findActiveByType(ProfessionalType type) {
        return professionalRepository.findByTypeAndActiveOrderByRatingDesc(type, true)
                .stream()
                .map(ProfessionalResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public ProfessionalResponse findById(UUID id) {
        Professional professional = professionalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Profissional não encontrado"));
        return ProfessionalResponse.fromEntity(professional);
    }

    @Transactional
    public ProfessionalResponse create(ProfessionalRequest request) {
        Professional professional = Professional.builder()
                .name(request.getName())
                .specialty(request.getSpecialty())
                .rating(request.getRating())
                .price(request.getPrice())
                .imageUrl(request.getImageUrl())
                .whatsapp(request.getWhatsapp())
                .type(request.getType())
                .active(request.getActive() != null ? request.getActive() : true)
                .build();

        professional = professionalRepository.save(professional);
        log.info("Profissional criado: {} - {}", professional.getName(), professional.getType());
        return ProfessionalResponse.fromEntity(professional);
    }

    @Transactional
    public ProfessionalResponse update(UUID id, ProfessionalRequest request) {
        Professional professional = professionalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Profissional não encontrado"));

        professional.setName(request.getName());
        professional.setSpecialty(request.getSpecialty());
        professional.setRating(request.getRating());
        professional.setPrice(request.getPrice());
        professional.setImageUrl(request.getImageUrl());
        professional.setWhatsapp(request.getWhatsapp());
        professional.setType(request.getType());
        if (request.getActive() != null) {
            professional.setActive(request.getActive());
        }

        professional = professionalRepository.save(professional);
        log.info("Profissional atualizado: {} - {}", professional.getName(), professional.getType());
        return ProfessionalResponse.fromEntity(professional);
    }

    @Transactional
    public void delete(UUID id) {
        Professional professional = professionalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Profissional não encontrado"));
        professionalRepository.delete(professional);
        log.info("Profissional removido: {}", professional.getName());
    }

    @Transactional
    public ProfessionalResponse toggleActive(UUID id) {
        Professional professional = professionalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Profissional não encontrado"));
        professional.setActive(!professional.getActive());
        professional = professionalRepository.save(professional);
        log.info("Profissional {} - status: {}", professional.getName(),
                professional.getActive() ? "ativo" : "inativo");
        return ProfessionalResponse.fromEntity(professional);
    }
}
