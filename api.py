import sys
sys.path.insert(0, '.')
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database.db import add_watcher, get_watched_courses, get_pool
from workers.worker import run_sweep

async def background_worker():
    while True:
        try:
            await run_sweep()
        except Exception as e:
            print(f"Worker error: {e}")
        await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app):
    task = asyncio.create_task(background_worker())
    yield
    task.cancel()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://seat-sniper-ashy.vercel.app"
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

class WatchRequest(BaseModel):
    phone: str
    course_code: str
    term: str

@app.post("/watch")
async def add_watch(req: WatchRequest):
    await add_watcher(req.phone, req.course_code.upper(), req.term)
    
    # Immediately check and notify if seats are open right now
    asyncio.create_task(notify_if_open(req.phone, req.course_code.upper(), req.term))
    
    return {"status": "watching", "course": req.course_code}

async def notify_if_open(phone: str, course_code: str, term: str):
    """Check right now and text the user if seats are already open"""
    try:
        subject = ''.join(filter(str.isalpha, course_code))
        cournum = ''.join(filter(str.isdigit, course_code))

        from scraper.scraper import scrape_course, parse_sections
        from notifier.notify import send_sms

        html = await scrape_course(subject, cournum, term)
        sections = parse_sections(html)

        open_sections = [s for s in sections if s["has_open_seat"]]
        if open_sections:
            section_list = ", ".join(s["section"] for s in open_sections)
            message = f"Seats available right now! Open sections: {section_list}"
            await send_sms(phone, course_code, "multiple", message)
    except Exception as e:
        print(f"Immediate check failed: {e}")

@app.delete("/watch")
async def remove_watch(phone: str, course_code: str, term: str):
    p = await get_pool()
    await p.execute(
        "UPDATE watched_courses SET active = false WHERE user_phone = $1 AND course_code = $2 AND term = $3",
        phone, course_code.upper(), term
    )
    return {"status": "unsubscribed"}

@app.get("/courses")
async def list_courses():
    courses = await get_watched_courses()
    return courses

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/search")
async def search_courses(subject: str, term: str = "1265", cournum: str = ""):
    import httpx
    from bs4 import BeautifulSoup
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                "https://classes.uwaterloo.ca/cgi-bin/cgiwrap/infocour/salook.pl",
                data={"level": "under", "sess": term, "subject": subject.upper(), "cournum": cournum},
                headers={"User-Agent": "Mozilla/5.0"}
            )
            soup = BeautifulSoup(r.text, "html.parser")
            courses = []
            for row in soup.find_all("tr"):
                cells = row.find_all("td")
                if len(cells) == 4:
                    subj = cells[0].text.strip()
                    catalog = cells[1].text.strip()
                    title = cells[3].text.strip()
                    if subj == subject.upper() and catalog.isdigit():
                        courses.append({"code": f"{subject.upper()}{catalog}", "title": title})
            return {"courses": courses}
    except Exception as e:
        return {"courses": [], "error": str(e)}