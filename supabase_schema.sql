-- Create the PNR records table
CREATE TABLE IF NOT EXISTS pnr_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pnr_no VARCHAR(10) UNIQUE NOT NULL,
    train_no VARCHAR(10),
    train_name VARCHAR(150),
    date_of_journey VARCHAR(50),
    from_station VARCHAR(20),
    to_station VARCHAR(20),
    class_code VARCHAR(20),
    passengers JSONB DEFAULT '[]'::jsonb,
    last_status VARCHAR(50),
    raw_response JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for scanning PNRs quickly
CREATE INDEX IF NOT EXISTS idx_pnr_records_pnr_no ON pnr_records(pnr_no);

-- Automatically update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pnr_records_modtime
    BEFORE UPDATE ON pnr_records
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Enable Row Level Security (RLS)
ALTER TABLE pnr_records ENABLE ROW LEVEL SECURITY;

-- Enable Anonymous Access Policy (Insert, Select, Update, Delete)
-- This allows full client-side operations for local dev.
CREATE POLICY "Allow anonymous read" 
    ON pnr_records FOR SELECT 
    USING (true);

CREATE POLICY "Allow anonymous insert" 
    ON pnr_records FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow anonymous update" 
    ON pnr_records FOR UPDATE 
    USING (true);

CREATE POLICY "Allow anonymous delete" 
    ON pnr_records FOR DELETE 
    USING (true);

-- Migration SQL to add location fields to an existing pnr_records table:
-- Run this in your Supabase SQL Editor if you already created the table previously.
-- 
-- ALTER TABLE pnr_records ADD COLUMN IF NOT EXISTS state VARCHAR(100);
-- ALTER TABLE pnr_records ADD COLUMN IF NOT EXISTS district VARCHAR(100);
-- ALTER TABLE pnr_records ADD COLUMN IF NOT EXISTS city VARCHAR(100);

