CREATE TABLE support_config (
    id BIGSERIAL PRIMARY KEY,
    system_prompt TEXT NOT NULL,
    option1 VARCHAR(255),
    option2 VARCHAR(255),
    option3 VARCHAR(255),
    option4 VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configuration
INSERT INTO support_config (system_prompt, option1, option2, option3, option4, is_active)
VALUES (
    'Você é um assistente de suporte inteligente da WinAI. Ajude os usuários com dúvidas sobre a plataforma, planos e funcionalidades. Seja educado, conciso e use formatação Markdown quando necessário.',
    'Como conectar meu WhatsApp?',
    'Quais são os planos disponíveis?',
    'Como funciona a IA?',
    'Falar com atendente humano'
);
