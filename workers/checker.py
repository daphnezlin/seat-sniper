import sys
sys.path.insert(0, '.')
from database.db import get_last_snapshot, save_snapshot, get_watchers

def find_section(sections: list, section_name: str):
    for s in sections:
        if s["section"] == section_name:
            return s
    return None

async def check_and_notify(course_code: str, term: str, current_sections: list, notifier=None):
    previous_sections = await get_last_snapshot(course_code, term)

    if previous_sections is None:
        await save_snapshot(course_code, term, current_sections)

        if notifier:
            open_sections = [s for s in current_sections if s["has_open_seat"]]
            if open_sections:
                section_list = ", ".join(s["section"] for s in open_sections)
                message = f"Seats available right now! Open sections: {section_list}"
                watchers = await get_watchers(course_code, term)
                for watcher in watchers:
                    await notifier(watcher, course_code, "multiple", message)

        print(f"{course_code}: First snapshot saved")
        return

    newly_opened = []
    newly_closed = []

    for current in current_sections:
        previous = find_section(previous_sections, current["section"])
        if previous is None:
            continue

        was_full = not previous["has_open_seat"]
        now_open = current["has_open_seat"]

        if was_full and now_open:
            newly_opened.append(current)
        if not was_full and not now_open:
            newly_closed.append(current)

    if newly_opened and notifier:
        section_list = ", ".join(s["section"] for s in newly_opened)
        spots = sum(s["capacity"] - s["enrolled"] for s in newly_opened)
        message = f"Seat(s) opened! Sections: {section_list} ({spots} total spots)"
        print(f"OPEN: {course_code} — {message}")
        watchers = await get_watchers(course_code, term)
        for watcher in watchers:
            await notifier(watcher, course_code, "multiple", message)

    if newly_closed and notifier:
        section_list = ", ".join(s["section"] for s in newly_closed)
        message = f"Heads up — {section_list} just filled up. Still watching other sections."
        print(f"CLOSED: {course_code} — {message}")
        watchers = await get_watchers(course_code, term)
        for watcher in watchers:
            await notifier(watcher, course_code, "multiple", message)

    await save_snapshot(course_code, term, current_sections)
    print(f"{course_code}: Checked {len(current_sections)} sections")