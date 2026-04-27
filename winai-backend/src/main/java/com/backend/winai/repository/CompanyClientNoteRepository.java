package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.CompanyClientNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CompanyClientNoteRepository extends JpaRepository<CompanyClientNote, UUID> {

    @Query("SELECT n FROM CompanyClientNote n JOIN FETCH n.author WHERE n.company = :company ORDER BY n.createdAt DESC")
    List<CompanyClientNote> findByCompanyOrderByCreatedAtDesc(@Param("company") Company company);
}
