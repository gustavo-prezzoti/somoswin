-- Textos da tela de consultoria (por empresa) + link Meet nos pedidos

ALTER TABLE winai.companies
    ADD COLUMN IF NOT EXISTS consultancy_client_kicker VARCHAR(500);

ALTER TABLE winai.companies
    ADD COLUMN IF NOT EXISTS consultancy_client_headline_prefix VARCHAR(500);

ALTER TABLE winai.companies
    ADD COLUMN IF NOT EXISTS consultancy_client_headline_accent VARCHAR(255);

ALTER TABLE winai.companies
    ADD COLUMN IF NOT EXISTS consultancy_next_section_caption VARCHAR(500);

ALTER TABLE winai.companies
    ADD COLUMN IF NOT EXISTS consultancy_request_card_title VARCHAR(500);

ALTER TABLE winai.companies
    ADD COLUMN IF NOT EXISTS consultancy_request_card_description TEXT;

ALTER TABLE winai.consultancy_call_requests
    ADD COLUMN IF NOT EXISTS meet_link TEXT;
