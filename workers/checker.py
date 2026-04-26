import sys
sys.path.insert(0, '.')
from database.db import get_last_snapshot, save_snapshot, get_watchers

def find_section(sections: list, section_name: str):
    """Find a section by name in a list"""
    for s in sections:
        if s["section"] == section_name:
            return s
    return None

async def check_and_notify(course_code: str, term: str, current_sections: list, notifier=None):
    """
    Compare current seat data to last known state.
    Call notifier if a seat opens up.
    """
    previous_sections = await get_last_snapshot(course_code, term)

    # First time we've seen this course — just save and move on
    if previous_sections is None:
        await save_snapshot(course_code, term, current_sections)
        print(f"{course_code}: First snapshot saved")
        return

    # Compare each section to what we saw last time
    for current in current_sections:
        previous = find_section(previous_sections, current["section"])

        if previous is None:
            continue

        was_full = not previous["has_open_seat"]
        now_open = current["has_open_seat"]

        # Seat just opened — this is what we care about
        if was_full and now_open:
            spots_left = current["capacity"] - current["enrolled"]
            message = f"Seat opened! {spots_left} spot(s) available ({current['enrolled']}/{current['capacity']})"
            print(f"OPEN: {course_code} {current['section']} — {message}")

            if notifier:
                watchers = await get_watchers(course_code, term)
                for phone in watchers:
                    await notifier(phone, course_code, current["section"], message)

        # Seat closed again
        if not was_full and not now_open:
            print(f"CLOSED: {course_code} {current['section']} filled up again")

            if notifier:
                watchers = await get_watchers(course_code, term)
                message = f"Section {current['section']} filled up. Still watching."
                for phone in watchers:
                    await notifier(phone, course_code, current["section"], message)

    # Save the new snapshot
    await save_snapshot(course_code, term, current_sections)
    print(f"{course_code}: Checked {len(current_sections)} sections")