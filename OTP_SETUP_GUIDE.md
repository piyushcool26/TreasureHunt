# OTP Login Setup Guide

I've added OTP (One-Time Password) login to your app! Users can now choose between:
- **Password Login** - For @google.com accounts (existing system)
- **OTP Login** - For ANY email address (new feature)

## What You Need to Do in Supabase Dashboard

### Step 1: Enable Email OTP
1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **Providers**
3. Click on **Email** to expand it
4. Make sure these settings are configured:
   - ✅ **Enable Email provider** - ON
   - ✅ **Confirm email** - ON (users must verify their email)
   - ✅ **Secure email change** - ON (recommended)
5. Click **Save**

### Step 2: Configure Email Templates (Optional but Recommended)
1. Go to **Authentication** → **Email Templates**
2. Click on **Magic Link** template
3. Customize the email subject and body if desired
4. The OTP code is automatically included via the `{{ .Token }}` variable

### Step 3: Test the Feature
1. Go to your login page
2. Click the **OTP** button (new toggle at the top)
3. Enter any email address
4. Click **Send OTP Code**
5. Check your email for the 6-digit code
6. Enter the code and click **Verify & Sign In**

## How It Works

### Password Login (Existing - @google.com only)
- Users can sign up with @google.com emails
- Password is required
- Instant login (no email verification needed for existing accounts)
- Test accounts: admin@google.com / admin123

### OTP Login (New - ANY email)
- Works with ANY email domain (gmail, yahoo, outlook, etc.)
- No password needed
- Two-step process:
  1. Enter email → Receive 6-digit code via email
  2. Enter code → Login successful
- Auto-creates account on first login

## Important Notes

- **Admin Access**: Only `admin@google.com` gets admin role (hardcoded)
- **Domain Restriction Removed**: OTP users can use any email domain
- **Password Signup**: Still restricted to @google.com for backwards compatibility
- **Session Management**: Both login methods use the same Supabase session system

## Email Delivery

Supabase provides free email delivery for OTP codes, but:
- **Free Tier**: Limited emails per hour
- **Production**: Consider setting up custom SMTP (Resend, SendGrid, AWS SES)
  - Go to **Authentication** → **Email** → **SMTP Settings**

## Security

- OTP codes expire after 60 seconds (Supabase default)
- Each code is single-use only
- Email verification is enforced
- Sessions follow standard Supabase auth security

## Troubleshooting

**"Email not sent"**
- Check Supabase email quota
- Verify email provider settings
- Check spam/junk folder

**"Invalid OTP code"**
- Code may have expired (60 seconds)
- Request a new code
- Check for typos

**"User already exists"**
- If you created a password account first, use password login
- OTP and password accounts with same email are the same user
