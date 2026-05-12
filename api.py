import sys
sys.path.insert(0, '.')
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database.db import add_watcher, get_watched_courses, get_pool
from workers.worker import run_sweep
from arq.connections import ArqRedis, create_pool, RedisSettings

async def background_worker():
    while True:
        try:
            await run_sweep()
        except Exception as e:
            print(f"Worker error: {e}")
        await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app):
    # Connect to Redis
    app.state.redis = await create_pool(RedisSettings())
    task = asyncio.create_task(background_worker())
    yield
    task.cancel()
    await app.state.redis.close()

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
async def add_watch(req: WatchRequest, request: Request):
    await add_watcher(req.phone, req.course_code.upper(), req.term)
    
    # Push an immediate check job into Redis
    await request.app.state.redis.enqueue_job(
        'check_course_job',
        req.course_code.upper(),
        req.term
    )
    
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
async def list_courses(phone: str = ""):
    courses = await get_watched_courses(phone)
    return courses

@app.get("/health")
async def health():
    return {"status": "ok"}

KNOWN_SUBJECTS = [
    "ACTSC", "AMATH", "ANTH", "ARABIC", "ARBUS", "ARCH", "ARTS", "ARTSC",
    "BIOL", "BME", "BUS", "CHEM", "CHE", "CHINA", "CIVE", "CO", "COMM",
    "CS", "DAC", "DUTCH", "EARTH", "ECON", "ENGL", "ENVE", "ECE", "ERS",
    "FINE", "FR", "GEOG", "GEOL", "GER", "GERON", "GRK", "HIST", "HLTH",
    "HRCS", "HUNG", "ITAL", "JAPAN", "JS", "KIN", "KOREA", "LANG", "LAT",
    "LEGAL", "LS", "MATH", "ME", "MEDVL", "MENV", "MNS", "MOHAWK", "MTE",
    "MSCI", "MUSIC", "NASC", "NE", "OPTOM", "PACS", "PD", "PDARCH", "PDPHRM",
    "PHARM", "PHIL", "PHYS", "PLAN", "PMATH", "PORT", "PSYCH", "REC", "RUSS",
    "SAF", "SCI", "SDS", "SE", "SI", "SMF", "SOC", "SOCWK", "SPAN", "SPCOM",
    "STAT", "STV", "SYDE", "THPERF", "TOUR", "UKRAIN", "UNIV", "VCULT", "WKRPT"
]

@app.get("/search")
async def search_courses(subject: str, term: str = "1265", cournum: str = ""):
    import httpx
    from bs4 import BeautifulSoup

    matched_subjects = [s for s in KNOWN_SUBJECTS if s.startswith(subject.upper())]

    async def fetch_subject(subj):
        try:
            async with httpx.AsyncClient() as client:
                r = await client.post(
                    "https://classes.uwaterloo.ca/cgi-bin/cgiwrap/infocour/salook.pl",
                    data={"level": "under", "sess": term, "subject": subj, "cournum": cournum},
                    headers={"User-Agent": "Mozilla/5.0"}
                )
                soup = BeautifulSoup(r.text, "html.parser")
                courses = []
                for row in soup.find_all("tr"):
                    cells = row.find_all("td")
                    if len(cells) == 4:
                        subj_cell = cells[0].text.strip()
                        catalog = cells[1].text.strip()
                        title = cells[3].text.strip()
                        if subj_cell == subj and catalog.isdigit():
                            courses.append({"code": f"{subj}{catalog}", "title": title})
                return courses
        except:
            return []

    try:
        results = await asyncio.gather(*[fetch_subject(s) for s in matched_subjects])
        all_courses = [course for sublist in results for course in sublist
                       if course["code"].lower().startswith(subject.lower() + cournum.lower())]
        return {"courses": all_courses}
    except Exception as e:
        return {"courses": [], "error": str(e)}