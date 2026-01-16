package com.backend.winai.repository;

import com.backend.winai.entity.UserWhatsAppConnection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserWhatsAppConnectionRepository extends JpaRepository<UserWhatsAppConnection, UUID> {

        /**
         * Busca todas as conexões de uma empresa
         */
        List<UserWhatsAppConnection> findByCompanyId(UUID companyId);

        /**
         * Busca todas as conexões ativas de uma empresa
         */
        List<UserWhatsAppConnection> findByCompanyIdAndIsActiveTrue(UUID companyId);

        /**
         * Busca uma conexão específica de uma empresa por nome da instância
         */
        Optional<UserWhatsAppConnection> findByCompanyIdAndInstanceName(UUID companyId, String instanceName);

        /**
         * Busca todas as conexões de uma instância específica
         */
        List<UserWhatsAppConnection> findByInstanceName(String instanceName);

        /**
         * Verifica se uma empresa tem acesso a uma instância específica
         */
        @Query("SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END " +
                        "FROM UserWhatsAppConnection c " +
                        "WHERE c.company.id = :companyId AND c.instanceName = :instanceName AND c.isActive = true")
        boolean hasCompanyAccessToInstance(@Param("companyId") UUID companyId,
                        @Param("instanceName") String instanceName);

        /**
         * Busca todos os nomes de instâncias que uma empresa tem acesso
         */
        @Query("SELECT c.instanceName FROM UserWhatsAppConnection c " +
                        "WHERE c.company.id = :companyId AND c.isActive = true")
        List<String> findInstanceNamesByCompanyId(@Param("companyId") UUID companyId);

        /**
         * Deleta todas as conexões de uma empresa
         */
        void deleteByCompanyId(UUID companyId);

        /**
         * Deleta uma conexão específica
         */
        void deleteByCompanyIdAndInstanceName(UUID companyId, String instanceName);

        /**
         * Busca conexão por base URL e token
         */
        Optional<UserWhatsAppConnection> findByInstanceBaseUrlAndInstanceToken(String instanceBaseUrl,
                        String instanceToken);

        /**
         * Busca conexões criadas por um usuário específico
         */
        List<UserWhatsAppConnection> findByCreatedById(UUID userId);
}
