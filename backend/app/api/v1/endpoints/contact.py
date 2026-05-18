import httpx
import logging
import smtplib
from email.message import EmailMessage
import anyio

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

RESEND_API = "https://api.resend.com/emails"
SENDER = "auralislabs. <team@aulab.in>"
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
        <p style="color:#a1a1aa;font-size:13px;margin:0;">ERP, Web Development &amp; Smart Solutions</p>
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


async def _send_email(to: str, subject: str, html: str, reply_to: str = None):
    payload = {
        "from": SENDER,
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if reply_to:
        payload["reply_to"] = reply_to

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            RESEND_API,
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        if resp.status_code not in (200, 201):
            raise Exception(f"Resend API error {resp.status_code}: {resp.text}")
        return resp.json()


def _send_email_smtp(to: str, subject: str, html: str, reply_to: str = None):
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        raise Exception("SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASSWORD missing)")

    from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
    from_name = settings.SMTP_FROM_NAME or "auralislabs"

    msg = EmailMessage()
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = to
    msg["Subject"] = subject
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content("This email contains HTML content. If you cannot view it, please check your email client.")
    msg.add_alternative(html, subtype="html")

    port = settings.SMTP_PORT or 587
    use_tls = port == 587

    with smtplib.SMTP(settings.SMTP_HOST, port) as server:
        server.ehlo()
        if use_tls:
            server.starttls()
            server.ehlo()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)


@router.post("", response_model=ContactResponse)
async def send_contact_email(data: ContactRequest):
    resend_enabled = bool(settings.RESEND_API_KEY)
    if not resend_enabled:
      raise HTTPException(status_code=500, detail="resend service not configured")
    smtp_enabled = bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)
    if not resend_enabled and not smtp_enabled:
        logger.error("Mail service not configured: provide RESEND_API_KEY or SMTP_* settings")
        raise HTTPException(status_code=500, detail="Mail service not configured")

    name = data.name.strip()
    email = data.email.strip()
    message = data.message.strip()

    if not name or not message:
        raise HTTPException(status_code=422, detail="Name and message are required")

    try:
        if resend_enabled:
            await _send_email(
                to=RECIPIENT,
                subject=f"New Contact Form: {name}",
                html=_build_notification_html(name, email, message),
                reply_to=email,
            )
        else:
            await anyio.to_thread.run_sync(
                _send_email_smtp,
                to=RECIPIENT,
                subject=f"New Contact Form: {name}",
                html=_build_notification_html(name, email, message),
                reply_to=email,
            )
        logger.info(f"Contact email sent from {email} ({name})")

        try:
            if resend_enabled:
                await _send_email(
                    to=email,
                    subject="Thank you for contacting auralislabs.",
                    html=_build_thankyou_html(name),
                )
            else:
                await anyio.to_thread.run_sync(
                    _send_email_smtp,
                    to=email,
                    subject="Thank you for contacting auralislabs.",
                    html=_build_thankyou_html(name),
                )
            logger.info(f"Thank-you email sent to {email}")
        except Exception as e:
            logger.warning(f"Thank-you email failed for {email}: {e}")

        return ContactResponse(success=True, message="Message sent successfully")
    except Exception as e:
        logger.error(f"Failed to send contact email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send message")
