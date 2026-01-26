-- Create traffic_advisor_chat table
CREATE TABLE IF NOT EXISTS winai.traffic_advisor_chat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES winai.company(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    last_message TEXT,
    full_history TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for company_id
CREATE INDEX IF NOT EXISTS idx_traffic_advisor_chat_company ON winai.traffic_advisor_chat(company_id);
CREATE INDEX IF NOT EXISTS idx_traffic_advisor_chat_created_at ON winai.traffic_advisor_chat(created_at DESC);
