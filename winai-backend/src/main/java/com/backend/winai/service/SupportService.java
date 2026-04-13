package com.backend.winai.service;

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
@Transactional(readOnly = true)
public class SupportService {

    private final SupportConfigRepository supportConfigRepository;

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
