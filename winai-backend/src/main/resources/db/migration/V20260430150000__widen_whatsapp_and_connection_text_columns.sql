-- Broadcast/WhatsApp: valores podem exceder varchar(255) — ex.: JWT UaZap, URLs longas, última mensagem.
-- Corrige: ERROR: value too long for type character varying(255) em update whatsapp_conversations.

ALTER TABLE winai.whatsapp_conversations
    ALTER COLUMN last_message_text TYPE TEXT USING last_message_text::TEXT;

ALTER TABLE winai.whatsapp_conversations
    ALTER COLUMN profile_picture_url TYPE TEXT USING profile_picture_url::TEXT;

ALTER TABLE winai.whatsapp_conversations
    ALTER COLUMN uazap_token TYPE TEXT USING uazap_token::TEXT;

ALTER TABLE winai.whatsapp_conversations
    ALTER COLUMN contact_name TYPE TEXT USING contact_name::TEXT;

ALTER TABLE winai.whatsapp_conversations
    ALTER COLUMN wa_chatid TYPE TEXT USING wa_chatid::TEXT;

ALTER TABLE winai.whatsapp_conversations
    ALTER COLUMN uazap_base_url TYPE TEXT USING uazap_base_url::TEXT;

ALTER TABLE winai.user_whatsapp_connections
    ALTER COLUMN instance_token TYPE TEXT USING instance_token::TEXT;

ALTER TABLE winai.user_whatsapp_connections
    ALTER COLUMN instance_base_url TYPE TEXT USING instance_base_url::TEXT;

ALTER TABLE winai.user_whatsapp_connections
    ALTER COLUMN description TYPE TEXT USING description::TEXT;
