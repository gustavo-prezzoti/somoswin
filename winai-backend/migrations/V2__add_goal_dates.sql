-- Add start_date and end_date columns to goals table
ALTER TABLE winai.goals ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE winai.goals ADD COLUMN IF NOT EXISTS end_date DATE;

-- Update existing goals to set start_date to created_at date
UPDATE winai.goals 
SET start_date = DATE(created_at)
WHERE start_date IS NULL;
