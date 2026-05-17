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
        import urllib.request
        import json as json_lib
        
        data = json_lib.dumps({
            "personalizations": [{"to": [{"email": email}]}],
            "from": {"email": os.getenv("SENDGRID_FROM_EMAIL")},
            "subject": f"Seat opened in {course_code}",
            "content": [{
                "type": "text/plain",
                "value": f"A seat has opened in {course_code}!\n\n{message}\n\nRegister now at quest.uwaterloo.ca before it fills up."
            }]
        }).encode()

        req = urllib.request.Request(
            "https://api.sendgrid.com/v3/mail/send",
            data=data,
            headers={
                "Authorization": f"Bearer {os.getenv('SENDGRID_API_KEY')}",
                "Content-Type": "application/json"
            }
        )
        urllib.request.urlopen(req)
        await log_notification(email, course_code, section, message)
        print(f"Email sent to {email} about {course_code}")
    except Exception as e:
        import traceback
        print(f"Failed to send email to {email}: {e}")
        traceback.print_exc()

async def notify(phone: str, email: str, course_code: str, section: str, message: str, method: str):
    print(f"notify called: method={method}, phone={phone}, email={email}")
    if method == 'sms':
        await send_sms(phone, course_code, section, message)
    elif method == 'email':
        await send_email(email, course_code, section, message)
    elif method == 'both':
        await send_sms(phone, course_code, section, message)
        await send_email(email, course_code, section, message)