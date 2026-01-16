package com.backend.winai.repository;

import com.backend.winai.entity.AIInsight;
import com.backend.winai.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AIInsightRepository extends JpaRepository<AIInsight, Long> {

    List<AIInsight> findByCompanyAndIsDismissedFalseOrderByCreatedAtDesc(Company company);

    List<AIInsight> findTop5ByCompanyAndIsDismissedFalseOrderByPriorityDescCreatedAtDesc(Company company);

    List<AIInsight> findByCompanyAndIsReadFalseAndIsDismissedFalse(Company company);

    long countByCompanyAndIsReadFalseAndIsDismissedFalse(Company company);
}
