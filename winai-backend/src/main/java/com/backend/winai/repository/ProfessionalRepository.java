package com.backend.winai.repository;

import com.backend.winai.entity.Professional;
import com.backend.winai.entity.Professional.ProfessionalType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProfessionalRepository extends JpaRepository<Professional, UUID> {
    
    Page<Professional> findByType(ProfessionalType type, Pageable pageable);
    
    Page<Professional> findByTypeAndActive(ProfessionalType type, Boolean active, Pageable pageable);
    
    List<Professional> findByTypeAndActiveOrderByRatingDesc(ProfessionalType type, Boolean active);
    
    Page<Professional> findByNameContainingIgnoreCase(String name, Pageable pageable);
    
    Page<Professional> findByTypeAndNameContainingIgnoreCase(ProfessionalType type, String name, Pageable pageable);
}
