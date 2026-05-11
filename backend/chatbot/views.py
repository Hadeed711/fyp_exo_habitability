"""
Chatbot Views — Groq Cloud LLM Integration
============================================

Provides a chat endpoint backed by the Groq API (https://api.groq.com).
Groq offers a generous free tier with fast inference on Llama 3.3, Mixtral, etc.
Get a free API key at: https://console.groq.com

Set the key in your environment or backend/.env:
    GROQ_API_KEY=gsk_...

Model priority (first available / fastest):
  llama-3.3-70b-versatile → llama-3.1-8b-instant → mixtral-8x7b-32768 → gemma2-9b-it

System prompt is tuned for the AI Exoplanet Habitability Explorer so ARIA can answer
questions about the 9,614-planet database, ML models, habitability science, and app usage.
"""

import json
import logging
import os
import urllib.request
import urllib.error

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

logger = logging.getLogger(__name__)

# ─── Configuration ────────────────────────────────────────────────────────────

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Model preference order: best quality → fastest fallback
PREFERRED_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
]

SYSTEM_PROMPT = """You are ARIA (Astrobiology Research Intelligence Assistant), an expert AI assistant \
for the AI Exoplanet Habitability Explorer project.

You have deep knowledge about:

ASTRONOMY & HABITABILITY SCIENCE:
- Exoplanets: planets orbiting stars outside our solar system
- Habitable Zone (HZ / Goldilocks Zone): orbital distance range where liquid water can exist on a planet's surface
- Earth Similarity Index (ESI): 0-1 scale measuring how Earth-like a planet is (radius, temperature, flux similarity)
- Kopparapu (2013) HZ boundaries: M-dwarfs 0.08-0.24 AU, K-dwarfs 0.38-1.02 AU, G-dwarfs 0.95-1.67 AU
- Stellar types: M (red dwarfs, coolest, most flares), K (orange, "superhabitable"), G (Sun-like), F/A/B/O (too hot/short-lived)
- Transit photometry: how Kepler/TESS detect exoplanets by measuring starlight dimming
- Why we CANNOT detect oxygen, atmospheric composition, or life — requires spectroscopy (JWST), not transit data
- Venus example: would appear habitable from transit data alone (similar size/orbit to Earth) but has 465°C surface due to greenhouse atmosphere — undetectable without JWST

THE DATASET:
- 9,614 exoplanets from 3 NASA missions: K2 (1,937), Kepler (2,742), TESS (4,935)
- Only 28 planets are classified as POTENTIALLY_HABITABLE — life-supporting planets are rare
- Classes: POTENTIALLY_HABITABLE | HABITABILITY_ZONE | NON_HABITABLE

KEY FEATURES USED FOR PREDICTION:
- pl_rade: planet radius in Earth radii (rocky planets ≤ 2.0 R⊕)
- pl_eqt: equilibrium temperature in Kelvin (assumes no atmosphere; Earth = 255 K)
- pl_insol: insolation flux in Earth units (HZ: ~0.25-4.0 S⊕)
- pl_orbper: orbital period in days
- pl_orbsmax: semi-major axis in AU
- pl_orbeccen: orbital eccentricity (0=circular, high values = extreme seasons)
- st_teff: star effective temperature in Kelvin (determines star type)
- st_rad / st_mass: star size and mass (affects luminosity and orbital dynamics)

ML MODELS:
- K2: XGBoost (99.2% accuracy), Kepler: XGBoost (100%), TESS: Random Forest (100%)
- High accuracy is legitimate — habitable planets form distinct clusters in feature space
- SHAP and LIME explain which features drove each prediction
- Composite score = 40% ML probability + 30% ESI + 20% HZ proximity + 10% stellar factor

THE APP:
- Explore page: filter 9,614 planets, 3D orbital viewer, prediction panel with save functionality
- Solar System viewer: all 8 planets, moons, asteroids, Artemis 2 trajectory
- Prediction panel: input custom planet parameters → real-time AI prediction + SHAP explainability
- 3D Viewer: click any planet to center on it; click the star or Reset to return to star-centered view
- Login/Signup: save and name prediction results; view saved predictions history

IMPORTANT LIMITATIONS TO ALWAYS MENTION WHEN RELEVANT:
- We cannot predict atmospheric oxygen, biosignatures, or life itself
- pl_eqt is NOT actual surface temperature (greenhouse effect unknown; Venus is the classic example)
- Only 28 potentially-habitable training samples — positive-class generalization is limited
- No magnetic field, geological activity, or tidal locking data available
- Zero atmospheric composition data in the dataset — JWST observations required for that

Be conversational, scientifically accurate, and helpful. When users ask about a specific planet, \
explain its habitability factors clearly. Keep responses concise (under 200 words unless the user \
asks for detail). Use simple language — assume the user is a student, not an expert astronomer."""


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_api_key():
    """Read Groq API key from environment across common host naming patterns."""
    candidate_names = [
        "GROQ_API_KEY",
        "GROQ_KEY",
        "CHATBOT_GROQ_API_KEY",
        "GROQ_TOKEN",
    ]

    for name in candidate_names:
        value = os.getenv(name)
        if value:
            return value.strip().strip('"').strip("'")
    return ""


