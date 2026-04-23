# New User Flow - Summary

## ✅ What's Implemented

### Automatic Profile Creation
- ✅ New users sign up with email/password
- ✅ Profile automatically created in database
- ✅ Profile auto-created on first login if missing
- ✅ Role assigned based on email

### Hardcoded Admin Access
- ✅ Only `admin@google.com` gets admin role
- ✅ ALL other users get user role (automatic)
- ✅ Admin promotion endpoint disabled
- ✅ Role auto-corrected if database gets corrupted

### Database Updates
- ✅ On signup: Auth user + Profile created
- ✅ On login: Profile checked/created
- ✅ On correct answer: Progress updated
- ✅ On any answer: Submission recorded

## 🔐 Admin Access

**ONLY ONE EMAIL:**
```
Email: admin@google.com
Password: admin123
Role: admin (hardcoded)
```

**ALL OTHER EMAILS:**
```
Email: anything@google.com
Password: <user choice>
Role: user (automatic)
```

## 🎯 User Signup Process

1. User visits app
2. Clicks "Sign up"
3. Enters email (must end with @google.com)
4. Enters password (min 6 characters)
5. Clicks "Create account"

**What happens:**
- ✅ Email validated (@google.com required)
- ✅ User created in Supabase Auth
- ✅ Profile created in database
- ✅ Role set (admin if admin@google.com, else user)
- ✅ Initial question set to 1
- ✅ User redirected to login

## 🎯 User Login Process

1. User enters email/password
2. Clicks "Sign in"

**What happens:**
- ✅ Credentials validated by Supabase
- ✅ Access token generated
- ✅ Profile checked in database
- ✅ Profile created if missing
- ✅ Role verified/corrected
- ✅ Dashboard loads

## 📊 Database Tables Updated

### On Signup
```sql
-- Supabase Auth (automatic)
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('newuser@google.com', '<hash>', NOW());

-- Profiles (server code)
INSERT INTO profiles (id, email, role, current_question, last_submission_time)
VALUES ('<uuid>', 'newuser@google.com', 'user', 1, NOW());
```

### On Login (if profile missing)
```sql
-- Check profile
SELECT * FROM profiles WHERE id = '<uuid>';

-- Create if missing
INSERT INTO profiles (id, email, role, current_question, last_submission_time)
VALUES ('<uuid>', 'user@google.com', 'user', 1, NOW());
```

### On Correct Answer
```sql
-- Record submission
INSERT INTO submissions (user_id, question_id, submitted_answer, is_correct)
VALUES ('<uuid>', 1, 'circuit', true);

-- Update progress
UPDATE profiles
SET current_question = current_question + 1,
    last_submission_time = NOW()
WHERE id = '<uuid>';
```

## 🔍 How to Test

### Test 1: Sign Up New User
1. Go to app
2. Click "Sign up"
3. Enter: `test@google.com` / `test123`
4. Click "Create account"
5. Login with same credentials
6. ✅ Should see dashboard with Question 1

**Verify in database:**
```sql
SELECT * FROM profiles WHERE email = 'test@google.com';
-- Expected: role = 'user', current_question = 1
```

### Test 2: Admin Access
1. Login with `admin@google.com` / `admin123`
2. ✅ Should see "Admin" button in nav
3. Click "Admin" button
4. ✅ Should see announcement creation panel

**Verify in database:**
```sql
SELECT * FROM profiles WHERE email = 'admin@google.com';
-- Expected: role = 'admin'
```

### Test 3: Regular User (No Admin Access)
1. Login with `user@google.com` / `user123`
2. ✅ Should NOT see "Admin" button
3. Play the game normally

**Verify in database:**
```sql
SELECT * FROM profiles WHERE email = 'user@google.com';
-- Expected: role = 'user'
```

### Test 4: Auto Profile Creation
1. Delete a user's profile:
   ```sql
   DELETE FROM profiles WHERE email = 'user@google.com';
   ```
2. Login with `user@google.com` / `user123`
3. ✅ Dashboard loads successfully
4. Check database:
   ```sql
   SELECT * FROM profiles WHERE email = 'user@google.com';
   -- Expected: Profile exists again!
   ```

### Test 5: Role Auto-Correction
1. Manually corrupt a role:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'user@google.com';
   ```
2. Login with `user@google.com` / `user123`
3. Make any API call (view leaderboard, etc.)
4. Check database:
   ```sql
   SELECT role FROM profiles WHERE email = 'user@google.com';
   -- Expected: role = 'user' (auto-corrected!)
   ```

## 🛡️ Security Features

1. **No manual admin promotion** - Endpoint disabled
2. **Email domain restriction** - Only @google.com
3. **Auto role correction** - Can't hack admin role
4. **Service role key** - Server-side only
5. **Row level security** - Database policies enforce access

## 📝 Code Files

- **Server Logic:** `/supabase/functions/server/index.tsx`
- **Login Component:** `/src/app/components/Login.tsx`
- **Database Schema:** `/database/schema-idempotent.sql`
- **Documentation:** `/database/USER-LOGIN.md`

## 🎓 For Developers

### To add a new admin email (requires code change):
1. Edit `/supabase/functions/server/index.tsx`
2. Change: `const ADMIN_EMAIL = "admin@google.com";`
3. To: `const ADMIN_EMAIL = "newadmin@google.com";`
4. Redeploy server
5. All other users automatically become `user` role

### To allow multiple admins (requires code change):
```typescript
// Replace getUserRole function:
const ADMIN_EMAILS = ["admin@google.com", "admin2@google.com"];

function getUserRole(email: string): string {
  return ADMIN_EMAILS.includes(email.toLowerCase()) ? "admin" : "user";
}
```

## ✅ Checklist

After implementing this, verify:

- [ ] New users can sign up
- [ ] Profiles automatically created
- [ ] admin@google.com has admin access
- [ ] Other users have user access
- [ ] Admin promotion endpoint returns error
- [ ] Deleted profiles auto-recreate on login
- [ ] Wrong roles auto-correct
- [ ] Submissions recorded properly
- [ ] Progress updates correctly
- [ ] Leaderboard shows all users

## 🎉 Result

Users can now:
1. Sign up with any @google.com email
2. Login and play immediately
3. Profiles created automatically
4. Progress tracked in database
5. Only admin@google.com has admin powers

No manual approval needed! 🚀
