"""
app/utils/email_notifications.py
──────────────────────────────────
Email notification stubs.

These functions are called by service methods after significant events.
Actual email delivery (SMTP / SendGrid / SES) is deferred to a later phase.
All functions are currently no-ops that log the intended notification.
"""

import smtplib
from email.message import EmailMessage
import threading
from app.core.logging import get_logger
import os
from dotenv import load_dotenv

# Search for and load the .env file
load_dotenv()

logger = get_logger(__name__)

# SMTP Configuration from Environment
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_ENABLED = bool(os.getenv("SMTP_ENABLED"))

def _send_email_sync(to_email: str, subject: str, content: str):
    """Internal helper to send email via SMTP (synchronous)."""
    try:
        msg = EmailMessage()
        msg.set_content(content)
        msg['Subject'] = subject
        msg['From'] = SMTP_USER
        msg['To'] = to_email

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
            
        logger.info("Successfully sent email to %s", to_email)
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, str(e))

def _send_email_async(to_email: str, subject: str, content: str):
    """Internal helper to send email via SMTP in a background thread."""
    logger.info("Preparing to send email to %s: %s", to_email, subject)
    
    if not SMTP_ENABLED:
        logger.warning("[SMTP DISABLED] Would have sent email to %s: %s\n%s", to_email, subject, content)
        return
        
    thread = threading.Thread(
        target=_send_email_sync,
        args=(to_email, subject, content),
        daemon=True
    )
    thread.start()


def notify_booking_confirmed(user_email: str, booking_id: int, slot_info: dict) -> None:
    """Send booking confirmation email."""
    subject = f"Booking Confirmed: {slot_info.get('facility_name', 'Facility')}"
    content = f"""Hello,

Your booking (ID: {booking_id}) has been successfully confirmed.

Facility: {slot_info.get('facility_name')}
Date: {slot_info.get('date')}
Time: {slot_info.get('start_time')} to {slot_info.get('end_time')}

Thank you for using the Campus Facility Reservation System.
"""
    _send_email_async(user_email, subject, content)


def notify_booking_cancelled(user_email: str, booking_id: int, refund_tokens: int) -> None:
    """Send cancellation confirmation with refund info."""
    subject = f"Booking Cancelled (ID: {booking_id})"
    content = f"""Hello,

Your booking (ID: {booking_id}) has been cancelled.
Tokens refunded to your account: {refund_tokens}

Thank you for using the Campus Facility Reservation System.
"""
    _send_email_async(user_email, subject, content)


def notify_approval_required(recipient_email: str, booking_id: int) -> None:
    """Notify an approver that a booking is awaiting approval."""
    subject = f"Approval Required for Booking ID {booking_id}"
    content = f"""Hello,

A new booking (ID: {booking_id}) has been requested and requires your approval.
Please log in to the system to review this request.

Thank you.
"""
    _send_email_async(recipient_email, subject, content)


def notify_approval_result(user_email: str, booking_id: int, approved: bool) -> None:
    """Notify user of approval outcome."""
    result = "APPROVED" if approved else "REJECTED"
    subject = f"Booking {result}: ID {booking_id}"
    content = f"""Hello,

Your booking request (ID: {booking_id}) has been {result.lower()}.

Thank you for using the Campus Facility Reservation System.
"""
    _send_email_async(user_email, subject, content)
