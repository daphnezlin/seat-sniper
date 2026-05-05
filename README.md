# Text Notifications for Course Openings

Get a text when there's an opening in any UWaterloo course.

## What it does

- Search for any UWaterloo course by subject or course code
- Enter your phone number and select a course to track
- Get an SMS notification the moment a seat opens up
- Checks every 60 seconds between 8am–8pm

## Tech stack

- **Frontend:** React, deployed on Vercel
- **Backend:** FastAPI (Python), deployed on Railway
- **Database:** PostgreSQL (asyncpg)
- **SMS:** Twilio
- **Course data:** UWaterloo class schedule scraper

## Running locally

### Frontend
```bash
npm install
npm start
```

### Backend
```bash
pip install -r requirements.txt
cp .env.example .env  # fill in your credentials
uvicorn api:app --reload
```

## Environment variables

Create a `.env` file in the backend directory with the following:

```
DATABASE_URL=your_postgres_url
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_twilio_number
```
