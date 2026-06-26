"""
OPTO-PROFIT Email Service
=========================
Sends transactional emails (password reset, 2FA, notifications).

Configuration (via environment variables):
    SMTP_HOST         - SMTP server hostname (e.g. smtp.gmail.com)
    SMTP_PORT         - SMTP port, default 587
    SMTP_USERNAME     - SMTP login username
    SMTP_PASSWORD     - SMTP login password
    SMTP_FROM_NAME    - Display name for the From header
    SMTP_FROM_EMAIL   - Sender email address
    SMTP_USE_TLS      - 'true' to use STARTTLS (default: true)

If SMTP_HOST is not set, the service runs in simulation mode:
    - A safe (token-redacted) log entry is written at WARNING level.
    - The raw reset token is NEVER written to any log.
"""

import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger("optoprofit.email")


def _get_smtp_config() -> dict | None:
    """Return SMTP config dict if fully configured, else None (simulation mode)."""
    host = os.getenv("SMTP_HOST", "").strip()
    if not host:
        return None
    return {
        "host": host,
        "port": int(os.getenv("SMTP_PORT", "587")),
        "username": os.getenv("SMTP_USERNAME", ""),
        "password": os.getenv("SMTP_PASSWORD", ""),
        "from_name": os.getenv("SMTP_FROM_NAME", "OPTO-PROFIT"),
        "from_email": os.getenv("SMTP_FROM_EMAIL", "noreply@optoprofit.com"),
        "use_tls": os.getenv("SMTP_USE_TLS", "true").lower() == "true",
    }


def _build_reset_email(to_email: str, reset_url: str, from_name: str, from_email: str) -> MIMEMultipart:
    """Compose the password-reset email as a MIME message."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset Your OPTO-PROFIT Password"
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = to_email

    plain = (
        f"You requested a password reset for your OPTO-PROFIT account.\n\n"
        f"Click the link below to reset your password (expires in 30 minutes):\n"
        f"{reset_url}\n\n"
        f"If you did not request this, you can safely ignore this email.\n"
    )
    html = f"""\
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background: #f5f5f5; padding: 32px;">
  <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 8px; padding: 32px;">
    <h2 style="color: #1a1a2e;">Reset Your Password</h2>
    <p>You requested a password reset for your <strong>OPTO-PROFIT</strong> account.</p>
    <p>Click the button below to reset your password. This link expires in <strong>30 minutes</strong>.</p>
    <a href="{reset_url}"
       style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6c63ff;
              color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">
      Reset Password
    </a>
    <p style="color:#666;font-size:0.85em;">
      If the button doesn't work, copy this link into your browser:<br>
      <a href="{reset_url}">{reset_url}</a>
    </p>
    <hr style="border:none;border-top:1px solid #eee;">
    <p style="color:#999;font-size:0.8em;">
      If you didn't request this, you can safely ignore this email.
    </p>
  </div>
</body>
</html>"""

    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))
    return msg


def send_password_reset_email(to_email: str, reset_token: str, frontend_origin: str) -> bool:
    """
    Send a password reset email.

    Parameters
    ----------
    to_email       : Recipient email address.
    reset_token    : The raw (unhashed) reset token to embed in the reset URL.
    frontend_origin: The base URL of the frontend app.

    Returns
    -------
    bool : True if the email was sent (or simulated), False on SMTP error.

    Security
    --------
    The raw reset_token is NEVER logged. Only a redacted indicator is written
    to the logger so that log aggregators cannot expose the token.
    """
    reset_url = f"{frontend_origin}/reset-password?token={reset_token}"
    smtp_cfg = _get_smtp_config()

    if smtp_cfg is None:
        # Simulation mode — safe log only (no token in log)
        logger.warning(
            "[EMAIL SIMULATION] SMTP not configured. "
            "A password-reset link would have been sent to %s. "
            "To send real emails, set SMTP_HOST, SMTP_USERNAME, and SMTP_PASSWORD in .env.",
            to_email,
        )
        logger.info(
            "[EMAIL SIMULATION] Reset URL preview (first 60 chars): %s...",
            reset_url[:60],
        )
        return True

    try:
        msg = _build_reset_email(
            to_email=to_email,
            reset_url=reset_url,
            from_name=smtp_cfg["from_name"],
            from_email=smtp_cfg["from_email"],
        )
        with smtplib.SMTP(smtp_cfg["host"], smtp_cfg["port"], timeout=10) as server:
            if smtp_cfg["use_tls"]:
                server.starttls()
            if smtp_cfg["username"]:
                server.login(smtp_cfg["username"], smtp_cfg["password"])
            server.sendmail(smtp_cfg["from_email"], [to_email], msg.as_string())

        logger.info("Password reset email dispatched to %s", to_email)
        return True

    except smtplib.SMTPException as exc:
        logger.error("Failed to send password reset email to %s: %s", to_email, exc)
        return False
