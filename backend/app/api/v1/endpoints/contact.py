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


def _build_notification_html(name: str, email: str, message: str) -> str:
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


def _build_thankyou_html(name: str) -> str:
    return f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:0;background:#ffffff;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0a0a0a 0%,#1a1a2e 100%);padding:40px 32px;text-align:center;">
        <h1 style="color:#00D1FF;font-size:28px;margin:0 0 4px;">auralislabs.</h1>
        <p style="color:#a1a1aa;font-size:13px;margin:0;">ERP, Web Development & Smart Solutions</p>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#0f172a;font-size:22px;margin:0 0 16px;">Hi {name},</h2>
        <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
          Thank you for reaching out to us! We've received your message and our team will review it shortly.
        </p>
        <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
          We typically respond within <strong>24 hours</strong> on business days. If your inquiry is urgent, feel free to call us directly.
        </p>
        <div style="background:#f0fdff;border-left:3px solid #00D1FF;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
          <p style="color:#374151;font-size:14px;margin:0 0 6px;"><strong>Phone:</strong> +91 999 555 0958</p>
          <p style="color:#374151;font-size:14px;margin:0;"><strong>Email:</strong> team@aulab.in</p>
        </div>
        <p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">
          We look forward to working with you!
        </p>
        <p style="color:#374151;font-size:15px;line-height:1.7;margin:16px 0 0;">
          Warm regards,<br>
          <strong>Team auralislabs.</strong>
        </p>
      </div>
      <div style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">
          auralislabs. &mdash; Trivandrum, India &mdash;
          <a href="https://aulab.in" style="color:#00D1FF;text-decoration:none;">aulab.in</a>
        </p>
      </div>
    </div>
    """


SENDER_DISPLAY = "auralislabs. <team@aulab.in>"


def _send_email(to: str, subject: str, plain: str, html: str, reply_to: str = None):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SENDER_DISPLAY
    msg["To"] = to
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(settings.SMTP_EMAIL, settings.SMTP_APP_PASSWORD)
        server.send_message(msg)


@router.post("/send", response_model=ContactResponse)
async def send_contact_email(data: ContactRequest):
    if not settings.SMTP_EMAIL or not settings.SMTP_APP_PASSWORD:
        logger.error("SMTP credentials not configured")
        raise HTTPException(status_code=500, detail="Mail service not configured")

    name = data.name.strip()
    email = data.email.strip()
    message = data.message.strip()

    if not name or not message:
        raise HTTPException(status_code=422, detail="Name and message are required")

    try:
        _send_email(
            to=RECIPIENT,
            subject=f"New Contact Form: {name}",
            plain=f"Name: {name}\nEmail: {email}\n\nMessage:\n{message}",
            html=_build_notification_html(name, email, message),
            reply_to=email,
        )
        logger.info(f"Contact email sent from {email} ({name})")

        try:
            _send_email(
                to=email,
                subject="Thank you for contacting auralislabs.",
                plain=(
                    f"Hi {name},\n\n"
                    "Thank you for reaching out! We've received your message "
                    "and our team will review it shortly.\n\n"
                    "We typically respond within 24 hours on business days.\n\n"
                    "Phone: +91 999 555 0958\n"
                    "Email: team@aulab.in\n\n"
                    "Warm regards,\nTeam auralislabs."
                ),
                html=_build_thankyou_html(name),
            )
            logger.info(f"Thank-you email sent to {email}")
        except Exception as e:
            logger.warning(f"Thank-you email failed for {email}: {e}")

        return ContactResponse(success=True, message="Message sent successfully")
    except smtplib.SMTPAuthenticationError:
        logger.error("SMTP authentication failed")
        raise HTTPException(status_code=500, detail="Mail authentication failed")
    except Exception as e:
        logger.error(f"Failed to send contact email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send message")
