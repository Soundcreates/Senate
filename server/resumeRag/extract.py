import os
import json
from dotenv import load_dotenv
from google import genai

from langchain_chroma import Chroma
from langchain.embeddings.base import Embeddings
from skills import SKILL_PROMPT

# ------------------ ENV ------------------
load_dotenv()
API_KEY = os.getenv("GOOGLE_API_KEY")
if not API_KEY:
    raise ValueError("GOOGLE_API_KEY missing")

# ------------------ Gemini Client ------------------
client = genai.Client(api_key=API_KEY)

# ------------------ Gemini Embeddings (MUST MATCH INGEST) ------------------
class GeminiEmbeddings(Embeddings):
    def embed_documents(self, texts):
        vectors = []
        for t in texts:
            res = client.models.embed_content(
                model="gemini-embedding-001",
                contents=t
            )
            vectors.append(res.embeddings[0].values)
        return vectors

    def embed_query(self, text):
        res = client.models.embed_content(
            model="gemini-embedding-001",
            contents=text
        )
        return res.embeddings[0].values

embedding = GeminiEmbeddings()

# ------------------ Chroma ------------------
db = Chroma(
    persist_directory="chroma_db",
    embedding_function=embedding
)

OUTPUT_DIR = "output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ------------------ Get resume list ------------------
store = db.get()
resume_names = set(meta["resume"] for meta in store["metadatas"])

print(f"📄 Found {len(resume_names)} resumes")

# ------------------ Process each resume ------------------
for resume in resume_names:
    print(f"🔍 Processing {resume}")

    retriever = db.as_retriever(
        search_kwargs={
            "k": 6,
            "filter": {"$and": [
                {"resume": resume},
                {"section": {"$ne": "education"}}
            ]
            }
        }
    )

    docs = retriever.invoke(
        "technical skills, programming languages, frameworks, tools"
    )

    if not docs:
        continue

    context = "\n\n".join(d.page_content for d in docs)

    prompt = (
        SKILL_PROMPT
        + "\n\nRESUME CONTENT:\n"
        + context
    )

    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=prompt,
        config={
            "temperature": 0,
            "response_mime_type": "application/json"
        }
    )

    skills = json.loads(response.text)

    out_file = os.path.join(
        OUTPUT_DIR,
        resume.replace(".pdf", ".json")
    )

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(skills, f, indent=4, ensure_ascii=False)

    print(f"✅ Saved → {out_file}")

print("\n🎉 All resumes processed")
