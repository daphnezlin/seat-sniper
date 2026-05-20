import sys
sys.path.insert(0, '.')
from arq import cron
from arq.connections import RedisSettings
from database.db import get_watched_courses
from scraper.scraper import scrape_course, parse_sections
from workers.checker import check_and_notify
import asyncio
import random
import os

async def check_course_job(ctx, course_code: str, term: str):
    try:
        subject = ''.join(filter(str.isalpha, course_code))
        cournum = ''.join(filter(str.isdigit, course_code))

        await asyncio.sleep(random.uniform(1, 3))

        html = await scrape_course(subject, cournum, term)
        sections = parse_sections(html)

        if not sections:
            return

        from notifier.notify import notify

        async def notifier(watcher, course_code, section, message):
            await notify(
                phone=watcher["user_phone"],
                email=watcher["email"],
                course_code=course_code,
                section=section,
                message=message,
                method=watcher["notify_method"]
            )

        await check_and_notify(course_code, term, sections, notifier=notifier)

    except Exception as e:
        print(f"{course_code}: Failed — {e}")
        raise

async def enqueue_all_courses(ctx):
    courses = await get_watched_courses()
    if not courses:
        return

    for course in courses:
        await ctx['redis'].enqueue_job(
            'check_course_job',
            course['course_code'],
            course['term']
        )

class WorkerSettings:
    functions = [check_course_job]
    cron_jobs = [
        cron(enqueue_all_courses, minute={0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59})
    ]
    redis_settings = RedisSettings.from_dsn(os.getenv("REDIS_URL", "redis://localhost:6379"))
    max_jobs = 10
    job_timeout = 30
    retry_jobs = True
    max_tries = 3