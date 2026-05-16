UPDATE winai.whatsapp_conversations
SET phone_number = regexp_replace(wa_chatid, '@.*$', '')
WHERE wa_chatid IS NOT NULL
  AND wa_chatid <> ''
  AND regexp_replace(wa_chatid, '@.*$', '') <> coalesce(phone_number, '')
  AND regexp_replace(wa_chatid, '@.*$', '') ~ '^[0-9]+$';

WITH ranked AS (
  SELECT id, company_id, uazap_instance, wa_chatid,
         row_number() OVER (
           PARTITION BY company_id, uazap_instance, wa_chatid
           ORDER BY updated_at DESC NULLS LAST, created_at DESC
         ) AS rn
  FROM winai.whatsapp_conversations
  WHERE wa_chatid IS NOT NULL AND wa_chatid <> ''
),
canonical AS (
  SELECT company_id, uazap_instance, wa_chatid, id AS canonical_id
  FROM ranked WHERE rn = 1
),
dups AS (
  SELECT r.id AS dup_id, c.canonical_id
  FROM ranked r
  JOIN canonical c
    ON r.company_id = c.company_id
   AND r.uazap_instance IS NOT DISTINCT FROM c.uazap_instance
   AND r.wa_chatid = c.wa_chatid
  WHERE r.rn > 1
)
UPDATE winai.whatsapp_messages m
SET conversation_id = d.canonical_id
FROM dups d
WHERE m.conversation_id = d.dup_id;

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY company_id, uazap_instance, wa_chatid
           ORDER BY updated_at DESC NULLS LAST, created_at DESC
         ) AS rn
  FROM winai.whatsapp_conversations
  WHERE wa_chatid IS NOT NULL AND wa_chatid <> ''
)
DELETE FROM winai.followup_status
WHERE conversation_id IN (SELECT id FROM ranked WHERE rn > 1);

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY company_id, uazap_instance, wa_chatid
           ORDER BY updated_at DESC NULLS LAST, created_at DESC
         ) AS rn
  FROM winai.whatsapp_conversations
  WHERE wa_chatid IS NOT NULL AND wa_chatid <> ''
)
DELETE FROM winai.whatsapp_conversations
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_whatsapp_conversations_company_instance_chatid
ON winai.whatsapp_conversations (company_id, uazap_instance, wa_chatid)
WHERE wa_chatid IS NOT NULL;
