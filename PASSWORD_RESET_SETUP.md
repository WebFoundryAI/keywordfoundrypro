# Password Reset Configuration

## For Development/Testing

To speed up password reset testing, you can disable email confirmation:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/auth/providers)
2. Navigate to: **Authentication → Settings → Email Auth**
3. **Toggle OFF** "Confirm email"
4. Click **Save**

This allows users to reset passwords without confirming via email.

## For Production

Keep "Confirm email" **ENABLED** for security:
- Prevents unauthorized password reset requests
- Verifies user owns the email address
- Protects against account takeover attempts

## Testing Password Reset Flow

1. Go to Sign In page
2. Click "Forgot Password"
3. Enter email address
4. Check email for reset link (if confirmation enabled)
5. Click link to set new password
6. Should redirect to `/research` after successful reset

## Troubleshooting

**Issue**: Password reset link expired
- **Solution**: Links expire after 1 hour. Request a new one.

**Issue**: "Invalid session" error on password reset page
- **Solution**: Link may have been used already. Request a new reset link.

**Issue**: Not receiving reset emails
- **Solution**: Check spam folder, verify email templates in Supabase settings

## Configuration Impact on Development

When "Confirm email" is enabled:
- Password reset emails will include a confirmation step
- Testing is slower due to email verification requirement
- More secure for production environments

When "Confirm email" is disabled:
- Password reset links work immediately
- Faster testing and development iteration
- Use only in development environments
