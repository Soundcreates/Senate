from google import genai
from dotenv import load_dotenv
import os

def load_api_key() -> str:
    load_dotenv()
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY missing")
    return api_key


def create_client(api_key: str) -> genai.Client:
    return genai.Client(api_key=api_key)


def list_model_names(client: genai.Client) -> list[str]:
    return [model.name for model in client.models.list()]


def run_model_listing():
    api_key = load_api_key()
    client = create_client(api_key)
    for model_name in list_model_names(client):
        print(model_name)


if __name__ == "__main__":
    run_model_listing()