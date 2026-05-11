# Environment Variables Setup

## Required Environment Variables

Your Edge Function requires the following environment variables to be set in the Supabase Dashboard.

### How to Set Environment Variables in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** in the left sidebar
3. Click on your **server** function
4. Go to the **Secrets** tab
5. Add the following secrets:

### Required Secrets

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `ADMIN_PASSWORD` | Password for the admin@google.com account | `YourSecurePassword123!` |
| `TEST_USER_PASSWORD` | Password for the user@google.com test account | `TestUserPass456!` |

### Default Values

If these environment variables are not set, the system will use default passwords:
- **ADMIN_PASSWORD**: `defaultAdminPass123`
- **TEST_USER_PASSWORD**: `testUser123`

⚠️ **IMPORTANT**: For production, you MUST set these environment variables to secure passwords. Never use the default values in production!

### After Setting Environment Variables

After adding or updating environment variables:
1. Redeploy your Edge Function:
   ```bash
   supabase functions deploy server
   ```
2. The new environment variables will take effect immediately

### Security Best Practices

✅ **DO:**
- Use strong, unique passwords (minimum 12 characters with mix of uppercase, lowercase, numbers, and symbols)
- Change default passwords immediately
- Store passwords securely (use a password manager)
- Rotate passwords regularly

❌ **DON'T:**
- Commit passwords to version control
- Share passwords in plain text
- Use the same password across multiple environments
- Use default passwords in production
