-- Add is_active column to announcements table
-- Run this in Supabase SQL Editor

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Update existing announcements to be active
UPDATE announcements SET is_active = true WHERE is_active IS NULL;
