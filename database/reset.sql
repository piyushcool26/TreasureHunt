-- Database Reset Script
-- Run this FIRST to clean everything before running schema.sql

-- Drop all policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can view questions" ON questions;
DROP POLICY IF EXISTS "Only admins can view answers" ON answer_pool;
DROP POLICY IF EXISTS "Users can insert own submissions" ON submissions;
DROP POLICY IF EXISTS "Users can view own submissions" ON submissions;
DROP POLICY IF EXISTS "Anyone can view announcements" ON announcements;
DROP POLICY IF EXISTS "Only admins can create announcements" ON announcements;
DROP POLICY IF EXISTS "Only admins can view admin config" ON admin_config;
DROP POLICY IF EXISTS "Only admins can modify admin config" ON admin_config;

-- Drop all functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS get_user_profile(UUID);
DROP FUNCTION IF EXISTS get_leaderboard(INTEGER);
DROP FUNCTION IF EXISTS check_answer(INTEGER, TEXT);
DROP FUNCTION IF EXISTS get_question(INTEGER);
DROP FUNCTION IF EXISTS submit_answer(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS get_submission_history(UUID);
DROP FUNCTION IF EXISTS is_admin(UUID);
DROP FUNCTION IF EXISTS get_question_count();
DROP FUNCTION IF EXISTS get_or_create_profile(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS promote_to_admin(UUID);

-- Drop all tables (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS answer_pool CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS admin_config CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Success message
SELECT 'Database reset complete. Now run schema.sql' AS status;
