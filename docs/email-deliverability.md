# Email Deliverability Checklist

This project uses Firebase Authentication's built-in email delivery for password resets.

## Firebase configuration

- Set your password reset action URL to `https://<your-domain>/reset-password`.
- Customize the password reset email template in the Firebase console if needed.
- Keep the From name aligned with your product name/domain.

## Content and UX

- Keep the subject line clear: "Reset your AnimeLegacy password".
- Avoid excessive images, ALL CAPS, or deceptive text.
- Include a plain-text alternative in the Firebase template if you customize it.
