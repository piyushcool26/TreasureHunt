# What You Need to Do in Supabase Dashboard

## ✅ Edge Function Status
Your edge function `make-server-0b818758` is **DEPLOYED and WORKING** ✅

Test it: https://hvmkjpcwhojuegfyxqdq.supabase.co/functions/v1/make-server-0b818758/health

---

## 🔧 What You MUST Do in Supabase Dashboard

### 1. **Create Database Tables** ⚠️ REQUIRED

**Status:** ❓ Unknown - You need to check this

**Steps:**

1. Go to https://app.supabase.com
2. Select your project: `hvmkjpcwhojuegfyxqdq`
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy ALL contents from `/database/schema-idempotent.sql`
6. Paste into the SQL Editor
7. Click **Run** (or press Ctrl+Enter)

**Expected Output:**
```
questions | answers | status
    3     |    6    | Schema setup complete!
```

**Why:** This creates all the database tables (profiles, questions, answer_pool, submissions, announcements, admin_config)

**File to use:** `database/schema-idempotent.sql` (safe to run multiple times)

---

### 2. **Verify Tables Were Created**

**Steps:**

1. In Supabase dashboard, go to **Table Editor**
2. You should see these tables:
   - ✅ `profiles`
   - ✅ `questions`
   - ✅ `answer_pool`
   - ✅ `submissions`
   - ✅ `announcements`
   - ✅ `admin_config`

**If tables are missing:** Run `schema-idempotent.sql` again

---

### 3. **Verify Edge Function is Deployed** ✅ ALREADY DONE

**Status:** ✅ Working

Your edge function is already deployed and accessible. No action needed.

**Verify it yourself:**
- Go to **Edge Functions** in Supabase dashboard
- You should see: `make-server-0b818758`
- Status should be: **Deployed** ✅

---

### 4. **Check Authentication Settings** (Optional)

**Steps:**

1. Go to **Authentication** → **Providers**
2. Verify **Email** provider is enabled ✅
3. You can disable email confirmation if you want (we auto-confirm anyway)

**Current setup:**
- Email provider: Enabled
- Email confirmation: Disabled in code (auto-confirmed)

---

## 📋 Quick Verification Checklist

Run these SQL queries in **SQL Editor** to verify everything:

### Check if tables exist
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```
**Expected:** 6 tables (admin_config, announcements, answer_pool, profiles, questions, submissions)

### Check if questions were seeded
```sql
SELECT * FROM questions;
```
**Expected:** 3 rows (Desk 402-B, Desk 215-A, Desk 108-C)

### Check if answers were seeded
```sql
SELECT * FROM answer_pool ORDER BY question_id, answer;
```
**Expected:** 6 rows (circuit, chip, keyboard, chart, graph, analytics)

### Check if any profiles exist
```sql
SELECT email, role FROM profiles;
```
**Expected:** Could be empty (profiles created on first login) or have test users

---

## 🚨 Common Issues & Solutions

### Issue: "relation 'profiles' does not exist"
**Solution:** Run `database/schema-idempotent.sql` in SQL Editor

### Issue: "No rows in questions table"
**Solution:** Run the INSERT statements from `schema-idempotent.sql`

### Issue: "Edge function not found"
**Solution:** Wait 30-60 seconds for deployment, then refresh

### Issue: Login fails with "Invalid login credentials"
**Solution:** 
1. Check if `admin@google.com` exists in Auth users
2. Go to **Authentication** → **Users**
3. If missing, server will create it on first startup
4. Wait 10 seconds and try again

---

## 🎯 After Setup Checklist

Once you've run the SQL schema, verify:

- [ ] Tables exist in **Table Editor**
- [ ] Questions table has 3 rows
- [ ] Answer pool table has 6 rows
- [ ] Edge function shows as **Deployed**
- [ ] Can login with `admin@google.com` / `admin123`
- [ ] Dashboard loads after login
- [ ] Leaderboard displays

---

## 📁 File Reference

| File | Purpose | When to Use |
|------|---------|-------------|
| `database/schema-idempotent.sql` | Create all tables + seed data | **RUN THIS FIRST** |
| `database/test-queries.sql` | View data in SQL Editor | After schema is run |
| `database/reset.sql` | Delete everything | If you need fresh start |

---

## 🔗 Quick Links

- **Your Supabase Project:** https://app.supabase.com/project/hvmkjpcwhojuegfyxqdq
- **SQL Editor:** https://app.supabase.com/project/hvmkjpcwhojuegfyxqdq/sql/new
- **Table Editor:** https://app.supabase.com/project/hvmkjpcwhojuegfyxqdq/editor
- **Edge Functions:** https://app.supabase.com/project/hvmkjpcwhojuegfyxqdq/functions
- **Authentication:** https://app.supabase.com/project/hvmkjpcwhojuegfyxqdq/auth/users

---

## ✅ Summary

**You MUST do:**
1. ✅ Run `database/schema-idempotent.sql` in SQL Editor

**Already working:**
2. ✅ Edge function is deployed
3. ✅ Authentication is configured

**Optional:**
4. ⚙️ Check settings in dashboard to familiarize yourself

---

## 🆘 Need Help?

If you're stuck, check:
1. `database/QUICKSTART.md` - Quick setup guide
2. `database/SETUP.md` - Detailed setup instructions
3. `database/QUERY-GUIDE.md` - Which SQL file to use when

**Still stuck?** Check if:
- Tables exist in Table Editor
- Edge function shows in Functions section
- You can see test data when running queries from `test-queries.sql`
