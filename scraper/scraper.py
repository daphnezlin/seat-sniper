import httpx
from bs4 import BeautifulSoup

URL = "https://classes.uwaterloo.ca/cgi-bin/cgiwrap/infocour/salook.pl"

async def scrape_course(subject: str, cournum: str, term: str = "1265"):
    """
    Fetch seat data for a course from UW's Schedule of Classes.
    subject = "CS", cournum = "246", term = "1265"
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            URL,
            data={
                "level": "under",
                "sess": term,
                "subject": subject.upper(),
                "cournum": cournum,
            },
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
            }
        )
        response.raise_for_status()
        return response.text

def parse_sections(html: str):
    soup = BeautifulSoup(html, "html.parser")
    sections = []

    # Use the second table (index 1) — it's the inner one with clean rows
    tables = soup.find_all("table")
    if len(tables) < 2:
        return sections
    
    inner_table = tables[1]
    rows = inner_table.find_all("tr")

    for row in rows:
        cells = row.find_all("td")
        
        # Section rows have exactly 12 cells
        if len(cells) != 12:
            continue

        comp_sec = cells[1].text.strip()  # e.g. "LEC 001"

        # Skip rows that aren't actual sections
        if not any(t in comp_sec for t in ["LEC", "TUT", "LAB", "TST"]):
            continue

        try:
            enrl_cap = int(cells[6].text.strip())
            enrl_tot = int(cells[7].text.strip())

            sections.append({
                "class_num": cells[0].text.strip(),
                "section": comp_sec,
                "campus": cells[2].text.strip(),
                "capacity": enrl_cap,
                "enrolled": enrl_tot,
                "has_open_seat": enrl_tot < enrl_cap,
                "time": cells[10].text.strip()
            })
        except (ValueError, IndexError):
            continue

    return sections