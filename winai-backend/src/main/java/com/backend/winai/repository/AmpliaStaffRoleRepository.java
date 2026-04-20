package com.backend.winai.repository;

import com.backend.winai.entity.AmpliaStaffRole;
import com.backend.winai.entity.AmpliaStaffType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AmpliaStaffRoleRepository extends JpaRepository<AmpliaStaffRole, UUID> {

    List<AmpliaStaffRole> findByActiveTrueOrderByNameAsc();

    Optional<AmpliaStaffRole> findByLegacyStaffType(AmpliaStaffType legacyStaffType);

    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);

    boolean existsByNameIgnoreCase(String name);
}
