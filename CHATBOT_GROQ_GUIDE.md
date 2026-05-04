# ARIA Chatbot — Groq Integration Guide

This document covers everything needed to fully activate the ARIA chatbot. The frontend (`Chatbot.jsx`) and backend (`chatbot/views.py`) are fully implemented. You only need a free Groq API key.

---

## What Is Already Done

| Layer | Status | File |
|-------|--------|------|
| Django endpoint | Done | `backend/chatbot/views.py` |
| URL routing | Done | `backend/chatbot/urls.py`, `backend/backend/urls.py` |
| App registration | Done | `backend/backend/settings.py` |
| React chat UI | Done | `frontend/src/components/Chatbot.jsx` |
| App-wide mounting | Done | `frontend/src/App.jsx` |

When the API key is not set, the chatbot shows a "Setup Required" notice with exact instructions rather than crashing.

---

## Step 1 — Get a Free Groq API Key

1. Go to **https://console.groq.com**
2. Sign up (free, no credit card needed)
3. Navigate to **API Keys** → **Create API Key**
4. Copy the key — it starts with `gsk_`

Groq's free tier is generous: 14,400 requests/day on fast models. More than enough for this project.

---

## Step 2 — Set the Environment Variable

### Option A — Set in terminal before starting server (temporary)

**Windows (Command Prompt):**
```cmd
set GROQ_API_KEY=gsk_your_key_here
python manage.py runserver
```

**Windows (PowerShell):**
```powershell
$env:GROQ_API_KEY="gsk_your_key_here"
python manage.py runserver
```

### Option B — Create a `.env` file (permanent, recommended)

Create `backend/.env`:
```
GROQ_API_KEY=gsk_your_key_here
```

Then in `backend/backend/settings.py`, load it:
```python
from dotenv import load_dotenv
load_dotenv()
```

Install python-dotenv if not present:
```bash
pip install python-dotenv
```

---

## Step 3 — Run the Project

```bash
# Terminal 1 — Django backend (with env var set)
cd backend
python manage.py runserver

# Terminal 2 — React frontend
cd frontend
npm run dev
```

The chatbot button (bottom-right corner, violet/cyan gradient) will now respond using Groq.

---

## Available Models

The backend tries models in this priority order:

| Model | Quality | Speed | Notes |
|-------|---------|-------|-------|
| `llama-3.3-70b-versatile` | Best | Medium | Recommended for complex questions |
| `llama-3.1-8b-instant` | Good | Very fast | Great for quick answers |
| `mixtral-8x7b-32768` | Good | Fast | Large context window |
| `gemma2-9b-it` | Good | Fast | Google's model |

The first available model is used automatically. No configuration needed.

---

## How the Backend Works

**File:** `backend/chatbot/views.py`

### GET — health check
```
GET /api/chatbot/
```
Returns:
```json
{
  "status": "operational",
  "api_key_configured": true,
  "active_model": "llama-3.3-70b-versatile",
  "provider": "Groq"
}
```

### POST — send a message
```
POST /api/chatbot/
```
Request:
```json
{
  "message": "What is the ESI score?",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

Response:
```json
{
  "reply": "The Earth Similarity Index (ESI) is...",
  "model": "llama-3.3-70b-versatile",
  "provider": "Groq",
  "success": true
}
```

### Error responses

| Error | Status | Meaning |
|-------|--------|---------|
| `api_key_missing` | 503 | `GROQ_API_KEY` env var not set |
| `invalid_api_key` | 401 | Key is wrong or expired |
| `rate_limited` | 429 | Free tier limit hit (resets hourly) |
| `groq_unavailable` | 503 | Network issue or all models unavailable |

---

## ARIA System Prompt

ARIA (Astrobiology Research Intelligence Assistant) is briefed with full project knowledge:

- 9,614-planet database (K2, Kepler, TESS)
- Mission-specific ML models (K2/Kepler XGBoost, TESS Random Forest)
- Habitability score components (40% ML + 30% ESI + 20% HZ proximity + 10% stellar)
- All planet parameters and their meaning
- Why certain things cannot be predicted (oxygen, biosignatures, actual surface temperature)
- Venus example: transit data can't detect greenhouse atmospheres (JWST required)
- SHAP/LIME explainability
- App features: 3D viewer, prediction panel, save predictions

---

## Customising ARIA

### Change the system prompt
Edit `SYSTEM_PROMPT` in `backend/chatbot/views.py`. It is a plain string.

### Change token limit
```python
"max_tokens": 512,  # default — change to 1024 for longer responses
```

### Change conversation memory
```python
for entry in history[-20:]:  # default: last 20 turns
```

### Change model priority
```python
PREFERRED_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
]
```

---

## Troubleshooting

### "GROQ_API_KEY is not set"
- Make sure the env var is set in the same terminal you run `python manage.py runserver`
- Check with: `echo %GROQ_API_KEY%` (Windows CMD) or `echo $env:GROQ_API_KEY` (PowerShell)

### "GROQ_API_KEY is invalid"
- The key may have been regenerated or deleted
- Go to https://console.groq.com → API Keys → create a new one

### Rate limit errors (429)
- Groq free tier: 14,400 requests/day, 30 requests/minute
- Wait a moment and retry — the limit resets within a minute

### No response / timeout
- Check that the backend server is running on port 8000
- Check Django terminal for error details

---

## Quick Start Summary

```bash
# 1. Get free API key from https://console.groq.com

# 2. Set the key (Windows PowerShell)
$env:GROQ_API_KEY="gsk_your_key_here"

# 3. Start the project
cd backend && python manage.py runserver
cd frontend && npm run dev

# 4. Open http://localhost:3000 and click the violet chat button (bottom-right)
```

No local model download. No GPU needed. Free tier is sufficient for development and demos.
