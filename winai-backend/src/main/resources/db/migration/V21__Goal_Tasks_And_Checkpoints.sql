-- Tarefas operacionais e checkpoints por meta (visão Metas e Objetivos)

CREATE TABLE IF NOT EXISTS winai.goal_tasks (
    id BIGSERIAL PRIMARY KEY,
    goal_id BIGINT NOT NULL REFERENCES winai.goals(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    week SMALLINT NOT NULL CHECK (week >= 1 AND week <= 4),
    level VARCHAR(20) NOT NULL,
    weight INT NOT NULL DEFAULT 1,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    deadline DATE,
    evidencia_obrigatoria BOOLEAN NOT NULL DEFAULT FALSE,
    evidencia_json TEXT,
    task_status VARCHAR(20) NOT NULL DEFAULT 'pendente',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_tasks_goal_id ON winai.goal_tasks(goal_id);

CREATE TABLE IF NOT EXISTS winai.goal_checkpoints (
    id BIGSERIAL PRIMARY KEY,
    goal_id BIGINT NOT NULL REFERENCES winai.goals(id) ON DELETE CASCADE,
    data_prevista DATE NOT NULL,
    data_realizada DATE,
    semana INT,
    status VARCHAR(30) NOT NULL,
    analise_ia_json TEXT,
    ajustes_sugeridos_json TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_checkpoints_goal_id ON winai.goal_checkpoints(goal_id);

ALTER TABLE winai.goals ADD COLUMN IF NOT EXISTS color VARCHAR(64);
ALTER TABLE winai.goals ADD COLUMN IF NOT EXISTS prazo_dias INTEGER DEFAULT 30;
ALTER TABLE winai.goals ADD COLUMN IF NOT EXISTS scenario VARCHAR(40);
ALTER TABLE winai.goals ADD COLUMN IF NOT EXISTS unit VARCHAR(16) DEFAULT '%';
ALTER TABLE winai.goals ADD COLUMN IF NOT EXISTS progresso_resultado INTEGER;
