# Senate (Datathon 2026)

Full-stack developer productivity platform with:
- a React frontend,
- an Express API backend,
- a FastAPI + Chroma resume-ingestion/embedding service,
- and Solidity escrow/reward contracts.

The platform supports onboarding, OAuth integrations (GitHub/WakaTime), task/project tracking, scoring, and resume vectorization for downstream recommendation workflows.

## Repository Structure

```text
.
├── client/        # React + Vite frontend
├── server/        # Node.js + Express API (auth, projects, resume upload, etc.)
├── resumeRag/     # FastAPI service for resume ingestion and embeddings
├── contracts/     # Hardhat smart contracts + tests/deploy scripts
└── README.md
```

## Core Features

- Developer/admin authentication and session handling
- GitHub + WakaTime OAuth connectivity
- Project and task APIs with analytics/stat endpoints
- Resume upload to Cloudinary + ingestion into Chroma Cloud
- Resume text chunking and Gemini embedding generation
- ELO and daily score computation endpoints
- Escrow/reward token smart contract workspace (Hardhat)

## Tech Stack

### Frontend (`client`)
- React 19, Vite, React Router
- Tailwind CSS, GSAP, Recharts

### Backend (`server`)
- Node.js, Express, Mongoose
- JWT/cookie-based auth
- Cloudinary uploads, OAuth integrations

### Resume Embedding Service (`resumeRag`)
- FastAPI
- ChromaDB Cloud client
- Google Gemini embeddings
- PDF parsing + section chunking

### Smart Contracts (`contracts`)
- Solidity + Hardhat
- OpenZeppelin libraries

## Prerequisites

- Node.js 18+
- npm 9+
- Python 3.11 (recommended for current dependency compatibility)
- MongoDB instance
- Cloudinary account
- Google Gemini API key
- Chroma Cloud credentials

## Environment Variables

Create `.env` files in each service from the checked-in examples. Never commit real secrets.

### 1) Backend env (`server/.env`)

Use [`server/.env.example`](server/.env.example) as the template for local development. The backend currently reads these variables:

```dotenv
NODE_ENV=development
PORT=3000
MONGO_URI=your_mongodb_uri
CLIENT_URL=http://localhost:5173
PYTHON_URL=http://localhost:8000
JWT_SECRET=your_jwt_secret

# Cloudinary
CLOUDINARY_URL=
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# OAuth / integrations
WAKATIME_APP_ID=your_wakatime_app_id
WAKATIME_APP_SECRET=your_wakatime_app_secret
WAKATIME_SCOPES=read_summaries read_stats
WAKATIME_REDIRECT_URI=
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_SCOPES=repo read:user user:email
GITHUB_REDIRECT_URI=
# Optional only if you intentionally create org-owned repos:
GITHUB_APP_ORG=
GITHUB_ORG=
GITHUB_REPO_OWNER=

# Groq (used for task splitting + AI code review)
GROQ_API_KEY=your_groq_api_key
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=llama-3.1-70b-versatile
GROQ_REVIEW_MODEL=llama-3.1-70b-versatile

# Blockchain / scripts
SEPOLIA_RPC_URL=
ORACLE_PRIVATE_KEY=
ALCHEMY_API_KEY=
GITHUB_TOKEN=
```

### 2) Resume service env (`resumeRag/.env`)

```dotenv
GOOGLE_API_KEY=your_google_api_key

CHROMA_API_KEY=your_chroma_api_key
CHROMA_TENANT=your_chroma_tenant
CHROMA_DATABASE=your_chroma_database
CHROMA_HOST=api.trychroma.com
```

### 3) Frontend env (`client/.env`)

```dotenv
VITE_BACKEND_URL=https://senate-qiog.onrender.com
```

> Never commit real secrets. Use placeholder values for shared examples.

### GitHub App Installation (Admins)

Admins who create projects/repos must install the Senate GitHub App on their GitHub account before using project creation flows.

- Install the app on your personal account (or on your org if you intentionally create org-owned repos).
- Grant the required repository permissions during installation.
- Then connect GitHub in the app (OAuth) using the same GitHub account.

Without app installation, repository creation and task automation (issues, collaborators, branches) will fail.

## Local Development Setup

### 1) Install dependencies

```bash
# frontend
cd client && npm install

# backend
cd ../server && npm install

# contracts
cd ../contracts && npm install

# resume service (python)
cd ../resumeRag
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install fastapi uvicorn pypdf langchain langchain-community langchain-core
```

### 2) Run services (separate terminals)

```bash
# Terminal A - backend API
cd server
npm run dev

# Terminal B - frontend
cd client
npm run dev

# Terminal C - resume service
cd resumeRag
source venv/bin/activate
uvicorn server.app:app --reload --host 0.0.0.0 --port 8000
```

## Service URLs

- Frontend: `https://senate-ojiz.vercel.app/`
- Backend (Express): `https://senate-qiog.onrender.com`
- Resume service (FastAPI): `https://senate-rag.onrender.com`

## API Overview

### Express backend (`server`)
- `POST /api/auth/developer/register`
- `POST /api/auth/developer/login`
- `POST /api/resume/upload` (uploads file and triggers resume ingestion)
- `GET /api/oauth/session`
- `POST /api/oauth/logout`

### FastAPI resume service (`resumeRag`)
- `POST /ingest-resume` with JSON payload:

```json
{
	"resumeUrl": "https://.../resume.pdf",
	"userId": "optional-user-id"
}
```

- `POST /score/daily`
- `POST /rating/update`
- `POST /get-recommendations` with JSON payload:

```json
{
	"query": "Find team members for a React + Node project",
	"context": {
		"projectDescription": "Build a task tracking platform",
		"teamSize": 3,
		"type": "team_recommendation"
	},
	"userId": "optional-user-id",
	"timestamp": "optional-iso-datetime"
}
```

## Smart Contracts

Inside `contracts/`:

```bash
npx hardhat compile
npx hardhat test
```

Deployment scripts exist in `contracts/scripts/` and ignition modules in `contracts/ignition/modules/`.

## Troubleshooting

### 1) `422 Unprocessable Entity` on `/ingest-resume`
- Ensure request body includes at least:
	- `resumeUrl` (string)
- If calling through backend upload flow, ensure `server` is running and sending payload to FastAPI.

### 2) OAuth redirect lands on backend `/register` and returns 404
- Set `CLIENT_URL=https://senate-ojiz.vercel.app/` in `server/.env`.
- Backend should redirect to frontend routes, not backend routes.

### 3) CORS errors from n8n webhook
- Resume ingestion should go through backend (`/api/resume/upload`) and FastAPI, not direct browser fetch to n8n.

### 4) Python dependency/runtime errors
- Use Python 3.11 virtual environment for `resumeRag`.
- Reinstall dependencies after changing Python version.

## Testing

- Frontend: lint/build from `client/`
- Backend: route-level testing via Postman/curl
- Contracts: `npx hardhat test` in `contracts/`

## Notes for Contributors

- Keep API base URLs environment-driven (`VITE_BACKEND_URL`).
- Do not hardcode production URLs in frontend API clients.
- Keep secrets out of git and rotate any exposed credentials.

## License

Internal / hackathon project. Add an explicit license file if you plan to open-source.
