package com.backend.winai.service;

import com.backend.winai.repository.KnowledgeBaseConnectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Regras de negócio: modo IA só depois de existir base de conhecimento (agente) ativa
 * vinculada a uma conexão WhatsApp da empresa. Caso contrário o fluxo permanece humano.
 */
@Component
@RequiredArgsConstructor
public class CompanyAiPolicy {

    private final KnowledgeBaseConnectionRepository knowledgeBaseConnectionRepository;

    public boolean hasLinkedActiveAgent(UUID companyId) {
        if (companyId == null) {
            return false;
        }
        return knowledgeBaseConnectionRepository.countActiveLinkedKnowledgeBasesForCompany(companyId) > 0;
    }

    /**
     * @throws IllegalArgumentException se tentar habilitar IA como padrão sem agente vinculado
     */
    public void assertMaySetDefaultSupportModeToIA(UUID companyId) {
        if (!hasLinkedActiveAgent(companyId)) {
            throw new IllegalArgumentException(
                    "Crie uma base de conhecimento (agente), ative-a e vincule-a à conexão WhatsApp antes de definir o modo padrão como IA.");
        }
    }
}
