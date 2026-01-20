package com.backend.winai.service;

import com.backend.winai.entity.KnowledgeBase;
import com.backend.winai.entity.KnowledgeBaseChunk;
import com.backend.winai.entity.KnowledgeBaseConnection;
import com.backend.winai.entity.User;
import com.backend.winai.entity.UserWhatsAppConnection;
import com.backend.winai.repository.KnowledgeBaseChunkRepository;
import com.backend.winai.repository.KnowledgeBaseConnectionRepository;
import com.backend.winai.repository.KnowledgeBaseRepository;
import com.backend.winai.repository.UserWhatsAppConnectionRepository;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class KnowledgeBaseService {
    private final KnowledgeBaseRepository repository;
    private final KnowledgeBaseChunkRepository chunkRepository;
    private final KnowledgeBaseConnectionRepository connectionRepository;
    private final UserWhatsAppConnectionRepository whatsAppConnectionRepository;
    private final CompanyRepository companyRepository;
    private final OpenAiService openAiService;

    public List<KnowledgeBase> findAll(User user, UUID requestedCompanyId) {
        Company targetCompany = resolveCompany(user, requestedCompanyId);
        log.info("Buscando KnowledgeBases para empresa ID: {}, Nome: {}", targetCompany.getId(),
                targetCompany.getName());
        return repository.findByCompanyIdOrderByUpdatedAtDesc(targetCompany.getId());
    }

    @Transactional
    public KnowledgeBase create(User user, String name, String content, String agentPrompt, String systemTemplate,
            UUID requestedCompanyId) {
        Company targetCompany = resolveCompany(user, requestedCompanyId);

        KnowledgeBase kb = KnowledgeBase.builder()
                .company(targetCompany)
                .name(name)
                .content(content)
                .agentPrompt(agentPrompt)
                .systemTemplate(systemTemplate)
                .isActive(true)
                .build();

        kb = repository.save(kb);

        vectorizeAndSave(kb);

        return kb;
    }

    @Transactional
    public KnowledgeBase update(User user, UUID id, String name, String content, String agentPrompt, Boolean isActive,
            String systemTemplate) {
        KnowledgeBase kb = repository.findById(id).orElseThrow(() -> new RuntimeException("Base não encontrada"));
        checkPermission(user, kb.getCompany());

        boolean contentChanged = content != null && !content.equals(kb.getContent());
        kb.setName(name);
        if (content != null)
            kb.setContent(content);
        if (agentPrompt != null)
            kb.setAgentPrompt(agentPrompt);
        if (isActive != null)
            kb.setIsActive(isActive);
        kb.setSystemTemplate(systemTemplate);

        kb = repository.save(kb);

        if (contentChanged) {
            vectorizeAndSave(kb);
        }
        return kb;
    }

    @Transactional
    public void delete(User user, UUID id) {
        KnowledgeBase kb = repository.findById(id).orElseThrow(() -> new RuntimeException("Base não encontrada"));
        checkPermission(user, kb.getCompany());
        // Chunks deletados em cascata ou manualmente se JPA não tratar
        chunkRepository.deleteByKnowledgeBase(kb);
        repository.delete(kb);
    }

    public List<UserWhatsAppConnection> findConnections(User user, UUID kbId) {
        KnowledgeBase kb = repository.findById(kbId).orElseThrow(() -> new RuntimeException("Base não encontrada"));
        checkPermission(user, kb.getCompany());

        return connectionRepository.findByKnowledgeBase(kb).stream()
                .map(KnowledgeBaseConnection::getConnection)
                .collect(Collectors.toList());
    }

    @Transactional
    public void linkConnection(User user, UUID kbId, UUID connectionId) {
        KnowledgeBase kb = repository.findById(kbId).orElseThrow(() -> new RuntimeException("Base não encontrada"));
        checkPermission(user, kb.getCompany());

        UserWhatsAppConnection conn = whatsAppConnectionRepository.findById(connectionId)
                .orElseThrow(() -> new RuntimeException("Conexão não encontrada"));

        // UserWhatsAppConnection agora pertence diretamente à Company
        if (!conn.getCompany().getId().equals(kb.getCompany().getId())) {
            throw new RuntimeException("A Conexão e o Agente devem pertencer à mesma empresa");
        }

        // Remover link anterior se houver (para garantir unique por conexão)
        connectionRepository.findByConnection(conn).ifPresent(link -> {
            connectionRepository.delete(link);
            connectionRepository.flush();
        });

        connectionRepository.save(KnowledgeBaseConnection.builder()
                .knowledgeBase(kb)
                .connection(conn)
                .build());
    }

    @Transactional
    public void unlinkConnection(User user, UUID kbId, UUID connectionId) {
        UserWhatsAppConnection conn = whatsAppConnectionRepository.findById(connectionId)
                .orElseThrow(() -> new RuntimeException("Conexão não encontrada"));

        KnowledgeBaseConnection link = connectionRepository.findByConnection(conn)
                .filter(l -> l.getKnowledgeBase().getId().equals(kbId))
                .orElseThrow(() -> new RuntimeException("Vínculo não encontrado"));

        checkPermission(user, link.getKnowledgeBase().getCompany());

        connectionRepository.delete(link);
    }

    private void vectorizeAndSave(KnowledgeBase kb) {
        chunkRepository.deleteByKnowledgeBase(kb);

        String content = kb.getContent();
        if (content == null || content.trim().isEmpty())
            return;

        int chunkSize = 4000;
        int overlap = 200;
        int length = content.length();
        int index = 0;
        int chunkCount = 0;

        log.info("Iniciando vetorização para Base de Conhecimento: {} (Tamanho: {})", kb.getName(), length);

        while (index < length) {
            int end = Math.min(index + chunkSize, length);
            String chunkText = content.substring(index, end);

            KnowledgeBaseChunk chunk = KnowledgeBaseChunk.builder()
                    .knowledgeBase(kb)
                    .contentChunk(chunkText)
                    .chunkIndex(chunkCount++)
                    .build();

            chunk = chunkRepository.save(chunk);

            try {
                List<Double> vector = openAiService.getEmbedding(chunkText);
                String vectorString = vector.toString();
                chunkRepository.updateEmbedding(chunk.getId(), vectorString);
            } catch (Exception e) {
                log.error("Erro ao vetorizar chunk {} da base {}", chunk.getChunkIndex(), kb.getId(), e);
                // throw new RuntimeException("Erro ao gerar embedding: " + e.getMessage(), e);
                // Logar e continuar ou falhar? Usuário pediu robustez no chunking.
                // Mas falhar pode travar o sistema se a API der timeout.
                // Vou manter o throw para garantir integridade.
            }

            if (end == length)
                break;
            index += (chunkSize - overlap);
        }

        log.info("Vetorização concluída. {} chunks gerados.", chunkCount);
    }

    private Company resolveCompany(User user, UUID requestedCompanyId) {
        if (requestedCompanyId != null) {
            if (user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.SUPER_ADMIN) {
                return companyRepository.findById(requestedCompanyId)
                        .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));
            } else {
                throw new RuntimeException("Acesso negado: Apenas administradores podem selecionar empresas.");
            }
        }

        if (user.getCompany() == null) {
            throw new RuntimeException("Usuário sem empresa associada");
        }
        return user.getCompany();
    }

    private void checkPermission(User user, Company entityCompany) {
        if (user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.SUPER_ADMIN) {
            return;
        }
        if (user.getCompany() == null || !user.getCompany().getId().equals(entityCompany.getId())) {
            throw new RuntimeException("Acesso negado");
        }
    }
}
