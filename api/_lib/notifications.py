import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

async def send_email(to: str, subject: str, body_html: str) -> bool:
    """Send an email via SMTP. Returns True on success."""
    host = os.environ.get("SMTP_HOST")
    user = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASS")

    if not all([host, user, password]):
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = user
    msg["To"] = to
    msg.attach(MIMEText(body_html, "html"))

    try:
        with smtplib.SMTP(host, 587) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(msg)
        return True
    except Exception:
        return False

async def send_sms(to: str, body: str) -> bool:
    """Send SMS via Twilio. Returns True on success."""
    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    token = os.environ.get("TWILIO_AUTH_TOKEN")
    from_number = os.environ.get("TWILIO_FROM_NUMBER")

    if not all([sid, token, from_number]):
        return False

    import httpx
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
                auth=(sid, token),
                data={"To": to, "From": from_number, "Body": body},
            )
            return resp.status_code == 201
    except Exception:
        return False
