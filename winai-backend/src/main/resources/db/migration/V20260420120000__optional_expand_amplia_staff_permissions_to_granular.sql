-- Opcional: reescreve permissions_json de papéis Amplia do formato legado (só nome do módulo = true)
-- para chaves granulares modulo:acao. Alinhado a AmpliaAdminPermissionCatalog (ações por módulo).
-- Flyway costuma estar desabilitado em application.properties; execute manualmente no PostgreSQL se necessário.

DO $$
DECLARE
    r RECORD;
    new_perms JSONB := '{}'::jsonb;
    e RECORD;
    mod_key TEXT;
    act TEXT;
    actions TEXT[];
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
            actions := CASE mod_key
                WHEN 'dashboard' THEN ARRAY['list', 'read']
                WHEN 'financas' THEN ARRAY['list']
                WHEN 'alertas' THEN ARRAY['list', 'update']
                WHEN 'performance' THEN ARRAY['list']
                WHEN 'clientes' THEN ARRAY['list', 'read', 'create', 'update', 'delete']
                WHEN 'usuarios' THEN ARRAY['list', 'read', 'create', 'update', 'delete']
                WHEN 'metaads' THEN ARRAY['list', 'read', 'update']
                WHEN 'metas' THEN ARRAY['list', 'read']
                WHEN 'gestao_equipe' THEN ARRAY['list', 'read', 'create', 'update']
                WHEN 'contratos' THEN ARRAY['list', 'read', 'create', 'update', 'delete']
                WHEN 'consultoria' THEN ARRAY['list', 'read', 'create', 'update']
                WHEN 'instancias' THEN ARRAY['list', 'read', 'create', 'update', 'delete']
                WHEN 'conexoes' THEN ARRAY['list', 'read', 'create', 'update', 'delete']
                WHEN 'agentes' THEN ARRAY['list', 'read', 'create', 'update', 'delete']
                WHEN 'followup' THEN ARRAY['list', 'read', 'update', 'delete']
                WHEN 'prompts' THEN ARRAY[]::TEXT[]
                ELSE ARRAY['list', 'read', 'create', 'update', 'delete']
            END;
            IF array_length(actions, 1) IS NULL OR array_length(actions, 1) = 0 THEN
                new_perms := new_perms || jsonb_build_object(mod_key, true);
                CONTINUE;
            END IF;
            FOREACH act IN ARRAY actions
            LOOP
                new_perms := new_perms || jsonb_build_object(mod_key || ':' || act, true);
            END LOOP;
        END LOOP;
        UPDATE winai.amplia_staff_roles
        SET permissions_json = new_perms, updated_at = NOW()
        WHERE id = r.id;
    END LOOP;
END $$;
