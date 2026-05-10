# Multi-Day Rounds Architecture - Implementation Guide

## Overview

The treasure hunt application has been refactored to support **multi-day events** with isolated daily leaderboards and an append-only audit trail. This allows running the same game across multiple days (Round 1, Round 2, etc.) with fresh questions each day while maintaining historical data integrity.

## Key Architectural Changes

### 1. Append-Only Submissions Log

The `submissions` table is now the **single source of truth** with strict append-only policies:

- ✅ **INSERT**: Users can create new submissions
- ✅ **SELECT**: Users can read their own submissions; admins can read all
- ❌ **UPDATE**: Completely disabled (via RLS policy)
- ❌ **DELETE**: Completely disabled (via RLS policy)

**Why?** This prevents data tampering and creates a permanent audit trail. Even if admin UI has bugs, the database physically rejects any modification attempts.

### 2. Question Numbering Illusion

Questions now have **TWO** number fields:

- **`id`** (Serial Primary Key): Database internal ID (4, 5, 6, 7...)
- **`round_number`**: Which day/round (1, 2, 3...)
- **`display_number`**: What users see (1, 2, 3... resets per round)

**Example:**
```
Database ID: 7  →  Round 2, Question 3  (Displayed as "Round 2 - Question 3 / 5")
Database ID: 8  →  Round 2, Question 4  (Displayed as "Round 2 - Question 4 / 5")
```

### 3. Daily Isolated Leaderboards

- **No global leaderboard** - only shows results for the active round
- Rankings calculated from `submissions` table filtered by `round_number`
- Rank by: `COUNT(correct)` DESC, then `last_correct_time` ASC
- Users only see questions for the active round (enforced by RLS)

## Database Schema

### New Columns

**`admin_config` table:**
```sql
active_round_number INTEGER DEFAULT 1
```
Controls which round is currently playable.

**`questions` table:**
```sql
round_number INTEGER DEFAULT 1
display_number INTEGER DEFAULT 1
```

**`submissions` table:**
```sql
round_number INTEGER DEFAULT 1
```

### Removed Columns

**`profiles` table:**
- ❌ `current_question` - Progress is now calculated dynamically from submissions

## API Changes

### New Endpoints

**GET `/admin/round`** - Get active round number (admin only)
```json
Response: { "active_round_number": 2 }
```

**PUT `/admin/round`** - Set active round (admin only)
```json
Request: { "round_number": 2 }
Response: { "ok": true, "active_round_number": 2 }
```

### Modified Endpoints

**GET `/me`** - Now returns:
```json
{
  "profile": {
    "id": "...",
    "email": "user@google.com",
    "role": "user",
    "current_display_number": 3,
    "correct_count": 2
  },
  "activeRound": 2,
  "totalQuestions": 5,
  "finished": false
}
```

**GET `/question`** - Now returns:
```json
{
  "question": {
    "id": 7,
    "desk_string": "Desk 402-B",
    "display_number": 3,
    "round_number": 2,
    "image_url": "...",
    "show_image": false
  },
  "finished": false
}
```

**GET `/leaderboard`** - Now returns:
```json
{
  "leaderboard": [
    {
      "id": "...",
      "name": "john",
      "correct_count": 5,
      "last_correct_time": "2026-05-10T..."
    }
  ],
  "activeRound": 2
}
```

**POST `/admin/questions`** - Now requires:
```json
{
  "desk_string": "Desk 402-B",
  "answers": ["answer1", "answer2"],
  "round_number": 2,
  "display_number": 3,
  "image_base64": "...",  // optional
  "image_type": "image/png"  // optional
}
```

## UI Changes

### User View

- **Question Display**: Shows "Round X - Question Y / Z" instead of absolute question number
- **Leaderboard**: Shows "5 ✓" (correct count) instead of "Q6"
- **Progress**: Calculated dynamically from correct submissions in active round

### Admin Panel

- **Question Creation**: Now requires Round Number and Display Number inputs
- **Active Round Control**: Dropdown to switch between rounds (triggers instant refresh for all users)
- **Question List**: Grouped and sorted by round_number, then display_number

## Migration Steps

