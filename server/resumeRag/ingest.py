import os
from dotenv import load_dotenv
from google import genai
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader
from langchain.embeddings.base import Embeddings
import chromadb
from chromadb.config import Settings

# ------------------ ENV ------------------
load_dotenv()
API_KEY = os.getenv("GOOGLE_API_KEY")
if not API_KEY:
    raise ValueError("GOOGLE_API_KEY missing")

# ------------------ Gemini Client ------------------
client = genai.Client(api_key=API_KEY)

# ------------------ Gemini Embeddings ------------------

class GeminiEmbeddings(Embeddings):
    def embed_documents(self, texts):
        vectors = []
        for t in texts:
            res = client.models.embed_content(
                model="models/gemini-embedding-001",
                contents=t
            )
            # EmbedContentResponse → list[ContentEmbedding]
            vectors.append(res.embeddings[0].values)
        return vectors

    def embed_query(self, text):
        res = client.models.embed_content(
            model="models/gemini-embedding-001",
            contents=text
        )
        return res.embeddings[0].values


# ------------------ Paths ------------------
RESUME_DIR = "Resumes"

embedding = GeminiEmbeddings()
docs = []

# ------------------ Load & chunk resumes ------------------
for file in os.listdir(RESUME_DIR):
    if not file.lower().endswith(".pdf"):
        continue

    loader = PyPDFLoader(os.path.join(RESUME_DIR, file))
    pages = loader.load()
    full_text = "\n".join(p.page_content for p in pages)

    sections = {
        "skills": [],
        "experience": [],
        "projects": [],
        "education": [],
        "other": []
    }

    current = "other"
    for line in full_text.split("\n"):
        l = line.lower()
        if "skill" in l:
            current = "skills"
        elif "experience" in l:
            current = "experience"
        elif "project" in l:
            current = "projects"
        elif "education" in l:
            current = "education"
        sections[current].append(line)

    for section, content in sections.items():
        text = "\n".join(content).strip()
        if text:
            docs.append(
                Document(
                    page_content=text,
                    metadata={
                        "section": section,
                        "resume": file
                    }
                )
            )

# ------------------ Chroma Cloud Client ------------------
print("Tenant:", os.getenv("CHROMA_TENANT"))
print("Database:", os.getenv("CHROMA_DATABASE"))
print("API Key present:", bool(os.getenv("CHROMA_API_KEY")))

chroma_client = chromadb.CloudClient(
  api_key='ck-67rfSM5s9qDEdmkLR4SXZoXjEpDa2paFXtuzRcSUzJis',
  tenant='f22027e1-86e5-4294-bd9b-a536edc1ef9a',
  database='Datathon-26'
)


collection = chroma_client.get_or_create_collection(
    name="resume_embeddings"
)

# ------------------ Prepare data for upload ------------------
texts = []
metadatas = []
ids = []

for i, doc in enumerate(docs):
    texts.append(doc.page_content)
    metadatas.append(doc.metadata)
    ids.append(f"{doc.metadata['resume']}_{i}")

# ------------------ Generate embeddings ------------------
embeddings = embedding.embed_documents(texts)

# ------------------ Upload to Chroma Cloud ------------------
collection.add(
    documents=texts,
    embeddings=embeddings,
    metadatas=metadatas,
    ids=ids
)

print(f"✅ Uploaded {len(texts)} embeddings to Chroma Cloud")
print("Total vectors in cloud:", collection.count())
