package com.backend.winai.service;

import com.backend.winai.dto.ChatRequest;
import com.backend.winai.dto.ChatResponse;
import com.backend.winai.entity.SupportConfig;
import com.backend.winai.repository.SupportConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class SupportService {

    private final SupportConfigRepository supportConfigRepository;
    private final OpenAiService openAiService;

    public SupportConfig getCurrentConfig() {
        return supportConfigRepository.findFirstByOrderByIdDesc()
                .orElseGet(this::createDefaultConfig);
    }

    @Transactional
    public SupportConfig updateConfig(SupportConfig newConfig) {
        SupportConfig current = getCurrentConfig();
        current.setSystemPrompt(newConfig.getSystemPrompt());
        current.setOption1(newConfig.getOption1());
        current.setOption2(newConfig.getOption2());
        current.setOption3(newConfig.getOption3());
        current.setOption4(newConfig.getOption4());
        current.setIsActive(newConfig.getIsActive());
        current.setUpdatedAt(LocalDateTime.now());
        return supportConfigRepository.save(current);
    }

    public ChatResponse processChat(ChatRequest request) {
        SupportConfig config = getCurrentConfig();

        if (!Boolean.TRUE.equals(config.getIsActive())) {
            return ChatResponse.builder()
                    .response("O chat de suporte está temporariamente desativado.")
                    .build();
        }

        String systemPrompt = config.getSystemPrompt();
        String response = openAiService.generateResponse(systemPrompt, request.getMessage());

        if (response == null) {
            return ChatResponse.builder()
                    .response("Desculpe, não consegui processar sua solicitação no momento.")
                    .build();
        }

        return ChatResponse.builder()
                .response(response)
                .build();
    }

    private SupportConfig createDefaultConfig() {
        SupportConfig config = SupportConfig.builder()
                .systemPrompt(
                        "Você é um assistente de suporte inteligente da WinAI, especializado em ajudar usuários com a plataforma.")
                .option1("Como conectar meu WhatsApp?")
                .option2("Quais são os planos disponíveis?")
                .option3("Como funciona a IA?")
                .option4("Falar com atendente humano")
                .isActive(true)
                .build();
        return supportConfigRepository.save(config);
    }
}
