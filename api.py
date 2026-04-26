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
    return {"status": "watching", "course": req.course_code}

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