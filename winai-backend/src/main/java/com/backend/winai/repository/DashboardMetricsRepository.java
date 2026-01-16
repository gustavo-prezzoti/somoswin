package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.DashboardMetrics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DashboardMetricsRepository extends JpaRepository<DashboardMetrics, Long> {

    Optional<DashboardMetrics> findByCompanyAndDate(Company company, LocalDate date);

    List<DashboardMetrics> findByCompanyAndDateBetweenOrderByDateAsc(
            Company company, LocalDate startDate, LocalDate endDate);

    @Query("SELECT SUM(d.leadsCaptured) FROM DashboardMetrics d WHERE d.company = :company AND d.date BETWEEN :startDate AND :endDate")
    Integer sumLeadsCapturedByCompanyAndDateBetween(
            @Param("company") Company company,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT AVG(d.cplAverage) FROM DashboardMetrics d WHERE d.company = :company AND d.date BETWEEN :startDate AND :endDate")
    Double avgCplByCompanyAndDateBetween(
            @Param("company") Company company,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT AVG(d.conversionRate) FROM DashboardMetrics d WHERE d.company = :company AND d.date BETWEEN :startDate AND :endDate")
    Double avgConversionRateByCompanyAndDateBetween(
            @Param("company") Company company,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT AVG(d.roi) FROM DashboardMetrics d WHERE d.company = :company AND d.date BETWEEN :startDate AND :endDate")
    Double avgRoiByCompanyAndDateBetween(
            @Param("company") Company company,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT AVG(d.performanceScore) FROM DashboardMetrics d WHERE d.company = :company AND d.date BETWEEN :startDate AND :endDate")
    Double avgPerformanceScoreByCompanyAndDateBetween(
            @Param("company") Company company,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}
