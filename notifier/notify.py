import os
import sys
sys.path.insert(0, '.')
from twilio.rest import Client
from dotenv import load_dotenv
from database.db import log_notification

load_dotenv()

client = Client(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))

async def send_sms(phone: str, course_code: str, section: str, message: str):
    try:
        client.messages.create(
            body=f"🎓 {course_code} — {section}\n{message}\nRegister now at quest.uwaterloo.ca",
            from_=os.getenv("TWILIO_PHONE"),
            to=phone
        )
        await log_notification(phone, course_code, section, message)
        print(f"Notified {phone} about {course_code} {section}")
    except Exception as e:
        print(f"Failed to notify {phone}: {e}")