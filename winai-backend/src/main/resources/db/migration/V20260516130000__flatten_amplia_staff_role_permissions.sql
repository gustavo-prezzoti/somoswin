UPDATE winai.amplia_staff_roles
SET permissions_json = COALESCE((
    SELECT jsonb_object_agg(module_name, true)
    FROM (
        SELECT DISTINCT
            CASE
                WHEN position(':' IN key) > 0 THEN split_part(key, ':', 1)
                ELSE key
            END AS module_name
        FROM jsonb_each_text(permissions_json)
        WHERE value::boolean = true
          AND key <> '*'
    ) AS modules
    WHERE module_name IS NOT NULL
      AND module_name <> ''
), '{}'::jsonb)
WHERE permissions_json IS NOT NULL
  AND permissions_json::text <> '{}';
