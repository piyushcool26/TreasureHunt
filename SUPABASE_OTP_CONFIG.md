# Configure Supabase to Send OTP Codes (Not Magic Links)

## Problem
You're receiving a magic link email instead of an OTP code.

## Solution - Configure Supabase Dashboard

### Step 1: Go to Authentication Settings
1. Open your **Supabase Dashboard**
2. Click **Authentication** in the left sidebar
3. Click **Providers** tab

### Step 2: Configure Email Provider
1. Find **Email** in the providers list and click to expand
2. Make sure these are set:
   - ✅ **Enable Email provider** - ON
   - ✅ **Confirm email** - ON

### Step 3: CRITICAL - Disable Magic Link (Enable OTP)
1. Scroll down in the Email provider section
2. Look for **Email OTP** settings
3. **IMPORTANT**: Find the toggle for:
   - ❌ **Enable email confirmations using secure token** - TURN THIS OFF
   - ✅ **Enable email confirmations** - KEEP THIS ON
4. Click **Save**

### Step 4: Configure OTP Length
1. In the same Email provider section
2. Look for **OTP Expiry** or **Token Settings**
3. If there's an option for **OTP Length**:
   - Set it to **8 digits** (or whatever is configured)
4. Click **Save**

### Alternative Method - Use SQL
If the UI doesn't have the OTP toggle, run this in **SQL Editor**:

```sql
-- Check current auth config
SELECT * FROM auth.config;

-- Update to use OTP instead of magic link
UPDATE auth.config 
SET mailer_secure_email_change_enabled = false,
    mailer_otp_enabled = true;
```

## What Changed in Code
- Updated to accept **8-digit codes** instead of 6
- Added `emailRedirectTo: undefined` to force OTP mode
- Changed placeholder from "123456" to "12345678"

## Test Again After Configuration
1. Go to login page
2. Click **OTP** button
3. Enter: `112516077@ece.iiitp.ac.in`
4. Click **Send OTP Code**
5. You should now receive an **8-digit numeric code** instead of a magic link
6. Enter the code and verify

## Troubleshooting

**Still getting magic link?**
- Clear your browser cache
- Wait 2-3 minutes for Supabase config to propagate
- Try a different email to test
- Check **Authentication** → **Email Templates** to see if it's using the OTP template

**Email not arriving?**
- Check spam/junk folder
- Verify email quota in Supabase (Dashboard → Settings → Usage)
- Try with a different email provider (Gmail, etc.)

**Need custom SMTP?**
For production, set up custom email:
1. Go to **Authentication** → **Email**
2. Scroll to **SMTP Settings**
3. Configure with Resend, SendGrid, or AWS SES