### Step 1: Run SQL Migration

```bash
# Connect to Supabase SQL Editor and run:
/workspaces/default/code/database/multi-day-rounds-migration.sql
```

This will:
- Add new columns to all tables
- Create append-only RLS policies
- Create leaderboard and progress functions
- Update existing data to Round 1

### Step 2: Verify Database

```sql
-- Check active round
SELECT * FROM admin_config;

-- Check questions structure
SELECT id, desk_string, round_number, display_number 
FROM questions 
ORDER BY round_number, display_number;

-- Test append-only (this should FAIL)
UPDATE submissions SET submitted_answer = 'hacked' WHERE id = 1;

-- Test leaderboard function
SELECT * FROM get_daily_leaderboard();
```

### Step 3: Deploy Server Code

Server code has been automatically updated to:
- Calculate user progress from submissions
- Filter questions by active round
- Enforce round-based RLS policies
- Provide round management endpoints

### Step 4: Deploy Frontend

Frontend has been updated to:
- Display round numbers alongside question numbers
- Show correct counts on leaderboard
- Fetch and display active round information

## Admin Workflows

### Starting a New Day/Round

1. **Create questions for the new round:**
   - Round Number: `2`
   - Display Number: `1, 2, 3...`

2. **Switch active round:**
   - Admin Panel → Select "Round 2"
   - All users instantly switched to new questions
   - Previous round's leaderboard preserved

3. **Users automatically:**
   - See new question set (Round 2)
   - Start fresh (no progress carried over)
   - Previous submissions remain in database

### Viewing Historical Data

- Submissions table contains permanent record of all attempts
- Filter by `round_number` to see specific day's activity
- Leaderboard always shows active round only

## Important Notes

### ⚠️ Data Permanence

- **Submissions cannot be deleted** - This is by design for audit integrity
- To "reset" for a new day, simply increment `active_round_number`
- Old data remains queryable but invisible to users

### 🔒 Security

- RLS policies enforce round isolation at database level
- Users physically cannot see questions from inactive rounds
- Admin cannot accidentally delete submission history

### 📊 Performance

- User progress calculated dynamically (no stale cached values)
- Leaderboard queries optimized with indexes on `(round_number, is_correct)`
- Realtime updates via Supabase channels when round changes

## Troubleshooting

### Users seeing old questions

- Check `active_round_number` in admin_config
- Verify RLS policies are enabled on questions table
- Check browser refresh (may have cached old data)

### Leaderboard showing wrong data

- Leaderboard only shows active round
- Verify `round_number` in submissions matches active round
- Check that `is_correct` flag is set properly

### Cannot create questions

- Ensure `round_number` and `display_number` are provided
- Check for duplicate (round_number, display_number) combinations
- Verify admin role permissions

## Testing Multi-Day Rounds

```sql
-- Insert Round 2 questions
INSERT INTO questions (desk_string, round_number, display_number) VALUES
  ('Desk 501-A', 2, 1),
  ('Desk 502-B', 2, 2),
  ('Desk 503-C', 2, 3);

-- Switch to Round 2
UPDATE admin_config SET active_round_number = 2 WHERE id = 1;

-- Verify users only see Round 2 questions
SELECT * FROM questions WHERE round_number = (
  SELECT active_round_number FROM admin_config ORDER BY id DESC LIMIT 1
);
```

## FAQ

**Q: Can users go back and complete previous rounds?**
A: No. Users can only see and interact with the active round.

**Q: What happens to unfinished Round 1 progress when switching to Round 2?**
A: It's preserved in the database but no longer affects leaderboard. Users start fresh in Round 2.

**Q: Can admins view historical leaderboards?**
A: You'd need to manually query submissions table filtered by round_number. UI only shows active round.

**Q: Can we run multiple rounds simultaneously?**
A: No. Only one round can be active at a time (enforced by single `active_round_number` value).

**Q: How do we prevent duplicate display numbers in the same round?**
A: Consider adding a unique constraint: `UNIQUE (round_number, display_number)` on questions table.

---

**Last Updated:** May 10, 2026  
**Architecture Version:** 2.0 - Multi-Day Rounds
