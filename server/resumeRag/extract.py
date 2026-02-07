import os
import json
from dotenv import load_dotenv
from google import genai
import chromadb

# ------------------ ENV ------------------

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
CHROMA_API_KEY = os.getenv("CHROMA_API_KEY")
CHROMA_TENANT = os.getenv("CHROMA_TENANT")
CHROMA_DATABASE = os.getenv("CHROMA_DATABASE")

if not all([GOOGLE_API_KEY, CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE]):
    raise ValueError("Missing required environment variables")

# ------------------ Gemini ------------------

genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel("models/gemini-flash-latest")

# ------------------ Chroma Cloud ------------------

chroma_client = chromadb.CloudClient(
    api_key=CHROMA_API_KEY,
    tenant=CHROMA_TENANT,
    database=CHROMA_DATABASE
)

collection = chroma_client.get_collection("resume_embeddings")

# ------------------ Prompt ------------------

SKILL_PROMPT = """
You are an expert technical recruiter.

Extract technical skills from the resume content below.
Return ONLY valid JSON in this format:

{
  "languages": [],
  "frameworks": [],
  "tools": [],
  "databases": [],
  "cloud": []
}
"""

# ------------------ Output Dir ------------------

OUTPUT_DIR = "output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ------------------ Helpers ------------------

def get_all_resumes():
    """
    Fetch unique resume filenames from Chroma metadata
    """
    results = collection.get(include=["metadatas"])

    resumes = set()
    for meta in results["metadatas"]:
        if meta and "resume" in meta:
            resumes.add(meta["resume"])

    return sorted(resumes)


def extract_skills_for_resume(resume_name: str):
    """
    Query Chroma Cloud and extract skills for a single resume
    """
    results = collection.query(
        query_texts=["technical skills, programming, frameworks, tools"],
        n_results=8,
        where={"resume": resume_name}
    )

    documents = results.get("documents", [[]])[0]
    if not documents:
        return None

    context = "\n\n".join(documents)

    prompt = SKILL_PROMPT + "\n\nRESUME CONTENT:\n" + context

    response = model.generate_content(
        prompt,
        generation_config={
            "temperature": 0,
            "response_mime_type": "application/json"
        }
    )

    return json.loads(response.text)


# ------------------ Main ------------------

def run():
    print("🔍 Fetching resumes from Chroma Cloud...")
    resumes = get_all_resumes()
    print(f"📄 Found {len(resumes)} resumes")

    for resume in resumes:
        print(f"⚙️  Processing {resume}")

        skills = extract_skills_for_resume(resume)
        if not skills:
            print(f"❌ No data for {resume}")
            continue

        # Output filename: <resume_name>.json
        output_file = resume.replace(".pdf", ".json")
        output_path = os.path.join(OUTPUT_DIR, output_file)

        with open(output_path, "w") as f:
            json.dump(skills, f, indent=2)

    print("✅ All resumes processed")


if __name__ == "__main__":
    run()
