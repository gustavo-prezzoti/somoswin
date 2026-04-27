package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.DashboardTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DashboardTaskRepository extends JpaRepository<DashboardTask, Long> {

    List<DashboardTask> findByCompanyOrderBySortOrderAscIdAsc(Company company);

    long countByCompany(Company company);

    void deleteByCompany_Id(UUID companyId);

    long countByCompletedFalse();
}
