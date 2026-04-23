# Database Setup - Quick Start

## 🚀 If you're getting "already exists" errors:

**Run this file:** `schema-idempotent.sql`

1. Open Supabase SQL Editor
2. Copy **ALL** of `schema-idempotent.sql`
3. Paste and click **Run**
4. Done! ✅

This version works even if tables/policies already exist.

---

## 🧹 If you want a completely fresh start:

**Run these 2 files in order:**

1. First: `reset.sql` (cleans everything)
2. Then: `schema.sql` (creates everything fresh)

---

## ✅ Verify it worked:

Run this in SQL Editor:
```sql
SELECT * FROM questions;
```

Expected: 3 rows (Desk 402-B, Desk 215-A, Desk 108-C)

---

## 📋 Files explained:

| File | What it does | When to use |
|------|-------------|-------------|
| `schema-idempotent.sql` | Creates everything, skips if exists | ✅ **Use this one!** Safe to run multiple times |
| `reset.sql` | Deletes everything | When you want to start completely fresh |
| `schema.sql` | Creates everything, fails if exists | First time setup only |
| `test-queries.sql` | View your data | After setup to verify |

---

## 🎯 After database setup:

1. The edge function should automatically work
2. Login with: **admin@google.com** / **admin123** (admin access)
3. Or: **user@google.com** / **user123** (regular user)
4. Or sign up with any **@google.com** email (auto-creates profile)

**Note:** Only `admin@google.com` has admin access (hardcoded). All other users get regular user access automatically.

---

## ❓ Still having issues?

Check `SETUP.md` for detailed troubleshooting.
