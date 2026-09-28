"""
email_service.py — Outbound transactional email service for TestForge AI.

Handles password reset links and notification emails using smtplib.
Falls back to logging simulated emails in development mode if SMTP is unconfigured.
"""
from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import get_settings
from app.utils.logger import get_logger

settings = get_settings()
logger = get_logger("testforge.email")


class EmailService:
    @staticmethod
    def send_password_reset_email(to_email: str, reset_url: str) -> bool:
        """
        Sends an HTML password reset email to the specified recipient.

        If SMTP is configured in .env, sends live via smtplib.
        Otherwise, logs the reset URL for development testing and returns False.
        """
        subject = "TestForge AI — Reset Your Password"

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your Password — TestForge AI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #07090e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #07090e; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #090d16; border: 1px solid #1e293b; border-radius: 20px; padding: 36px 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="display: inline-block; padding: 8px 16px; background-color: #083344; border: 1px solid #0e7490; border-radius: 9999px; color: #22d3ee; font-size: 12px; font-weight: 600; letter-spacing: 0.05em; font-family: monospace;">
                TESTFORGE AI • PASSWORD RECOVERY
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 16px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.025em;">
                Reset Your Password
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 28px; text-align: center; color: #94a3b8; font-size: 14px; line-height: 1.6;">
              We received a request to reset the password for your account associated with <strong style="color: #e2e8f0;">{to_email}</strong>. Click the button below to choose a new password.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <a href="{reset_url}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #06b6d4; color: #020617; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 12px; box-shadow: 0 4px 14px rgba(6, 182, 212, 0.3);">
                Reset Password &rarr;
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 24px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 20px;">
              This link is valid for <strong style="color: #94a3b8;">1 hour</strong>. If you did not request a password reset, you can safely ignore this email.
            </td>
          </tr>
          <tr>
            <td style="text-align: center; color: #475569; font-size: 11px; word-break: break-all;">
              Direct link: <a href="{reset_url}" style="color: #06b6d4;">{reset_url}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        plain_text = f"""TestForge AI — Password Reset

We received a request to reset your password.
Click the link below to set a new password:
{reset_url}

This link is valid for 1 hour. If you did not request this, please ignore this email.
"""

        # Check if SMTP is configured
        if not settings.smtp_configured:
            logger.info(
                f"[EMAIL_SERVICE] (Simulated / Dev mode) Password reset link for {to_email}:\n"
                f"   URL: {reset_url}"
            )
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.SMTP_FROM_EMAIL
            msg["To"] = to_email

            msg.attach(MIMEText(plain_text, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                if settings.SMTP_USE_TLS:
                    server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)

            logger.info(f"[EMAIL_SERVICE] Password reset email sent successfully to {to_email}")
            return True
        except Exception as exc:
            logger.error(f"[EMAIL_SERVICE] Failed to dispatch email to {to_email}: {exc}")
            return False
