import asyncio
from scraper import scrape_course, parse_sections

async def main():
    print("Fetching CS 246...")
    html = await scrape_course("CS", "246")
    sections = parse_sections(html)

    if not sections:
        print("No sections found — may need to adjust parser")
        print("Raw HTML snippet:")
        print(html[:2000])  # Print first 2000 chars to debug
        return

    for s in sections:
        status = "OPEN ✓" if s["has_open_seat"] else "full"
        print(f"Section {s['section']}: {s['enrolled']}/{s['capacity']} — {status}")
asyncio.run(main())