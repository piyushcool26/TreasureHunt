# Database Setup Guide

## Step-by-Step Setup

### 1️⃣ Open Supabase SQL Editor

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### 2️⃣ Run the Schema

**Option A: Clean Install (Recommended if getting errors)**

1. First, run `reset.sql` to clean everything:
   - Copy **ALL** contents of `reset.sql`
   - Paste into Supabase SQL Editor
   - Click **Run**

2. Then run `schema.sql`:
   - Copy **ALL** contents of `schema.sql`
   - Paste into Supabase SQL Editor
   - Click **Run**

**Option B: Idempotent Install (Can run multiple times)**

1. Run `schema-idempotent.sql`:
   - Copy **ALL** contents of `schema-idempotent.sql`
   - Paste into Supabase SQL Editor
   - Click **Run**
   - No errors even if tables/policies already exist!

**Expected result:**
```
questions | answers | status
    3     |    6    | Schema setup complete!
```

**What this did:**
- ✅ Created all tables
- ✅ Created indexes
- ✅ Set up Row Level Security
- ✅ Seeded 3 questions with answers
- ✅ Created 2 test users (admin@google.com, user@google.com)

### 3️⃣ Verify Setup

Run these test queries one at a time:

**Check if questions were created:**
```sql
SELECT * FROM questions;
```
Expected: 3 rows

**Check if answers were created:**
```sql
SELECT * FROM answer_pool;
```
Expected: 6 rows

**Check if tables exist:**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```
Expected: `announcements`, `answer_pool`, `profiles`, `questions`, `submissions`

### 4️⃣ Test Login (After App Deployment)

The schema created these test accounts:

| Email | Password | Role |
|-------|----------|------|
| admin@google.com | admin123 | admin |
| user@google.com | user123 | user |

**Note:** These users are created in Supabase Auth AND have profiles in the database.

### 5️⃣ Optional: Create SQL Functions

If you want to use RPC functions in your application:

1. Open `application-queries.sql`
2. Copy ALL contents
3. Paste into Supabase SQL Editor
4. Click **Run**

Then you can use them in code:
```typescript
const { data } = await supabase.rpc('get_leaderboard', { limit_count: 50 });
```

---

## Troubleshooting

### ❌ "relation already exists" or "policy already exists"
**Problem:** Tables/policies already created

**Solution (Easy):** Use `schema-idempotent.sql` instead - it handles this automatically!

**Solution (Clean Reset):**
1. Run `reset.sql` to drop everything
2. Then run `schema.sql`

### ❌ "there is no parameter $1"
**Problem:** Trying to run `queries.sql` directly

**Solution:** Don't run that file! Use `test-queries.sql` instead.

### ❌ "violates foreign key constraint"
**Problem:** Trying to insert data in wrong order

**Solution:** The `schema.sql` handles the correct order. Run the entire file, don't run queries individually.

### ❌ Users can't login
**Problem:** Users were created in database but not in Supabase Auth

**Solution:** The server code creates users in both places. Make sure the edge function is deployed and running.

---

## Viewing Data

Use queries from `test-queries.sql` to view data:

**View all profiles:**
```sql
SELECT * FROM profiles;
```

**View leaderboard:**
```sql
SELECT
  SPLIT_PART(email, '@', 1) as name,
  current_question
FROM profiles
ORDER BY current_question DESC;
```

**View questions with answers:**
```sql
SELECT
  q.id,
  q.desk_string,
  STRING_AGG(ap.answer, ', ') as valid_answers
FROM questions q
LEFT JOIN answer_pool ap ON ap.question_id = q.id
GROUP BY q.id, q.desk_string
ORDER BY q.id;
```

---

## Database Structure

```
┌─────────────┐
│   auth.users   │ (Supabase Auth)
└──────┬──────┘
       │
       │ (id references)
       ▼
┌─────────────┐
│   profiles    │ (User game progress)
└──────┬──────┘
       │
       │ (many submissions)
       ▼
┌─────────────┐       ┌─────────────┐
│  submissions  │──────▶│  questions   │
└─────────────┘       └──────┬──────┘
                             │
                             │ (many answers)
                             ▼
                      ┌─────────────┐
                      │ answer_pool  │
                      └─────────────┘
```

---

## Next Steps

After database setup:

1. ✅ Verify edge function is deployed (`/supabase/functions/server/index.tsx`)
2. ✅ Test login with admin@google.com / admin123
3. ✅ Check that leaderboard loads
4. ✅ Submit an answer and verify progress updates

---

## Need Help?

- Check `QUERY-GUIDE.md` for explanation of all SQL files
- Check `README.md` for complete schema documentation
- Use `test-queries.sql` for all testing queries
