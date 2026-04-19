-- Aparência da consultoria: uma configuração para todas as empresas (substitui textos por empresa na UI).
CREATE TABLE winai.consultancy_global_settings (
    id BIGINT PRIMARY KEY CHECK (id = 1),
    consultant_display_name VARCHAR(500),
    consultant_role VARCHAR(500),
    consultant_avatar_url TEXT,
    consultancy_client_kicker VARCHAR(500),
    consultancy_client_headline_prefix VARCHAR(500),
    consultancy_client_headline_accent VARCHAR(255),
    consultancy_next_section_caption VARCHAR(500),
    consultancy_request_card_title VARCHAR(500),
    consultancy_request_card_description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO winai.consultancy_global_settings (id)
VALUES (1);

-- Copia textos do perfil de consultoria da empresa criada primeiro (se existir).
UPDATE winai.consultancy_global_settings g
SET
    consultant_display_name = c.consultant_display_name,
    consultant_role = c.consultant_role,
    consultant_avatar_url = c.consultant_avatar_url,
    consultancy_client_kicker = c.consultancy_client_kicker,
    consultancy_client_headline_prefix = c.consultancy_client_headline_prefix,
    consultancy_client_headline_accent = c.consultancy_client_headline_accent,
    consultancy_next_section_caption = c.consultancy_next_section_caption,
    consultancy_request_card_title = c.consultancy_request_card_title,
    consultancy_request_card_description = c.consultancy_request_card_description
FROM winai.companies c
WHERE g.id = 1
  AND c.id = (SELECT id FROM winai.companies ORDER BY created_at ASC NULLS LAST LIMIT 1);
