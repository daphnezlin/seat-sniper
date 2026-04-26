import asyncio
import sys
import random
sys.path.insert(0, '.')
from database.db import get_watched_courses
from scraper.scraper import scrape_course, parse_sections
from workers.checker import check_and_notify
from notifier.notify import send_sms

CHECK_INTERVAL = 60  # seconds between full sweeps

async def process_course(course_code: str, term: str):
    """Scrape one course and check for changes"""
    try:
        # Split course code into subject and number e.g. "CS246" -> "CS", "246"
        subject = ''.join(filter(str.isalpha, course_code))
        cournum = ''.join(filter(str.isdigit, course_code))

        # Random delay so requests don't look robotic
        await asyncio.sleep(random.uniform(1, 3))

        html = await scrape_course(subject, cournum, term)
        sections = parse_sections(html)

        if not sections:
            print(f"{course_code}: No sections found")
            return

        await check_and_notify(course_code, term, sections, notifier=send_sms)

    except Exception as e:
        print(f"{course_code}: Error — {e}")

async def run_sweep():
    """Check all watched courses once"""
    courses = await get_watched_courses()

    if not courses:
        print("No courses being watched yet")
        return

    print(f"Checking {len(courses)} course(s)...")

    # Check all courses concurrently
    tasks = [process_course(c["course_code"], c["term"]) for c in courses]
    await asyncio.gather(*tasks)

async def main():
    """Run forever, checking courses every CHECK_INTERVAL seconds"""
    print("Seat sniper started!")
    print(f"Checking every {CHECK_INTERVAL} seconds")
    print("Press Ctrl+C to stop\n")

    while True:
        await run_sweep()
        print(f"Sleeping {CHECK_INTERVAL}s...\n")
        await asyncio.sleep(CHECK_INTERVAL)

if __name__ == "__main__":
    asyncio.run(main())