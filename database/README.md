# Database Schema Documentation

## Overview
This is the proper SQL schema for the Google Treasure Hunt application using Supabase PostgreSQL.

## Tables

### 1. `profiles`
Stores user profile information and game progress.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, references auth.users |
| email | TEXT | User email (unique) |
| role | TEXT | User role: 'user' or 'admin' |
| current_question | INTEGER | Current question number (1-based) |
| last_submission_time | TIMESTAMPTZ | Last time user submitted an answer |
| created_at | TIMESTAMPTZ | Account creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### 2. `questions`
Stores treasure hunt questions.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| desk_string | TEXT | Desk location (e.g., "Desk 402-B") |
| image_url | TEXT | URL to question image |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### 3. `answer_pool`
Stores all valid answers for each question (normalized for matching).

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| question_id | INTEGER | Foreign key to questions.id |
| answer | TEXT | Valid answer text |
| created_at | TIMESTAMPTZ | Creation timestamp |

### 4. `submissions`
Stores all user answer submissions (for history/analytics).

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | UUID | Foreign key to profiles.id |
| question_id | INTEGER | Foreign key to questions.id |
| submitted_answer | TEXT | What the user submitted |
| is_correct | BOOLEAN | Whether answer was correct |
| submitted_at | TIMESTAMPTZ | Submission timestamp |

### 5. `announcements`
Stores admin announcements displayed to all users.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| message | TEXT | Announcement message |
| created_by | UUID | Foreign key to profiles.id (admin) |
| created_at | TIMESTAMPTZ | Creation timestamp |

### 6. `admin_config`
Stores list of admin email addresses.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| admin_email | TEXT | Admin email address (unique) |
| added_at | TIMESTAMPTZ | When admin was added |

## Indexes

Performance indexes are created on:
- `profiles.email` - For login lookups
- `profiles.role` - For admin checks
- `answer_pool.question_id` - For answer validation
- `submissions.user_id` - For user history
- `submissions.question_id` - For question analytics
- `submissions.submitted_at` - For chronological ordering
- `announcements.created_at` - For recent announcements

## Row Level Security (RLS)

RLS is enabled on all tables with the following policies:

### Profiles
- Everyone can view all profiles (for leaderboard)
- Users can only update their own profile

### Questions
- Everyone can view questions

### Answer Pool
- Only admins can view valid answers
- Users cannot see answers (prevents cheating)

### Submissions
- Users can insert their own submissions
- Users can only view their own submission history

### Announcements
- Everyone can view announcements
- Only admins can create announcements

### Admin Config
- Only admins can view and modify

## Seed Data

### Questions
1. **Desk 402-B** - Valid answers: "circuit", "chip"
2. **Desk 215-A** - Valid answers: "keyboard"
3. **Desk 108-C** - Valid answers: "chart", "graph", "analytics"

### Default Users
- **admin@google.com** / admin123 (role: admin) ⚠️ **ONLY EMAIL WITH ADMIN ACCESS (HARDCODED)**
- **user@google.com** / user123 (role: user)

**Important:** Admin role is hardcoded to `admin@google.com` only. All other users automatically get `user` role, even if they sign up. The `/admin/promote` endpoint is disabled.

## Answer Matching Logic

Answers are matched using case-insensitive comparison with whitespace removed:
```sql
LOWER(REPLACE(answer, ' ', '')) = LOWER(REPLACE(submitted_answer, ' ', ''))
```

This means:
- "Circuit" matches "circuit"
- "key board" matches "keyboard"
- "Chart" matches "CHART"

## Usage

### 1. Deploy Schema

**Quick Start:** Run `schema-idempotent.sql` in Supabase SQL Editor
- ✅ Safe to run multiple times
- ✅ No errors if tables exist
- ✅ Seeds data automatically

**Alternative:** Run `reset.sql` then `schema.sql` for clean install

See `QUICKSTART.md` for detailed instructions.

### 2. Deploy Application Functions (Optional)
Run `application-queries.sql` to create SQL functions that can be called via `supabase.rpc()`:

```typescript
// Example: Get leaderboard
const { data } = await supabase.rpc('get_leaderboard', { limit_count: 50 });

// Example: Check answer
const { data } = await supabase.rpc('check_answer', {
  question_id_param: 1,
  submitted_answer: 'circuit'
});

// Example: Submit answer
const { data } = await supabase.rpc('submit_answer', {
  user_id_param: userId,
  question_id_param: 1,
  submitted_answer_param: 'circuit'
});
```

### 3. Test Queries
Use `test-queries.sql` for direct execution in SQL Editor to view data and test functionality.

### 4. Direct Table Queries (Current Implementation)
The current server implementation uses direct table queries:

```typescript
// Get profile
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();

// Get leaderboard
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, email, current_question, last_submission_time')
  .order('current_question', { ascending: false })
  .order('last_submission_time', { ascending: true });

// Check answer
const { data: answers } = await supabase
  .from('answer_pool')
  .select('answer')
  .eq('question_id', questionId);

const isCorrect = answers?.some(a =>
  a.answer.toLowerCase().replace(/\s+/g, '') ===
  submittedAnswer.toLowerCase().replace(/\s+/g, '')
);
```

## Security Notes

1. **SERVICE_ROLE_KEY** is used server-side only for admin operations
2. **ANON_KEY** is used client-side with RLS protecting data
3. Answer pool is never exposed to non-admin users
4. All timestamps use UTC (TIMESTAMPTZ)
5. Email domain is restricted to @google.com in application logic
