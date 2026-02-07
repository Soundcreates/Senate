import re

SECTION_HEADERS = [
    "skills",
    "experience",
    "projects",
    "education",
    "certifications"
]

def split_by_section(text):
    sections = {}
    current = "other"
    sections[current] = []

    for line in text.split("\n"):
        l = line.strip().lower()
        if any(h in l for h in SECTION_HEADERS):
            current = l
            sections[current] = []
        else:
            sections[current].append(line)

    return {
        k: "\n".join(v).strip()
        for k, v in sections.items()
        if v
    }