def _call_groq(messages, model, api_key):
    """
    Call Groq /openai/v1/chat/completions (OpenAI-compatible).
    Returns the assistant reply string, or raises on error.
    """
    payload = json.dumps({
        "model": model,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 512,
        "top_p": 0.9,
        "stream": False,
    }).encode()

    req = urllib.request.Request(
        GROQ_API_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "Mozilla/5.0 (compatible; ARIA-Chatbot/1.0)",
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())
        return data["choices"][0]["message"]["content"]


# ─── Views ────────────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST", "GET"])
def chat(request):
    """
    GET  /api/chatbot/  — status check
    POST /api/chatbot/  — send message
    Body: { "message": "...", "history": [...] }
    history format: [{ "role": "user"|"assistant", "content": "..." }, ...]
    """
    api_key = _get_api_key()

    if request.method == "GET":
        configured = bool(api_key)
        return JsonResponse({
            "status": "operational" if configured else "api_key_missing",
            "api_key_configured": configured,
            "active_model": PREFERRED_MODELS[0],
            "provider": "Groq",
            "setup_instructions": (
                "Get a free API key at https://console.groq.com, "
                "then set GROQ_API_KEY=gsk_... in your backend host environment and redeploy/restart."
            ) if not configured else None,
        })

    # POST — actual chat
    try:
        body = json.loads(request.body.decode())
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    user_message = (body.get("message") or "").strip()
    if not user_message:
        return JsonResponse({"error": "message field is required"}, status=400)

    if not api_key:
        return JsonResponse({
            "error": "api_key_missing",
            "message": (
                "GROQ_API_KEY is not set.\n"
                "1. Get a free key at https://console.groq.com\n"
                "2. Add GROQ_API_KEY=gsk_... to your backend host environment\n"
                "3. Redeploy/restart the backend service"
            ),
            "setup_required": True,
        }, status=503)

    # Sanitise history (last 20 turns, max 2000 chars per message)
    history = body.get("history", [])
    clean_history = []
    for entry in history[-20:]:
        if isinstance(entry, dict) and entry.get("role") in ("user", "assistant"):
            clean_history.append({
                "role": entry["role"],
                "content": str(entry.get("content", ""))[:2000],
            })

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(clean_history)
    messages.append({"role": "user", "content": user_message})

    # Try models in priority order
    last_error = None
    for model in PREFERRED_MODELS:
        try:
            reply = _call_groq(messages, model, api_key)
            return JsonResponse({
                "reply": reply,
                "model": model,
                "provider": "Groq",
                "success": True,
            })
        except urllib.error.HTTPError as exc:
            body_text = exc.read().decode() if exc.fp else ""
            logger.warning(f"Groq model {model} failed ({exc.code}): {body_text}")
            # 404 = model not found, try next; 429 = rate limit; 401 = bad key
            if exc.code in (401, 403):
                return JsonResponse({
                    "error": "invalid_api_key",
                    "message": "GROQ_API_KEY is invalid or blocked. Regenerate it at https://console.groq.com",
                }, status=401)
            if exc.code == 429:
                return JsonResponse({
                    "error": "rate_limited",
                    "message": "Groq rate limit reached. Please wait a moment and try again.",
                }, status=429)
            last_error = f"HTTP {exc.code}: {body_text[:200]}"
        except Exception as exc:
            logger.warning(f"Groq model {model} error: {exc}")
            last_error = str(exc)

    logger.error(f"All Groq models failed. Last error: {last_error}")
    return JsonResponse({
        "error": "groq_unavailable",
        "message": f"Could not reach Groq API. Last error: {last_error}",
    }, status=503)
