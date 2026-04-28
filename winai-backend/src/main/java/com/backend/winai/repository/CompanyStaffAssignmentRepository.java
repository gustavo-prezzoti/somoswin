package com.backend.winai.repository;

import com.backend.winai.entity.CompanyStaffAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CompanyStaffAssignmentRepository extends JpaRepository<CompanyStaffAssignment, UUID> {

    @Query("SELECT a.company.id FROM CompanyStaffAssignment a JOIN a.company c WHERE a.staffUser.id = :staffUserId ORDER BY c.name")
    List<UUID> findCompanyIdsByStaffUserId(@Param("staffUserId") UUID staffUserId);

    @Query("SELECT a.company.id AS id, a.company.name AS name FROM CompanyStaffAssignment a WHERE a.staffUser.id = :staffUserId ORDER BY LOWER(a.company.name)")
    List<CompanyIdNameProjection> findAssignedCompaniesProjection(@Param("staffUserId") UUID staffUserId);

    @Query("SELECT a.staffUser.id, COUNT(a) FROM CompanyStaffAssignment a GROUP BY a.staffUser.id")
    List<Object[]> countAssignmentsGroupedByStaffUserId();

    long countByStaffUser_Id(UUID staffUserId);

    void deleteByStaffUser_Id(UUID staffUserId);
}
