import sys
sys.path.insert(0, '.')
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database.db import add_watcher, get_watched_courses

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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

@app.get("/courses")
async def list_courses():
    courses = await get_watched_courses()
    return courses

@app.get("/health")
async def health():
    return {"status": "ok"}