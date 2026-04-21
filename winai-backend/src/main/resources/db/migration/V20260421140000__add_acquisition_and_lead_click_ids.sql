-- Aquisição (first-touch) por empresa no cadastro + ids de clique nos leads
ALTER TABLE winai.companies
    ADD COLUMN IF NOT EXISTS acq_utm_source VARCHAR(255),
    ADD COLUMN IF NOT EXISTS acq_utm_medium VARCHAR(255),
    ADD COLUMN IF NOT EXISTS acq_utm_campaign VARCHAR(255),
    ADD COLUMN IF NOT EXISTS acq_utm_content VARCHAR(255),
    ADD COLUMN IF NOT EXISTS acq_utm_term VARCHAR(255),
    ADD COLUMN IF NOT EXISTS acq_gclid VARCHAR(1024),
    ADD COLUMN IF NOT EXISTS acq_fbclid VARCHAR(2048),
    ADD COLUMN IF NOT EXISTS acq_msclkid VARCHAR(1024),
    ADD COLUMN IF NOT EXISTS acq_captured_at TIMESTAMPTZ;

ALTER TABLE winai.leads
    ADD COLUMN IF NOT EXISTS gclid VARCHAR(1024),
    ADD COLUMN IF NOT EXISTS fbclid VARCHAR(2048);
