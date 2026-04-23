# Test Email Added for OTP Testing

**Test Email:** `112516077@ece.iiitp.ac.in`

This email has been temporarily added to test OTP functionality.

## To Test OTP:
1. Go to your login page
2. Click the **OTP** button
3. Enter: `112516077@ece.iiitp.ac.in`
4. Click **Send OTP Code**
5. Check the email inbox for the 6-digit code
6. Enter the code and verify

## After Testing - Remove This Email:

Once you confirm OTP is working, remove the test email by running these edits:

### File: `/workspaces/default/code/supabase/functions/server/index.tsx`

**Remove these lines (around line 17-19):**
```typescript
// TEMPORARY: Test email for OTP functionality
const OTP_TEST_EMAIL = "112516077@ece.iiitp.ac.in"; // TODO: Remove after OTP testing
```

**Remove this check (around line 244-246):**
```typescript
const isOtpTestUser = user.email?.toLowerCase() === OTP_TEST_EMAIL.toLowerCase();
```

**Update this condition (around line 249-251) - remove `&& !isOtpTestUser`:**
```typescript
// Change FROM:
if (!isPasswordUser && !isOtpTestUser) {

// Change TO:
if (!isPasswordUser) {
```

Or just let me know and I'll remove it for you!
