-- Dias de atendimento e exclusão de feriados
ALTER TABLE winai.agendamento_config ADD COLUMN IF NOT EXISTS attendance_days VARCHAR(100);
ALTER TABLE winai.agendamento_config ADD COLUMN IF NOT EXISTS exclude_holidays BOOLEAN DEFAULT true;

UPDATE winai.agendamento_config SET attendance_days = 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY' WHERE attendance_days IS NULL;
UPDATE winai.agendamento_config SET exclude_holidays = true WHERE exclude_holidays IS NULL;

ALTER TABLE winai.agendamento_config ALTER COLUMN exclude_holidays SET DEFAULT true;
