-- Opcional: reescreve permissions_json de papéis Amplia do formato legado (só nome do módulo = true)
-- para chaves granulares modulo:acao. O backend já aceita ambos; use este script apenas para
-- normalizar dados no banco ou quando quiser que o JSON armazenado já esteja granular.
-- Flyway costuma estar desabilitado em application.properties; execute manualmente no PostgreSQL se necessário.
--
-- Módulos válidos: alinhar a com.backend.winai.entity.AmpliaAdminModule (nomes em minúsculas).

DO $$
DECLARE
    r RECORD;
    new_perms JSONB := '{}'::jsonb;
    e RECORD;
    mod_key TEXT;
    act TEXT;
    valid_modules TEXT[] := ARRAY[
        'dashboard','clientes','usuarios','metaads','metas','alertas','performance',
        'gestao_equipe','contratos','financas','instancias','conexoes','agentes',
        'followup','prompts','consultoria'
    ];
BEGIN
    FOR r IN
        SELECT id, permissions_json
        FROM winai.amplia_staff_roles
        WHERE COALESCE(full_access, FALSE) = FALSE
          AND permissions_json IS NOT NULL
          AND permissions_json != 'null'::jsonb
    LOOP
        new_perms := '{}'::jsonb;
        FOR e IN SELECT key, value FROM jsonb_each(r.permissions_json)
        LOOP
            IF e.value IS NULL OR jsonb_typeof(e.value) != 'boolean' OR e.value IS DISTINCT FROM 'true'::jsonb THEN
                CONTINUE;
            END IF;
            mod_key := trim(both from e.key);
            IF mod_key = '' THEN
                CONTINUE;
            END IF;
            IF mod_key = '*' THEN
                new_perms := new_perms || jsonb_build_object('*', true);
                CONTINUE;
            END IF;
            IF strpos(mod_key, ':') > 0 THEN
                new_perms := new_perms || jsonb_build_object(mod_key, true);
                CONTINUE;
            END IF;
            IF mod_key = ANY (valid_modules) THEN
                FOREACH act IN ARRAY ARRAY['list', 'read', 'create', 'update', 'delete']
                LOOP
                    new_perms := new_perms || jsonb_build_object(mod_key || ':' || act, true);
                END LOOP;
            ELSE
                new_perms := new_perms || jsonb_build_object(mod_key, true);
            END IF;
        END LOOP;
        UPDATE winai.amplia_staff_roles
        SET permissions_json = new_perms, updated_at = NOW()
        WHERE id = r.id;
    END LOOP;
END $$;
