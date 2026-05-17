import os
import sys
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
sys.path.insert(0, '.')
from twilio.rest import Client
from dotenv import load_dotenv
from database.db import log_notification

load_dotenv()

twilio_client = Client(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))

async def send_sms(phone: str, course_code: str, section: str, message: str):
    try:
        twilio_client.messages.create(
            body=f"🎓 {course_code} — {section}\n{message}\nRegister now at quest.uwaterloo.ca",
            from_=os.getenv("TWILIO_PHONE"),
            to=phone
        )
        await log_notification(phone, course_code, section, message)
        print(f"SMS sent to {phone} about {course_code}")
    except Exception as e:
        print(f"Failed to send SMS to {phone}: {e}")

async def send_email(email: str, course_code: str, section: str, message: str):
    try:
        msg = MIMEMultipart()
        msg['Subject'] = f"Seat opened in {course_code}"
        msg['From'] = os.getenv("GMAIL_ADDRESS")
        msg['To'] = email

        body = f"""
A seat has opened in {course_code}!

{message}

Register now at quest.uwaterloo.ca before it fills up.

Reply to this email or visit the site to stop watching this course.
        """.strip()

        msg.attach(MIMEText(body, 'plain'))

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(
                os.getenv("GMAIL_ADDRESS"),
                os.getenv("GMAIL_APP_PASSWORD")
            )
            server.send_message(msg)

        await log_notification(email, course_code, "email", message)
        print(f"Email sent to {email} about {course_code}")
    except Exception as e:
        print(f"Failed to send email to {email}: {e}")

async def notify(phone: str, email: str, course_code: str, section: str, message: str, method: str):
    print(f"notify called: method={method}, phone={phone}, email={email}")
    if method == 'sms':
        await send_sms(phone, course_code, section, message)
    elif method == 'email':
        await send_email(email, course_code, section, message)
    elif method == 'both':
        await send_sms(phone, course_code, section, message)
        await send_email(email, course_code, section, message)