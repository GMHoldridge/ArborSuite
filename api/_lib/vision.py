"""Vision for ArborSuite — ALL FREE, runs on Geoff's own hardware.

NO paid Anthropic API (hard rule). Two jobs:
  - Tree photo assessment  -> Ollama VLM (llava/moondream)
  - Planner page OCR        -> qwen2.5vl reads handwriting, then (optionally) the
                               Claude CLI structures it — the same "CV eyes +
                               CLI brain" composite pattern as warden/os_agent.

These only work where Ollama (and the claude CLI) live — i.e. Geoff's desktop.
On the cloud (Vercel) Ollama is unreachable, so callers get a clear error.
"""
from __future__ import annotations

import os
import json
import base64
import urllib.request

OLLAMA_URL = os.environ.get("ARBOR_OLLAMA_URL", "http://localhost:11435")
TREE_MODEL = os.environ.get("ARBOR_TREE_MODEL", "llava:7b")
OCR_MODEL = os.environ.get("ARBOR_OCR_MODEL", "qwen2.5vl:7b")
_TIMEOUT = 120


def vision_available() -> bool:
    try:
        urllib.request.urlopen(f"{OLLAMA_URL}/api/tags", timeout=3)
        return True
    except Exception:
        return False


def _ollama_vision(model: str, prompt: str, image_b64: str, as_json: bool = True) -> str:
    payload = {
        "model": model, "prompt": prompt, "images": [image_b64], "stream": False,
        "options": {"temperature": 0.2, "num_predict": 1500},
    }
    if as_json:
        payload["format"] = "json"
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/generate", data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
        return json.loads(resp.read()).get("response", "").strip()


def _ollama_text(model: str, prompt: str) -> str:
    """Text-only Ollama call (used as the free fallback 'brain' when the Claude
    CLI isn't available to structure the transcription)."""
    payload = {"model": model, "prompt": prompt, "stream": False,
               "options": {"temperature": 0.1, "num_predict": 1500}}
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/generate", data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
        return json.loads(resp.read()).get("response", "").strip()


def _claude_cli(system: str, user: str, timeout: int = 60) -> str | None:
    """Best-effort text call to the free Claude CLI (subscription). Returns None
    if the CLI isn't installed/available — caller falls back to the VLM output."""
    import shutil, subprocess, sys, tempfile
    cli = shutil.which("claude")
    if not cli:
        npm = os.path.expandvars(r"%APPDATA%\\npm")
        for ext in (".cmd", ".ps1", ""):
            cand = os.path.join(npm, f"claude{ext}")
            if os.path.isfile(cand):
                cli = cand
                break
    if not cli:
        return None
    saved = os.environ.pop("ANTHROPIC_API_KEY", None)  # force subscription, not API
    try:
        flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        r = subprocess.run(
            [cli, "--print", "--output-format", "json", "--max-turns", "3", "--tools", ""],
            input=f"<system>\n{system}\n</system>\n\n{user}", capture_output=True,
            text=True, encoding="utf-8", errors="replace", timeout=timeout,
            cwd=tempfile.gettempdir(), env={**os.environ, "PYTHONIOENCODING": "utf-8"},
            creationflags=flags,
        )
        out = json.loads(r.stdout)
        return out.get("result") if not out.get("is_error") else None
    except Exception:
        return None
    finally:
        if saved is not None:
            os.environ["ANTHROPIC_API_KEY"] = saved


def _loads(text: str):
    if not text:
        return None
    t = text.strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[1].rsplit("```", 1)[0].strip() if "\n" in t else t.strip("`")
    try:
        return json.loads(t)
    except Exception:
        # find first {...} or [...]
        for op, cl in (("[", "]"), ("{", "}")):
            i, j = t.find(op), t.rfind(cl)
            if i != -1 and j > i:
                try:
                    return json.loads(t[i:j + 1])
                except Exception:
                    pass
    return None


# ── Tree assessment ─────────────────────────────────────────────────
_TREE_PROMPT = (
    "You are an ISA-certified arborist assessing a tree from a photo. Return ONLY a "
    "JSON object with: species (string), height_estimate_ft (number), dbh_estimate_in "
    "(number), lean_direction (string|null), visible_decay (bool), deadwood_pct (0-100), "
    "canopy_density ('sparse'|'moderate'|'dense'), hazards (string[]), access_difficulty "
    "('easy'|'moderate'|'difficult'|'crane_needed'), equipment_suggested (string[]), "
    "time_estimate_hours (number), difficulty_rating (1-5 int), notes (string). JSON only."
)


def assess_tree(image_b64: str) -> dict:
    raw = _ollama_vision(TREE_MODEL, _TREE_PROMPT, image_b64, as_json=True)
    data = _loads(raw)
    if not isinstance(data, dict):
        raise RuntimeError("Tree assessment did not return valid JSON")
    return data


# ── Planner OCR (composite: VLM transcribes → CLI/text-model structures) ──
# VLMs are reliable at transcription but flaky at emitting a clean JSON ARRAY,
# so we split the job: qwen2.5vl reads the page to plain text, then the Claude
# CLI (or a local text model fallback) turns that text into structured jobs.
_TRANSCRIBE_PROMPT = (
    "This is a photo of a tree-service company's handwritten planner/notebook page. "
    "Transcribe it EXACTLY as written, one line per line. Output plain text only — "
    "no JSON, no commentary, no extra words. Just the transcription."
)

_STRUCTURE_SYS = "You convert a tree-service planner transcription into structured data. Output ONLY a JSON array, nothing else."
_STRUCTURE_USER = (
    "Below is a transcription of a handwritten tree-service planner page. Turn it into a "
    "JSON ARRAY of jobs. Each element: {\"day\": string|null, \"client\": string|null, "
    "\"address\": string|null, \"work\": string, \"price\": number|null}. One element per "
    "job. Split client name from address. Remove the $ from price (number only). If a "
    "field is unknown use null. Return ONLY the JSON array (use [] if no jobs).\n\n"
    "TRANSCRIPTION:\n"
)


def _structure_entries(transcription: str) -> list:
    """Transcription text -> list of job dicts. Claude CLI first (free), then a
    local text model, both forced to emit a JSON array."""
    for attempt in (
        lambda: _claude_cli(_STRUCTURE_SYS, _STRUCTURE_USER + transcription),
        lambda: _ollama_text("qwen2.5-coder:7b", _STRUCTURE_SYS + "\n\n" + _STRUCTURE_USER + transcription),
        lambda: _ollama_text("llama3.2:latest", _STRUCTURE_SYS + "\n\n" + _STRUCTURE_USER + transcription),
    ):
        try:
            data = _loads(attempt() or "")
        except Exception:
            data = None
        if isinstance(data, dict):
            data = data.get("jobs") or next((v for v in data.values() if isinstance(v, list)), None)
        if isinstance(data, list) and data:
            return data
    return []


def scan_planner(image_b64: str) -> list[dict]:
    """Read a handwritten planner page into structured job entries."""
    transcription = _ollama_vision(OCR_MODEL, _TRANSCRIBE_PROMPT, image_b64, as_json=False)
    final = _structure_entries(transcription) if transcription else []

    out = []
    for e in final:
        if not isinstance(e, dict):
            continue
        price = e.get("price")
        if isinstance(price, str):
            p = price.replace("$", "").replace(",", "").strip()
            try:
                price = float(p) if p else None
            except ValueError:
                price = None
        out.append({
            "day": e.get("day"), "client": e.get("client"),
            "address": e.get("address"), "work": e.get("work") or "",
            "price": price,
        })
    return out
