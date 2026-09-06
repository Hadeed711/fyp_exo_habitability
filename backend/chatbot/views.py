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
questions about the 11,378-object catalogue, ML models, habitability science, and app usage.
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
- Kopparapu (2013) HZ boundaries as used by this app: M-dwarfs 0.08-0.23 AU, K-dwarfs 0.38-1.02 AU,
  G-dwarfs 0.95-1.67 AU, F-dwarfs 1.4-2.4 AU
- Stellar types: M (red dwarfs, coolest, most flares), K (orange, "superhabitable"), G (Sun-like), F/A/B/O (too hot/short-lived)
- Transit photometry: how Kepler/TESS detect exoplanets by measuring starlight dimming
- Why we CANNOT detect oxygen, atmospheric composition, or life — requires spectroscopy (JWST), not transit data
- Venus example: would appear habitable from transit data alone (similar size/orbit to Earth) but has 465°C surface due to greenhouse atmosphere — undetectable without JWST

THE DATASET:
- 11,378 objects from 3 NASA missions: K2 (854), Kepler (4,619), TESS (5,905)
- Built from the raw NASA archive exports with three filters applied:
  * objects dispositioned FALSE POSITIVE / FALSE ALARM are dropped (they are not planets) —
    this removes 4,839 Kepler, 1,290 TESS and 315 K2 rows
  * duplicate parameter sets collapse to the archive's preferred row (2,121 dropped from K2)
  * objects whose habitability criteria cannot be resolved even after physics derivation are
    excluded rather than guessed at (1,281 across all missions)
- Class counts: NON_HABITABLE 10,624 | HABITABILITY_ZONE 628 | POTENTIALLY_HABITABLE 126
- Habitable planets are rare: 1.1% of the catalogue

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
- ONE unified XGBoost classifier trained on all 11,378 objects pooled across the three
  missions is the default. Per-mission models exist as an ablation but are NOT the default:
  splitting 126 habitable objects three ways leaves too few to estimate anything reliably.
- Headline metric is 5-fold OUT-OF-FOLD macro F1 = 0.983. Out-of-fold means every object is
  scored by a model that never saw it, so the rare classes report full support.
  Per class: POTENTIALLY_HABITABLE F1 0.96 (126 objects), HABITABILITY_ZONE F1 0.98 (628),
  NON_HABITABLE F1 1.00 (10,624).
- CRITICAL HONESTY POINT, always say this if asked about accuracy: the labels are a
  DOCUMENTED PHYSICS RULE, not observed ground truth. No exoplanet has confirmed
  habitability. The classifier is trained on the same observables the rule consumes, so it is
  a learned SURROGATE of that rule — a high score means it reproduces the rule faithfully, NOT
  that it discovered anything. Never present it as scientific discovery.
- The results that DO show capability beyond the rule:
  * Degraded inputs: withhold 4 of 8 observables and the rule becomes undefined for 95% of
    objects, while the model still classifies 97.6% correctly. It was trained with random
    feature masking and is told which values were derived rather than measured.
  * Leave-one-mission-out: train on two missions, test on the third — macro F1 stays 0.75-0.96
    despite different instruments and detection biases.
- 25 features, all computable from the 9 observables the API accepts. Deliberately EXCLUDED:
  boolean threshold flags that restated the label rule (these caused a bogus 100% accuracy in
  an earlier version), plus sky coordinates, photometric magnitudes and uncertainty columns.
- SHAP and LIME explain which features drove each prediction
- Final score = 0.60 x ML_score + 0.40 x physics_score
  * ML_score collapses the 3 class probabilities: P(hab)*1.0 + P(hz)*0.5 + P(non)*0.0
  * physics_score = geometric mean of (radius, temperature, flux) similarity, multiplied by
    habitable-zone membership and a stellar-type factor
  * The 0.60 weight is CALIBRATED, not chosen by hand: scripts/calibrate_blend.py sweeps the
    weight and thresholds to maximise macro F1 against the physics label using out-of-fold
    probabilities. An earlier version used 0.10 to mask a broken classifier that was being
    fed 90% zero-filled features; that bug is fixed and the weight rose accordingly.
- Classification thresholds on the final score: >= 0.71 POTENTIALLY_HABITABLE,
  0.24-0.70 HABITABILITY_ZONE, < 0.24 NON_HABITABLE. These are calibrated alongside the weight.
- The Earth Similarity Index is reported in the response but is NOT one of the weighted
  score inputs. It uses the Schulze-Makuch (2011) two-parameter form over radius and
  equilibrium temperature; Earth = 1.00, Mars = 0.68 (PHL catalogue lists 0.70).

MISSING DATA HANDLING (a common question):
- Nothing is median-filled. Missing quantities are DERIVED from first principles:
  * semi-major axis from period and stellar mass (Kepler's third law)
  * stellar luminosity from radius and temperature (Stefan-Boltzmann)
  * insolation from luminosity and distance (inverse-square law)
  * equilibrium temperature from insolation: T_eq = 255 K * S^0.25 (Bond albedo 0.3,
    recovered empirically from the archive, not assumed)
  * stellar mass from luminosity (M ~ L^0.25, 7.2% median error on 9,200 Kepler rows)
- Every derived value is flagged, and the flags are model inputs. Feeding Earth's orbital
  period plus the Sun's radius and temperature recovers 1.00 AU, 1.00 S and 255 K exactly.

THE APP:
- Explore page: filter 11,378 objects, 3D orbital viewer, prediction panel with save functionality
- Solar System viewer: all 8 planets, moons, asteroids, Artemis 2 trajectory
- Prediction panel: input custom planet parameters → real-time AI prediction + SHAP explainability
- 3D Viewer: click any planet to center on it; click the star or Reset to return to star-centered view
- Login/Signup: save and name prediction results; view saved predictions history

IMPORTANT LIMITATIONS TO ALWAYS MENTION WHEN RELEVANT:
- We cannot predict atmospheric oxygen, biosignatures, or life itself
- pl_eqt is NOT actual surface temperature (greenhouse effect unknown; Venus is the classic example)
- Only 126 potentially-habitable objects across the whole catalogue — positive-class
  generalization is limited, and this is why out-of-fold evaluation is used instead of a single split
- No magnetic field, geological activity, or tidal locking data available
- Zero atmospheric composition data in the dataset — JWST observations required for that

You do NOT have live access to the database. The dataset figures above are static facts baked
into these instructions, not query results. If a user asks for a specific planet's stored record,
tell them to use the Explore page or the search bar rather than inventing values.

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
