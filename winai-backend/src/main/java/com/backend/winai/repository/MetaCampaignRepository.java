package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.MetaCampaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MetaCampaignRepository extends JpaRepository<MetaCampaign, UUID> {
    Optional<MetaCampaign> findByMetaId(String metaId);

    Optional<MetaCampaign> findByCompany_IdAndMetaId(UUID companyId, String metaId);

    List<MetaCampaign> findByCompanyId(UUID companyId);

    void deleteByCompany(Company company);

    long countByCompanyId(UUID companyId);

    long countByCompanyIdAndStatus(UUID companyId, String status);

    @Query("SELECT COALESCE(SUM(m.spend), 0.0) FROM MetaCampaign m")
    Double sumTotalSpend();

    @Query("SELECT COALESCE(SUM(m.impressions), 0L) FROM MetaCampaign m")
    Long sumTotalImpressions();

    @Query("SELECT COALESCE(SUM(m.clicks), 0L) FROM MetaCampaign m")
    Long sumTotalClicks();

    @Query("SELECT COALESCE(SUM(m.reach), 0L) FROM MetaCampaign m")
    Long sumTotalReach();

    @Query("SELECT COALESCE(SUM(m.conversions), 0L) FROM MetaCampaign m")
    Long sumTotalConversions();

    @Query("SELECT c.id, c.name, COALESCE(SUM(m.spend), 0.0), COALESCE(SUM(m.impressions), 0L), COALESCE(SUM(m.clicks), 0L), COUNT(m) "
            + "FROM MetaCampaign m JOIN m.company c GROUP BY c.id, c.name ORDER BY COALESCE(SUM(m.spend), 0.0) DESC")
    List<Object[]> aggregateSpendByCompany();

    /** Soma por empresa dos insights sincronizados nas linhas de campanha (snapshot último sync). */
    @Query("SELECT c.id, COALESCE(SUM(m.spend), 0.0), COALESCE(SUM(m.impressions), 0L), COALESCE(SUM(m.clicks), 0L), COALESCE(SUM(m.conversions), 0L) "
            + "FROM MetaCampaign m JOIN m.company c GROUP BY c.id")
    List<Object[]> aggregateMetricsByCompany();
}
