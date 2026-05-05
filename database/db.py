import asyncpg
import json
import os
from dotenv import load_dotenv

load_dotenv()

pool = None

async def get_pool():
    global pool
    if pool is None:
        pool = await asyncpg.create_pool(os.getenv("DATABASE_URL"))
    return pool

async def get_watched_courses(phone: str = ""):
    p = await get_pool()
    if phone:
        rows = await p.fetch(
            "SELECT DISTINCT course_code, term FROM watched_courses WHERE active = true AND user_phone = $1",
            phone
        )
        return [dict(row) for row in rows]
    return []

async def get_watchers(course_code: str, term: str):
    p = await get_pool()
    rows = await p.fetch(
        "SELECT user_phone FROM watched_courses WHERE course_code = $1 AND term = $2 AND active = true",
        course_code, term
    )
    return [row["user_phone"] for row in rows]

async def save_snapshot(course_code: str, term: str, sections: list):
    p = await get_pool()
    await p.execute(
        "INSERT INTO seat_snapshots (course_code, term, sections) VALUES ($1, $2, $3)",
        course_code, term, json.dumps(sections)
    )

async def get_last_snapshot(course_code: str, term: str):
    p = await get_pool()
    row = await p.fetchrow(
        "SELECT sections FROM seat_snapshots WHERE course_code = $1 AND term = $2 ORDER BY scraped_at DESC LIMIT 1",
        course_code, term
    )
    if row:
        return json.loads(row["sections"])
    return None

async def add_watcher(phone: str, course_code: str, term: str):
    p = await get_pool()
    await p.execute(
        "INSERT INTO watched_courses (user_phone, course_code, term) VALUES ($1, $2, $3)",
        phone, course_code, term
    )

async def log_notification(phone: str, course_code: str, section: str, message: str):
    p = await get_pool()
    await p.execute(
        "INSERT INTO notifications (user_phone, course_code, section, message) VALUES ($1, $2, $3, $4)",
        phone, course_code, section, message
    )