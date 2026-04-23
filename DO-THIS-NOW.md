# ⚠️ DO THIS NOW - Supabase Setup Required

## You Need to Run 1 SQL File in Supabase

### Steps:

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com
   - Select project: `hvmkjpcwhojuegfyxqdq`

2. **Open SQL Editor**
   - Click **SQL Editor** in left sidebar
   - Click **New Query**

3. **Copy & Run the Schema**
   - Open file: `database/schema-idempotent.sql`
   - Copy **ALL** contents
   - Paste into SQL Editor
   - Click **Run** button

4. **Verify Success**
   - Should see: `questions | answers | status`
   - Should see: `3 | 6 | Schema setup complete!`

### That's It! ✅

After running that SQL file:
- ✅ All database tables created
- ✅ Questions seeded
- ✅ Answers seeded
- ✅ Admin user created
- ✅ Test user created

### Then Test:

1. Refresh your app
2. Login with: `admin@google.com` / `admin123`
3. Dashboard should load ✅
4. Leaderboard should work ✅

---

## Already Working (No Action Needed):

- ✅ Edge function deployed
- ✅ Authentication configured
- ✅ Server code deployed

---

## If You Get Errors:

### "policy already exists"
**Solution:** The file handles this automatically, ignore the warning

### "relation does not exist"
**Solution:** Make sure you ran the ENTIRE file, not just parts of it

### "No rows returned"
**Solution:** That's okay, run the file anyway

---

## Quick Links:

- **SQL Editor:** https://app.supabase.com/project/hvmkjpcwhojuegfyxqdq/sql/new
- **Table Editor:** https://app.supabase.com/project/hvmkjpcwhojuegfyxqdq/editor

---

**TL;DR:** Run `database/schema-idempotent.sql` in Supabase SQL Editor. Done! 🎉
