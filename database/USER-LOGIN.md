# User Login & Profile Creation Logic

## Overview

This document explains how user authentication and profile creation works in the Treasure Hunt application.

## User Roles

There are only 2 roles:
- **admin** - Full access to create announcements
- **user** - Can play the treasure hunt

## Hardcoded Admin Access

**ONLY ONE EMAIL HAS ADMIN ACCESS:**
- Email: `admin@google.com`
- Password: `admin123`
- Role: **admin** (hardcoded, cannot be changed)

**ALL OTHER USERS:**
- Role: **user** (automatic)
- Cannot be promoted to admin

## New User Signup Flow

When a user signs up:

1. **Email validation**
   - Must end with `@google.com`
   - Other domains are rejected

2. **Create in Supabase Auth**
   - User account created with email/password
   - Email auto-confirmed (no verification email)

3. **Create Profile in Database**
   - Automatic profile creation in `profiles` table
   - Role determined by email:
     - `admin@google.com` → role: `admin`
     - Any other email → role: `user`
   - Initial state:
     - `current_question: 1`
     - `last_submission_time: NOW()`

4. **Return Success**
   - User can now login

## Existing User Login Flow

When a user logs in:

1. **Supabase Auth Login**
   - Email/password validated
   - Access token generated

2. **Automatic Profile Check**
   - On first API request with token
   - Server calls `getOrCreateProfile(userId, email)`
   - If profile exists: return it
   - If profile doesn't exist: create it automatically

3. **Role Assignment**
   - Check if email is `admin@google.com`
   - If yes: role = `admin`
   - If no: role = `user`

4. **Role Correction**
   - If existing profile has wrong role (e.g., admin was changed)
   - Automatically corrected to proper role based on email

## Profile Creation Function

```typescript
async function getOrCreateProfile(userId: string, email: string) {
  // Check if profile exists
  const existing = await supabase.from('profiles').select('*').eq('id', userId).single();

  if (existing) {
    // Ensure role is correct
    const correctRole = getUserRole(email);
    if (existing.role !== correctRole) {
      // Fix incorrect role
      await supabase.from('profiles').update({ role: correctRole }).eq('id', userId);
    }
    return existing;
  }

  // Create new profile
  const role = getUserRole(email);
  await supabase.from('profiles').insert({
    id: userId,
    email,
    role,
    current_question: 1,
    last_submission_time: NOW(),
  });
}

function getUserRole(email: string): string {
  return email.toLowerCase() === 'admin@google.com' ? 'admin' : 'user';
}
```

## Database Updates

Every time a user interacts with the system:

### On Signup
- **auth.users** - New user created
- **profiles** - New profile created with proper role

### On Login
- **profiles** - Profile checked/created if missing
- **profiles** - Role corrected if wrong

### On Answer Submission (if correct)
- **submissions** - New row with answer history
- **profiles.current_question** - Incremented by 1
- **profiles.last_submission_time** - Updated to NOW()

### On Answer Submission (if wrong)
- **submissions** - New row with answer history
- No profile update

## Domain Restriction

**Only @google.com emails allowed:**
- Checked on signup
- Checked on all API requests
- Other domains return 403 Forbidden

## Admin Promotion

**The `/admin/promote` endpoint is DISABLED**

It returns:
```json
{
  "error": "Admin promotion disabled. Only admin@google.com has admin access."
}
```

This prevents any user from promoting themselves or others.

## Test Accounts

Two accounts are auto-created on server startup:

| Email | Password | Role |
|-------|----------|------|
| admin@google.com | admin123 | admin |
| user@google.com | user123 | user |

## Security Notes

1. **Admin role is hardcoded** - Cannot be granted through UI or API
2. **Email domain restricted** - Only @google.com
3. **Auto-profile creation** - Users don't need manual approval
4. **Role auto-correction** - If database gets corrupted, roles are fixed automatically
5. **Service role key** - Used server-side only, never exposed to client

## Common Scenarios

### New user signs up with new@google.com
1. User created in Supabase Auth
2. Profile created with role: `user`
3. User can login and play

### Existing user logs in
1. Token validated
2. Profile checked (exists)
3. Role verified (correct)
4. User plays game

### User deleted, then signs up again
1. New Auth user created
2. New profile created (old one gone)
3. Progress reset to question 1

### Database profile deleted but Auth user exists
1. User logs in successfully
2. First API call triggers `getOrCreateProfile()`
3. Profile automatically recreated
4. User continues playing

### Someone tries to make themselves admin
1. `/admin/promote` endpoint returns error
2. Database update rejected (server validates role)
3. Only `admin@google.com` has admin role

## Debugging

To check user profiles:
```sql
SELECT id, email, role, current_question FROM profiles;
```

To check who's admin:
```sql
SELECT email, role FROM profiles WHERE role = 'admin';
```
Expected: Only `admin@google.com`

To manually fix a user's role:
```sql
UPDATE profiles SET role = 'user' WHERE email != 'admin@google.com';
UPDATE profiles SET role = 'admin' WHERE email = 'admin@google.com';
```

To reset a user's progress:
```sql
UPDATE profiles SET current_question = 1 WHERE email = 'user@google.com';
```
