import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

RECIPIENT = "team@aulab.in"


class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    message: str


class ContactResponse(BaseModel):
    success: bool
    message: str


def _build_html_body(name: str, email: str, message: str) -> str:
    return f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px;">
      <h2 style="color:#0f172a;margin-bottom:4px;">New Contact Form Submission</h2>
      <hr style="border:none;border-top:2px solid #00D1FF;margin:12px 0 24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 12px;font-weight:bold;color:#374151;width:100px;">Name</td>
          <td style="padding:8px 12px;color:#1f2937;">{name}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:bold;color:#374151;">Email</td>
          <td style="padding:8px 12px;color:#1f2937;"><a href="mailto:{email}">{email}</a></td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:bold;color:#374151;vertical-align:top;">Message</td>
          <td style="padding:8px 12px;color:#1f2937;white-space:pre-wrap;">{message}</td>
        </tr>
      </table>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 12px;">
      <p style="color:#9ca3af;font-size:12px;">Sent from aulab.in contact form</p>
    </div>
    """


@router.post("", response_model=ContactResponse)
async def send_contact_email(data: ContactRequest):
    if not settings.SMTP_EMAIL or not settings.SMTP_APP_PASSWORD:
        logger.error("SMTP credentials not configured")
        raise HTTPException(status_code=500, detail="Mail service not configured")

    name = data.name.strip()
    email = data.email.strip()
    message = data.message.strip()

    if not name or not message:
        raise HTTPException(status_code=422, detail="Name and message are required")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"New Contact Form: {name}"
    msg["From"] = settings.SMTP_EMAIL
    msg["To"] = RECIPIENT
    msg["Reply-To"] = email

    plain = f"Name: {name}\nEmail: {email}\n\nMessage:\n{message}"
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(_build_html_body(name, email, message), "html"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(settings.SMTP_EMAIL, settings.SMTP_APP_PASSWORD)
            server.send_message(msg)
        logger.info(f"Contact email sent from {email} ({name})")
        return ContactResponse(success=True, message="Message sent successfully")
    except smtplib.SMTPAuthenticationError:
        logger.error("SMTP authentication failed")
        raise HTTPException(status_code=500, detail="Mail authentication failed")
    except Exception as e:
        logger.error(f"Failed to send contact email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send message")
