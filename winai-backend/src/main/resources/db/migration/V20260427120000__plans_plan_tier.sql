-- Faixa do plano (enum UserPlan) desacoplada do slug único em name (permite clones com displayName/preço custom).
ALTER TABLE winai.plans
    ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(32) NOT NULL DEFAULT 'STARTER';

UPDATE winai.plans
SET plan_tier = name
WHERE name IN ('STARTER', 'PRO', 'ENTERPRISE', 'TEST');
