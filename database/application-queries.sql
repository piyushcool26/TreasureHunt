-- Application Queries (Parameterized)
-- These are meant to be used in application code with Supabase client
-- NOT for direct execution in SQL Editor (use test-queries.sql for that)

-- Example usage in TypeScript/JavaScript:
-- const { data } = await supabase.rpc('get_user_profile', { user_id: 'uuid-here' });

-- Get user profile with current question info
CREATE OR REPLACE FUNCTION get_user_profile(user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  current_question INTEGER,
  last_submission_time TIMESTAMPTZ,
  desk_string TEXT,
  image_url TEXT
) AS $$
  SELECT
    p.id,
    p.email,
    p.role,
    p.current_question,
    p.last_submission_time,
    q.desk_string,
    q.image_url
  FROM profiles p
  LEFT JOIN questions q ON q.id = p.current_question
  WHERE p.id = user_id;
$$ LANGUAGE sql;

-- Get leaderboard
CREATE OR REPLACE FUNCTION get_leaderboard(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  current_question INTEGER,
  last_submission_time TIMESTAMPTZ
) AS $$
  SELECT
    p.id,
    p.email,
    SPLIT_PART(p.email, '@', 1) as name,
    p.current_question,
    p.last_submission_time
  FROM profiles p
  ORDER BY p.current_question DESC, p.last_submission_time ASC
  LIMIT limit_count;
$$ LANGUAGE sql;

-- Check if answer is correct
CREATE OR REPLACE FUNCTION check_answer(question_id_param INTEGER, submitted_answer TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM answer_pool
    WHERE question_id = question_id_param
    AND LOWER(REPLACE(answer, ' ', '')) = LOWER(REPLACE(submitted_answer, ' ', ''))
  );
$$ LANGUAGE sql;

-- Get question details (without answers)
CREATE OR REPLACE FUNCTION get_question(question_id_param INTEGER)
RETURNS TABLE (
  id INTEGER,
  desk_string TEXT,
  image_url TEXT,
  answer_count BIGINT
) AS $$
  SELECT
    q.id,
    q.desk_string,
    q.image_url,
    COUNT(ap.id) as answer_count
  FROM questions q
  LEFT JOIN answer_pool ap ON ap.question_id = q.id
  WHERE q.id = question_id_param
  GROUP BY q.id;
$$ LANGUAGE sql;

-- Record submission and update progress if correct
CREATE OR REPLACE FUNCTION submit_answer(
  user_id_param UUID,
  question_id_param INTEGER,
  submitted_answer_param TEXT
)
RETURNS TABLE (
  is_correct BOOLEAN,
  new_question INTEGER
) AS $$
DECLARE
  answer_correct BOOLEAN;
BEGIN
  -- Check if answer is correct
  SELECT check_answer(question_id_param, submitted_answer_param) INTO answer_correct;

  -- Record the submission
  INSERT INTO submissions (user_id, question_id, submitted_answer, is_correct)
  VALUES (user_id_param, question_id_param, submitted_answer_param, answer_correct);

  -- If correct, update user progress
  IF answer_correct THEN
    UPDATE profiles
    SET
      current_question = current_question + 1,
      last_submission_time = NOW()
    WHERE id = user_id_param;
  END IF;

  -- Return result
  RETURN QUERY
  SELECT
    answer_correct as is_correct,
    p.current_question as new_question
  FROM profiles p
  WHERE p.id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Get user submission history
CREATE OR REPLACE FUNCTION get_submission_history(user_id_param UUID)
RETURNS TABLE (
  id INTEGER,
  question_id INTEGER,
  desk_string TEXT,
  submitted_answer TEXT,
  is_correct BOOLEAN,
  submitted_at TIMESTAMPTZ
) AS $$
  SELECT
    s.id,
    s.question_id,
    q.desk_string,
    s.submitted_answer,
    s.is_correct,
    s.submitted_at
  FROM submissions s
  JOIN questions q ON q.id = s.question_id
  WHERE s.user_id = user_id_param
  ORDER BY s.submitted_at DESC;
$$ LANGUAGE sql;

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id_param UUID)
RETURNS BOOLEAN AS $$
  SELECT role = 'admin'
  FROM profiles
  WHERE id = user_id_param;
$$ LANGUAGE sql;

-- Get total question count
CREATE OR REPLACE FUNCTION get_question_count()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM questions;
$$ LANGUAGE sql;

-- Get or create profile
CREATE OR REPLACE FUNCTION get_or_create_profile(
  user_id_param UUID,
  email_param TEXT,
  role_param TEXT DEFAULT 'user'
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  current_question INTEGER,
  last_submission_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
  INSERT INTO profiles (id, email, role, current_question, last_submission_time)
  VALUES (user_id_param, email_param, role_param, 1, NOW())
  ON CONFLICT (id)
  DO UPDATE SET updated_at = NOW()
  RETURNING profiles.id, profiles.email, profiles.role, profiles.current_question, profiles.last_submission_time, profiles.created_at;
$$ LANGUAGE sql;

-- Promote user to admin
CREATE OR REPLACE FUNCTION promote_to_admin(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT
) AS $$
  UPDATE profiles
  SET role = 'admin'
  WHERE id = user_id_param
  RETURNING profiles.id, profiles.email, profiles.role;
$$ LANGUAGE sql;
