-- Common Queries for Treasure Hunt Application
--
-- ⚠️ WARNING: These queries use PostgreSQL parameter placeholders ($1, $2, etc.)
-- ⚠️ They CANNOT be run directly in Supabase SQL Editor!
--
-- This file is for REFERENCE and DOCUMENTATION purposes only.
--
-- For direct testing: Use test-queries.sql instead
-- For application use: Use these patterns in your code with actual values
-- For RPC functions: Use application-queries.sql
--

-- Get user profile with current question info
SELECT
  p.*,
  q.desk_string,
  q.image_url
FROM profiles p
LEFT JOIN questions q ON q.id = p.current_question
WHERE p.id = $1;

-- Get leaderboard (top users by question progress, then by time)
SELECT
  p.id,
  p.email,
  SPLIT_PART(p.email, '@', 1) as name,
  p.current_question,
  p.last_submission_time
FROM profiles p
ORDER BY p.current_question DESC, p.last_submission_time ASC
LIMIT 50;

-- Get question with answer count (without revealing answers)
SELECT
  q.id,
  q.desk_string,
  q.image_url,
  COUNT(ap.id) as answer_count
FROM questions q
LEFT JOIN answer_pool ap ON ap.question_id = q.id
WHERE q.id = $1
GROUP BY q.id;

-- Check if submitted answer is correct
SELECT EXISTS (
  SELECT 1
  FROM answer_pool
  WHERE question_id = $1
  AND LOWER(REPLACE(answer, ' ', '')) = LOWER(REPLACE($2, ' ', ''))
) as is_correct;

-- Get all valid answers for a question (admin only)
SELECT answer
FROM answer_pool
WHERE question_id = $1
ORDER BY answer;

-- Get recent announcements
SELECT
  a.id,
  a.message,
  a.created_at,
  p.email as created_by_email
FROM announcements a
JOIN profiles p ON p.id = a.created_by
ORDER BY a.created_at DESC
LIMIT 20;

-- Record a submission
INSERT INTO submissions (user_id, question_id, submitted_answer, is_correct)
VALUES ($1, $2, $3, $4)
RETURNING id, submitted_at;

-- Update user progress after correct answer
UPDATE profiles
SET
  current_question = current_question + 1,
  last_submission_time = NOW()
WHERE id = $1
RETURNING *;

-- Get total number of questions
SELECT COUNT(*) as total FROM questions;

-- Get user submission history
SELECT
  s.id,
  s.question_id,
  q.desk_string,
  s.submitted_answer,
  s.is_correct,
  s.submitted_at
FROM submissions s
JOIN questions q ON q.id = s.question_id
WHERE s.user_id = $1
ORDER BY s.submitted_at DESC;

-- Check if user is admin
SELECT role = 'admin' as is_admin
FROM profiles
WHERE id = $1;

-- Get or create profile
INSERT INTO profiles (id, email, role, current_question, last_submission_time)
VALUES ($1, $2, $3, 1, NOW())
ON CONFLICT (id)
DO UPDATE SET updated_at = NOW()
RETURNING *;

-- Add admin email to config
INSERT INTO admin_config (admin_email)
VALUES ($1)
ON CONFLICT (admin_email) DO NOTHING;

-- Check if email is in admin list
SELECT EXISTS (
  SELECT 1 FROM admin_config WHERE admin_email = $1
) as is_admin_email;

-- Promote user to admin
UPDATE profiles
SET role = 'admin'
WHERE id = $1
RETURNING *;
