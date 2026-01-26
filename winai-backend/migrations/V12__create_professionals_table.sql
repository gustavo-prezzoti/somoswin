-- Create professionals table for designers and video editors
CREATE TABLE IF NOT EXISTS professionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255) NOT NULL,
    rating DECIMAL(2,1) NOT NULL DEFAULT 5.0,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    whatsapp VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('DESIGNER', 'EDITOR')),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for type filtering
CREATE INDEX IF NOT EXISTS idx_professionals_type ON professionals(type);
CREATE INDEX IF NOT EXISTS idx_professionals_active ON professionals(active);

-- Insert some sample data
INSERT INTO professionals (name, specialty, rating, price, image_url, whatsapp, type, active) VALUES
('Sofia Davis', 'Brand Identity & UI', 4.9, 1200.00, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop', '+5511999999999', 'DESIGNER', true),
('Lucas Brandão', 'Social Media Design', 4.8, 800.00, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop', '+5511988888888', 'DESIGNER', true),
('Isabela Moraes', 'Motion Graphics', 5.0, 1500.00, 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop', '+5511977777777', 'DESIGNER', true),
('Pedro Alencar', 'Reels & TikTok Pro', 4.9, 500.00, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop', '+5511966666666', 'EDITOR', true),
('Mariana Costa', 'YouTube Vlogs', 4.7, 900.00, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop', '+5511955555555', 'EDITOR', true),
('Tiago Silva', 'Cinematic Edits', 5.0, 2000.00, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop', '+5511944444444', 'EDITOR', true);
