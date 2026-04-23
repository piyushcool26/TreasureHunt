# SQL Query Files Guide

This directory contains several SQL files. Here's what each one is for:

## 📄 File Overview

### 1. `schema.sql` ✅ **Run this first**
**Purpose:** Creates all database tables, indexes, RLS policies, and seeds initial data.

**How to use:**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Paste the contents of `schema.sql`
4. Click "Run"

**What it creates:**
- All tables (profiles, questions, answer_pool, submissions, announcements, admin_config)
- Indexes for performance
- Row Level Security policies
- Seed data (3 questions with answers, 2 test users)

---

### 2. `test-queries.sql` ✅ **Run these to view data**
**Purpose:** Pre-written queries you can run directly in SQL Editor to view and test data.

**How to use:**
1. Open Supabase SQL Editor
2. Copy individual queries from this file
3. Paste and run them one at a time
4. View results

**Examples:**
```sql
-- View all profiles
SELECT * FROM profiles;

-- View leaderboard
SELECT
  p.id,
  SPLIT_PART(p.email, '@', 1) as name,
  p.current_question
FROM profiles p
ORDER BY p.current_question DESC;

-- Test if answer is correct
SELECT EXISTS (
  SELECT 1 FROM answer_pool
  WHERE question_id = 1
  AND LOWER(REPLACE(answer, ' ', '')) = LOWER(REPLACE('circuit', ' ', ''))
) as is_correct;
```

**NO PARAMETERS NEEDED** - These queries work immediately!

---

### 3. `application-queries.sql` ⚙️ **Optional - Advanced**
**Purpose:** Creates reusable SQL functions that can be called from application code via `supabase.rpc()`.

**How to use:**
1. Run in Supabase SQL Editor (one time setup)
2. Then call from TypeScript/JavaScript:

```typescript
// Instead of complex query in code
const { data } = await supabase.rpc('get_leaderboard', {
  limit_count: 50
});

// Instead of multiple queries
const { data } = await supabase.rpc('submit_answer', {
  user_id_param: userId,
  question_id_param: 1,
  submitted_answer_param: 'circuit'
});
```

**Benefits:**
- Cleaner application code
- Business logic in database
- Better performance (one round trip)
- Easier to maintain

**Note:** The current server implementation uses direct table queries instead of these functions. These are optional performance enhancements.

---

### 4. `queries.sql` ⚠️ **Don't run directly**
**Purpose:** Documentation showing SQL query patterns with parameter placeholders (`$1`, `$2`).

**Problem:** Uses PostgreSQL prepared statement placeholders that don't work in SQL Editor:
```sql
WHERE p.id = $1;  -- ❌ ERROR: there is no parameter $1
```

**This file is for:**
- Reference documentation
- Understanding query patterns
- Copying into application code (then replacing `$1` with actual values)

**Don't use this file for:**
- Direct execution in SQL Editor ❌
- Testing queries ❌

---

## 🎯 Quick Start

**For initial setup:**
1. Run `schema.sql` in SQL Editor ✅

**To view/test data:**
2. Use queries from `test-queries.sql` ✅

**For application development:**
3. Server code uses direct Supabase queries (see `supabase/functions/server/index.tsx`)
4. Optionally run `application-queries.sql` for RPC functions

**For reference:**
5. Read `queries.sql` to understand query patterns

---

## 🔍 Common Tasks

### View all users
```sql
SELECT * FROM profiles;
```
*From: test-queries.sql*

### View leaderboard
```sql
SELECT
  SPLIT_PART(p.email, '@', 1) as name,
  p.current_question
FROM profiles p
ORDER BY p.current_question DESC;
```
*From: test-queries.sql*

### Check if "circuit" is correct for question 1
```sql
SELECT EXISTS (
  SELECT 1 FROM answer_pool
  WHERE question_id = 1
  AND LOWER(REPLACE(answer, ' ', '')) = 'circuit'
);
```
*From: test-queries.sql*

### Reset user progress (testing)
```sql
UPDATE profiles
SET current_question = 1
WHERE email = 'user@google.com';
```
*From: test-queries.sql (commented out)*

---

## ❓ FAQ

**Q: Why does `queries.sql` fail with "no parameter $1"?**
A: It uses PostgreSQL prepared statement syntax meant for application code, not direct execution. Use `test-queries.sql` instead.

**Q: Do I need to run `application-queries.sql`?**
A: No, it's optional. The server currently uses direct table queries which work fine.

**Q: How do I view the current data?**
A: Use queries from `test-queries.sql`.

**Q: How do I reset the database?**
A: Delete all data, then re-run `schema.sql` to reseed.

**Q: Can I modify the schema?**
A: Yes! Edit `schema.sql`, but be careful with existing data. Consider creating migration files for production.
