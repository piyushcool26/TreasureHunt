-- Add show_image column to questions table
-- Run this in Supabase SQL Editor

ALTER TABLE questions ADD COLUMN IF NOT EXISTS show_image BOOLEAN NOT NULL DEFAULT false;

-- Update existing questions to have show_image set to false
UPDATE questions SET show_image = false WHERE show_image IS NULL;
