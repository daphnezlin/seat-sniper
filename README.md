# UW Seat Sniper

Get notified immediately a seat opens in any UWaterloo course by text, email, or both.

Live at: https://seat-sniper-ashy.vercel.app

## How it works

1. Enter your phone number and/or email
2. Search for and add courses to follow
3. Get notified immediately when a seat opens

Checks every 60 seconds. Reply STOP to any text to unsubscribe.

## Architecture

```
React (Vercel) → FastAPI (Railway) → PostgreSQL (Supabase)
                        ↓
                   Redis Queue
                        ↓
                  arq Worker (Railway)
                        ↓
               UW Schedule of Classes
```

The API and worker run as separate Railway services. When a user adds a course, the API pushes a job into Redis. The worker pulls jobs, scrapes UW's Schedule of Classes, compares enrollment against the last snapshot, and sends an SMS via Twilio and/or email via SendGrid if a seat opened.

## Tech stack

- **Frontend:** React, deployed on Vercel
- **Backend:** FastAPI (Python), deployed on Railway
- **Job queue:** Redis Cloud + arq (separate worker service)
- **Database:** PostgreSQL (Supabase) + asyncpg
- **SMS notifications:** Twilio
- **Email notifications:** SendGrid
- **Scraping:** httpx + BeautifulSoup against UW's public Schedule of Classes

## Running locally

You need PostgreSQL, Redis, a Twilio account, and a SendGrid account.

**Backend:**
```bash
pip install -r requirements.txt
cp .env.example .env
uvicorn api:app --reload
```

**Worker (separate terminal):**
```bash
python -m arq workers.arq_worker.WorkerSettings
```

**Frontend (separate terminal):**
```bash
cd frontend
npm install
npm start
```

## Environment variables

```
DATABASE_URL=your_supabase_session_pooler_url?sslmode=require     
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE=your_twilio_number
REDIS_URL=redis://your_redis_cloud_endpoint:port
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=your_verified_sender_email
```

## Project structure

```
seat-sniper/
├── api.py              # FastAPI app + endpoints
├── scraper/
│   └── scraper.py      # Fetches + parses UW seat data
├── workers/
│   ├── arq_worker.py   # Redis job queue + scheduler
│   └── checker.py      # Diff engine — detects seat changes
├── notifier/
│   └── notify.py       # Twilio SMS + SendGrid email
├── database/
│   └── db.py           # PostgreSQL queries
└── frontend/           # React app
```
