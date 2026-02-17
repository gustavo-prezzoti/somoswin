-- Page access token para chamadas ao feed da página (pages_read_engagement exige Page token)
ALTER TABLE winai.meta_connections ADD COLUMN IF NOT EXISTS page_access_token TEXT;
