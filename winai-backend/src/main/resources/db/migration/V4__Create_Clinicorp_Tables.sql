-- Migration V4: Create Clinicorp Integration Tables

-- Table: agenda_events (Stores syllabus events synced from Clinicorp)
CREATE TABLE IF NOT EXISTS agenda_events (
    id SERIAL PRIMARY KEY,
    evento_id VARCHAR NOT NULL UNIQUE,
    titulo VARCHAR(500),
    descricao TEXT,
    data TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    data_atomic JSONB, -- Stored as Integer in Python but good to have flexibility, or INTEGER per Python model
    hora_inicio VARCHAR(10),
    hora_fim VARCHAR(10),
    hora_inicio_numero INTEGER,
    profissional VARCHAR(200),
    categoria VARCHAR(200),
    paciente_id VARCHAR(50),
    dentista_id VARCHAR(50),
    tipo VARCHAR(50),
    ocupado BOOLEAN DEFAULT FALSE,
    deletado BOOLEAN DEFAULT FALSE,
    dados_originais JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agenda_events_evento_id ON agenda_events(evento_id);
CREATE INDEX IF NOT EXISTS idx_agenda_events_data ON agenda_events(data);
CREATE INDEX IF NOT EXISTS idx_agenda_events_data_atomic ON agenda_events((data_atomic::text)); -- Cast for index if JSONB, or use INTEGER if column matches strictly
CREATE INDEX IF NOT EXISTS idx_agenda_events_ocupado ON agenda_events(ocupado);

-- Table: profissionais (Stores dentist/professional info)
CREATE TABLE IF NOT EXISTS profissionais (
    id SERIAL PRIMARY KEY,
    profissional_id VARCHAR(50) NOT NULL UNIQUE,
    nome VARCHAR(200) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    dados_originais JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profissionais_profissional_id ON profissionais(profissional_id);
CREATE INDEX IF NOT EXISTS idx_profissionais_ativo ON profissionais(ativo);

-- Table: sync_history (Logs synchronization attempts)
CREATE TABLE IF NOT EXISTS sync_history (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    data_inicio TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    data_fim TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    total_eventos INTEGER DEFAULT 0,
    eventos_ocupados INTEGER DEFAULT 0,
    eventos_livres INTEGER DEFAULT 0,
    total_profissionais INTEGER DEFAULT 0,
    sucesso BOOLEAN DEFAULT TRUE,
    erro TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_history_timestamp ON sync_history(timestamp);

-- Adjust column type for data_atomic to match Python ID if necessary. Python uses Integer.
-- Using INTEGER here to match strictest interpretation of Python model.
ALTER TABLE agenda_events ALTER COLUMN data_atomic TYPE INTEGER USING (data_atomic::text::integer);
