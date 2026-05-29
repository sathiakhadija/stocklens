import os
import smtplib
from email.message import EmailMessage


def send_email(to_email, subject, body):
    host = os.getenv("SMTP_HOST")
    if not host:
        return False, "SMTP_HOST is not configured"

    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")
    sender = os.getenv("SMTP_FROM", username or "no-reply@stocklens.local")
    use_tls = os.getenv("SMTP_USE_TLS", "1") == "1"

    message = EmailMessage()
    message["From"] = sender
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(host, port, timeout=15) as smtp:
        if use_tls:
            smtp.starttls()
        if username and password:
            smtp.login(username, password)
        smtp.send_message(message)

    return True, None
