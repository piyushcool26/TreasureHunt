-- Test Queries for Supabase SQL Editor
-- These can be run directly without parameters

-- View all profiles
SELECT * FROM profiles;

-- View all questions
SELECT * FROM questions;

-- View all answers in the answer pool
SELECT
  q.id as question_id,
  q.desk_string,
  ap.answer
FROM questions q
LEFT JOIN answer_pool ap ON ap.question_id = q.id
ORDER BY q.id, ap.answer;

-- View leaderboard
SELECT
  p.id,
  p.email,
  SPLIT_PART(p.email, '@', 1) as name,
  p.current_question,
  p.last_submission_time
FROM profiles p
ORDER BY p.current_question DESC, p.last_submission_time ASC
LIMIT 50;

-- View all submissions
SELECT
  s.id,
  p.email as user_email,
  s.question_id,
  q.desk_string,
  s.submitted_answer,
  s.is_correct,
  s.submitted_at
FROM submissions s
JOIN profiles p ON p.id = s.user_id
JOIN questions q ON q.id = s.question_id
ORDER BY s.submitted_at DESC;

-- View all announcements
SELECT
  a.id,
  a.message,
  a.created_at
FROM announcements a
ORDER BY a.created_at DESC;

-- Count total questions
SELECT COUNT(*) as total_questions FROM questions;

-- Count total users
SELECT COUNT(*) as total_users FROM profiles;

-- Count admins
SELECT COUNT(*) as total_admins FROM profiles WHERE role = 'admin';

-- View admin emails
SELECT admin_email FROM admin_config ORDER BY added_at;

-- Get question with answer count
SELECT
  q.id,
  q.desk_string,
  q.image_url,
  COUNT(ap.id) as valid_answer_count
FROM questions q
LEFT JOIN answer_pool ap ON ap.question_id = q.id
GROUP BY q.id, q.desk_string, q.image_url
ORDER BY q.id;

-- Test answer matching (example for question 1 with answer "circuit")
SELECT EXISTS (
  SELECT 1
  FROM answer_pool
  WHERE question_id = 1
  AND LOWER(REPLACE(answer, ' ', '')) = LOWER(REPLACE('circuit', ' ', ''))
) as is_correct;

-- Test answer matching (example for question 1 with wrong answer "mouse")
SELECT EXISTS (
  SELECT 1
  FROM answer_pool
  WHERE question_id = 1
  AND LOWER(REPLACE(answer, ' ', '')) = LOWER(REPLACE('mouse', ' ', ''))
) as is_correct;

-- View user progress statistics
SELECT
  p.email,
  p.role,
  p.current_question,
  COUNT(s.id) as total_submissions,
  SUM(CASE WHEN s.is_correct THEN 1 ELSE 0 END) as correct_answers,
  SUM(CASE WHEN NOT s.is_correct THEN 1 ELSE 0 END) as wrong_answers
FROM profiles p
LEFT JOIN submissions s ON s.user_id = p.id
GROUP BY p.id, p.email, p.role, p.current_question
ORDER BY p.current_question DESC;

-- Clear all submissions (use with caution!)
-- TRUNCATE submissions;

-- Reset all user progress to question 1 (use with caution!)
-- UPDATE profiles SET current_question = 1, last_submission_time = NOW();

-- Delete a specific user by email (use with caution!)
-- DELETE FROM profiles WHERE email = 'test@google.com';
