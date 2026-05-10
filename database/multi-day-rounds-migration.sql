-- Multi-Day Rounds Migration
-- This migration transforms the treasure hunt into a multi-day event system
-- with isolated daily leaderboards and append-only audit logging

-- ============================================
-- STEP 1: Update admin_config table
-- ============================================

-- Add active_round_number to control which day's questions are active
ALTER TABLE admin_config ADD COLUMN IF NOT EXISTS active_round_number INTEGER NOT NULL DEFAULT 1;

-- Ensure there's at least one config row for the active round
INSERT INTO admin_config (admin_email, active_round_number)
VALUES ('system@config', 1)
ON CONFLICT (admin_email) DO NOTHING;

-- ============================================
-- STEP 2: Update questions table
-- ============================================

-- Add round_number (which day/round this question belongs to)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS round_number INTEGER NOT NULL DEFAULT 1;

-- Add display_number (the number shown to users, resets per round)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS display_number INTEGER NOT NULL DEFAULT 1;

-- Update existing questions to be Round 1 with sequential display numbers
UPDATE questions
SET round_number = 1,
    display_number = id
WHERE round_number IS NULL OR display_number IS NULL;

-- Create index for efficient round-based queries
CREATE INDEX IF NOT EXISTS idx_questions_round_display ON questions(round_number, display_number);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Anyone can view questions" ON questions;

-- New RLS: Users can only see questions for the active round
CREATE POLICY "Users can view active round questions" ON questions
  FOR SELECT
  USING (
    round_number = (
      SELECT active_round_number
      FROM admin_config
      ORDER BY id DESC
      LIMIT 1
    )
  );

-- Admin can view all questions
CREATE POLICY "Admins can view all questions" ON questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- STEP 3: Update submissions table (Append-Only)
-- ============================================

-- Add round_number to track which round this submission belongs to
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS round_number INTEGER NOT NULL DEFAULT 1;

-- Create index for efficient round-based queries
CREATE INDEX IF NOT EXISTS idx_submissions_round ON submissions(round_number);
CREATE INDEX IF NOT EXISTS idx_submissions_user_round ON submissions(user_id, round_number);
CREATE INDEX IF NOT EXISTS idx_submissions_user_round_correct ON submissions(user_id, round_number, is_correct);

-- Drop ALL existing policies on submissions
DROP POLICY IF EXISTS "Users can insert own submissions" ON submissions;
DROP POLICY IF EXISTS "Users can view own submissions" ON submissions;

-- CRITICAL: Append-Only Policies
-- Users can INSERT their own submissions
CREATE POLICY "Users can append own submissions" ON submissions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can SELECT their own submissions (read-only)
CREATE POLICY "Users can read own submissions" ON submissions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can SELECT all submissions (read-only for audit)
CREATE POLICY "Admins can read all submissions" ON submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- EXPLICITLY DENY UPDATE AND DELETE FOR ALL USERS (including admins)
-- This makes the table truly append-only at the database level
CREATE POLICY "Deny all updates" ON submissions
  FOR UPDATE
  USING (false);

CREATE POLICY "Deny all deletes" ON submissions
  FOR DELETE
  USING (false);

-- ============================================
-- STEP 4: Update profiles table
-- ============================================

-- Remove the old current_question column (we'll calculate progress dynamically)
ALTER TABLE profiles DROP COLUMN IF EXISTS current_question;

-- Add progress tracking per round (optional - we can also calculate purely from submissions)
-- This is for caching/performance if needed
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS round_progress JSONB DEFAULT '{}'::jsonb;

-- Update existing profiles to have empty progress object
UPDATE profiles
SET round_progress = '{}'::jsonb
WHERE round_progress IS NULL;

-- ============================================
-- STEP 5: Create Leaderboard Function
-- ============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_daily_leaderboard();

-- Create function to get daily leaderboard for active round
CREATE OR REPLACE FUNCTION get_daily_leaderboard()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  name TEXT,
  correct_count BIGINT,
  last_correct_time TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_round INTEGER;
BEGIN
  -- Get the active round number
  SELECT active_round_number INTO current_round
  FROM admin_config
  ORDER BY id DESC
  LIMIT 1;

  -- If no active round found, default to 1
  IF current_round IS NULL THEN
    current_round := 1;
  END IF;

  -- Return leaderboard for the active round only
  RETURN QUERY
  SELECT
    p.id AS user_id,
    p.email,
    SPLIT_PART(p.email, '@', 1) AS name,
    COUNT(s.id) AS correct_count,
    MAX(s.submitted_at) AS last_correct_time
  FROM profiles p
  LEFT JOIN submissions s ON p.id = s.user_id
    AND s.round_number = current_round
    AND s.is_correct = true
  WHERE p.role != 'admin'
  GROUP BY p.id, p.email
  ORDER BY
    correct_count DESC,
    last_correct_time ASC NULLS LAST;
END;
$$;

-- ============================================
-- STEP 6: Create Function to Get User Progress
-- ============================================

DROP FUNCTION IF EXISTS get_user_progress(UUID, INTEGER);

-- Function to calculate user's current question for a given round
CREATE OR REPLACE FUNCTION get_user_progress(
  p_user_id UUID,
  p_round_number INTEGER
)
RETURNS TABLE (
  correct_count BIGINT,
  next_display_number INTEGER,
  is_round_complete BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_correct_count BIGINT;
  v_total_questions INTEGER;
  v_next_display INTEGER;
BEGIN
  -- Count correct submissions for this user in this round
  SELECT COUNT(*) INTO v_correct_count
  FROM submissions
  WHERE user_id = p_user_id
    AND round_number = p_round_number
    AND is_correct = true;

  -- Get total questions in this round
  SELECT COUNT(*) INTO v_total_questions
  FROM questions
  WHERE round_number = p_round_number;

  -- Calculate next display number (1-indexed)
  v_next_display := v_correct_count + 1;

  -- Return the progress
  RETURN QUERY
  SELECT
    v_correct_count,
    v_next_display,
    (v_correct_count >= v_total_questions) AS is_round_complete;
END;
$$;

-- ============================================
-- STEP 7: Seed Data Update (Optional)
-- ============================================

-- Update existing seed questions to be in Round 1
UPDATE questions
SET round_number = 1, display_number = id
WHERE id IN (1, 2, 3);

-- Update existing submissions to be Round 1
UPDATE submissions
SET round_number = 1
WHERE round_number IS NULL OR round_number = 0;

-- ============================================
-- VERIFICATION QUERIES (Run these to verify)
-- ============================================

-- Check admin_config
-- SELECT * FROM admin_config;

-- Check questions structure
-- SELECT id, desk_string, round_number, display_number FROM questions ORDER BY round_number, display_number;

-- Check submissions are append-only (this should succeed)
-- INSERT INTO submissions (user_id, question_id, round_number, submitted_answer, is_correct)
-- VALUES (auth.uid(), 1, 1, 'test', false);

-- Check submissions UPDATE is blocked (this should FAIL)
-- UPDATE submissions SET submitted_answer = 'hacked' WHERE id = 1;

-- Check submissions DELETE is blocked (this should FAIL)
-- DELETE FROM submissions WHERE id = 1;

-- Test leaderboard function
-- SELECT * FROM get_daily_leaderboard();

-- Test progress function
-- SELECT * FROM get_user_progress(auth.uid(), 1);
