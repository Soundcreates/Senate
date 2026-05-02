import os
from uuid import uuid4
from dotenv import load_dotenv
from google import genai
from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader
from langchain.embeddings.base import Embeddings
import chromadb
from typing import Iterable

def load_api_key() -> str:
    load_dotenv()
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY missing (needed for Gemini embeddings)")
    return api_key


def load_chroma_config() -> dict:
    load_dotenv()
    tenant = os.getenv("CHROMA_TENANT")
    database = os.getenv("CHROMA_DATABASE")
    api_key = os.getenv("CHROMA_API_KEY")
    missing = [name for name, value in [("CHROMA_TENANT", tenant), ("CHROMA_DATABASE", database), ("CHROMA_API_KEY", api_key)] if not value]
    if missing:
        raise ValueError(f"Missing Chroma Cloud config: {', '.join(missing)}")
    return {"tenant": tenant, "database": database, "api_key": api_key}


def create_gemini_client(api_key: str) -> genai.Client:
    return genai.Client(api_key=api_key)

# ------------------ Gemini Embeddings ------------------

class GeminiEmbeddings(Embeddings):
    def __init__(self, gemini_client: genai.Client):
        self.client = gemini_client

    def embed_documents(self, texts):
        vectors = []
        for t in texts:
            res = self.client.models.embed_content(
                model="models/gemini-embedding-001",
                contents=t
            )
            # EmbedContentResponse → list[ContentEmbedding]
            vectors.append(res.embeddings[0].values)
        return vectors

    def embed_query(self, text):
        res = self.client.models.embed_content(
            model="models/gemini-embedding-001",
            contents=text
        )
        return res.embeddings[0].values


def list_resume_files(resume_dir: str) -> list[str]:
    if not os.path.isdir(resume_dir):
        raise FileNotFoundError(f"Resume directory not found: {resume_dir}")
    return [f for f in os.listdir(resume_dir) if f.lower().endswith(".pdf")]


def load_resume_text(resume_dir: str, filename: str) -> str:
    loader = PyPDFLoader(os.path.join(resume_dir, filename))
    pages = loader.load()
    return "\n".join(page.page_content for page in pages)


def split_resume_sections(full_text: str) -> dict[str, list[str]]:
    sections = {
        "skills": [],
        "experience": [],
        "projects": [],
        "education": [],
        "other": []
    }

    current = "other"
    for line in full_text.split("\n"):
        line_lower = line.lower()
        if "skill" in line_lower:
            current = "skills"
        elif "experience" in line_lower:
            current = "experience"
        elif "project" in line_lower:
            current = "projects"
        elif "education" in line_lower:
            current = "education"
        sections[current].append(line)

    return sections


def build_documents_for_resume(
    full_text: str,
    filename: str,
    user_id: str | None = None,
    source_id: str | None = None,
    resume_url: str | None = None,
) -> list[Document]:
    sections = split_resume_sections(full_text)
    documents: list[Document] = []

    for section, content in sections.items():
        text = "\n".join(content).strip()
        if text:
            documents.append(
                Document(
                    page_content=text,
                    metadata={
                        "section": section,
                        "resume": filename,
                        "user_id": user_id,
                        "source_id": source_id,
                        "resume_url": resume_url,
                    }
                )
            )
    return documents


def build_documents(
    resume_dir: str,
    user_id: str | None = None,
    source_id: str | None = None,
    resume_url: str | None = None,
) -> list[Document]:
    documents: list[Document] = []
    for filename in list_resume_files(resume_dir):
        full_text = load_resume_text(resume_dir, filename)
        documents.extend(
            build_documents_for_resume(
                full_text,
                filename,
                user_id=user_id,
                source_id=source_id,
                resume_url=resume_url,
            )
        )
    return documents


def create_chroma_collection(collection_name: str):
    config = load_chroma_config()
    print("Tenant:", config["tenant"])
    print("Database:", config["database"])
    print("API Key present:", True)

    chroma_client = chromadb.CloudClient(
        api_key=config["api_key"],
        tenant=config["tenant"],
        database=config["database"],
    )
    return chroma_client.get_or_create_collection(name=collection_name)


def prepare_upload_payload(documents: Iterable[Document]):
    texts = []
    metadatas = []
    ids = []

    for index, document in enumerate(documents):
        texts.append(document.page_content)
        metadatas.append(document.metadata)
        base_id = document.metadata.get("source_id") or document.metadata.get("resume") or uuid4().hex
        ids.append(f"{base_id}_{index}")

    return texts, metadatas, ids


def run_ingestion(
    resume_dir: str = "Resumes",
    collection_name: str = "resume_embeddings",
    user_id: str | None = None,
    resume_url: str | None = None,
    source_id: str | None = None,
):
    api_key = load_api_key()
    gemini_client = create_gemini_client(api_key)
    embedding = GeminiEmbeddings(gemini_client)

    source_id = source_id or uuid4().hex
    documents = build_documents(
        resume_dir,
        user_id=user_id,
        source_id=source_id,
        resume_url=resume_url,
    )
    if not documents:
        print("No resume documents found to ingest.")
        return

    collection = create_chroma_collection(collection_name)
    texts, metadatas, ids = prepare_upload_payload(documents)
    embeddings = embedding.embed_documents(texts)

    collection.add(
        documents=texts,
        embeddings=embeddings,
        metadatas=metadatas,
        ids=ids
    )

    print(f"✅ Uploaded {len(texts)} embeddings to Chroma Cloud")
    print("Total vectors in cloud:", collection.count())


if __name__ == "__main__":
    run_ingestion()
