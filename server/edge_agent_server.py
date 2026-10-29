#!/usr/bin/env python3
"""Serve FlowForge and proxy factory telemetry to Nebius Token Factory.

The API key stays server-side. The browser only receives a bounded control
recommendation that the operator must explicitly apply.
"""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_local_env(path: Path) -> None:
    """Load a simple local .env file without overriding shell variables."""
    if not path.is_file():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        key, separator, raw_value = line.partition("=")
        key = key.strip()
        if not separator or not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
            continue
        value = raw_value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        os.environ.setdefault(key, value)


load_local_env(ROOT / ".env")
HOST = os.environ.get("FLOWFORGE_HOST", "127.0.0.1")
PORT = int(os.environ.get("FLOWFORGE_PORT", "8787"))
BASE_URL = os.environ.get("NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1").rstrip("/")
MODEL = os.environ.get("NEBIUS_MODEL", "nvidia/nemotron-3-super-120b-a12b")
ALLOWED_ORIGIN = os.environ.get("FLOWFORGE_ALLOWED_ORIGIN", f"http://{HOST}:{PORT}")
INPUT_USD_PER_MILLION = float(os.environ.get("NEBIUS_INPUT_USD_PER_MILLION", "0.30"))
OUTPUT_USD_PER_MILLION = float(os.environ.get("NEBIUS_OUTPUT_USD_PER_MILLION", "0.90"))


SYSTEM_PROMPT = """You are the safety-bounded operations agent for a factory digital twin.
Analyze the supplied telemetry and return JSON only with these keys:
risk_level (low|medium|high), summary, recommended_dispatch (fifo|nearest|zone),
recommended_layout (baseline|optimized), recommended_agv (integer 1-8),
rationale, confidence (0-1), source.
Prefer reducing predicted AGV conflicts and blocked time without inventing sensor data.
Never claim that a recommendation is safe for a real factory; it is a simulation decision
that requires human approval. Set source to nvidia-nemotron-via-nebius-token-factory."""


def parse_json_content(content: str) -> dict:
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", content.strip(), flags=re.IGNORECASE)
    value = json.loads(cleaned)
    if not isinstance(value, dict):
        raise ValueError("Nemotron response must be a JSON object")
    return value


def summarize_usage(body: dict) -> dict:
    usage = body.get("usage") or {}
    input_tokens = int(usage.get("prompt_tokens", 0) or 0)
    output_tokens = int(usage.get("completion_tokens", 0) or 0)
    total_tokens = int(usage.get("total_tokens", input_tokens + output_tokens) or 0)
    estimated_cost = (
        input_tokens * INPUT_USD_PER_MILLION
        + output_tokens * OUTPUT_USD_PER_MILLION
    ) / 1_000_000
    return {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": total_tokens,
        "estimated_cost_usd": round(estimated_cost, 8),
        "input_usd_per_million": INPUT_USD_PER_MILLION,
        "output_usd_per_million": OUTPUT_USD_PER_MILLION,
    }


def request_recommendation(telemetry: dict) -> tuple[dict, dict]:
    api_key = os.environ.get("NEBIUS_API_KEY")
    if not api_key:
        raise RuntimeError("NEBIUS_API_KEY is not configured")

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps({"factory_telemetry": telemetry}, separators=(",", ":"))},
        ],
        "temperature": 0.2,
        "max_tokens": 600,
        "response_format": {"type": "json_object"},
    }
    request = urllib.request.Request(
        f"{BASE_URL}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        body = json.load(response)
    recommendation = parse_json_content(body["choices"][0]["message"]["content"])
    return recommendation, summarize_usage(body)


class FlowForgeHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        super().end_headers()

    def do_OPTIONS(self) -> None:  # noqa: N802
        if self.path != "/api/edge-agent":
            self.send_error(404)
            return
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/api/edge-agent":
            self.send_error(404)
            return
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length <= 0 or content_length > 64_000:
                raise ValueError("Telemetry payload must be between 1 byte and 64 KB")
            body = json.loads(self.rfile.read(content_length))
            telemetry = body.get("telemetry")
            if not isinstance(telemetry, dict) or telemetry.get("schema") != "flowforge.edge-telemetry.v1":
                raise ValueError("A valid flowforge.edge-telemetry.v1 envelope is required")
            recommendation, usage = request_recommendation(telemetry)
            self._write_json(200, {
                "recommendation": recommendation,
                "model": MODEL,
                "provider": "Nebius Token Factory",
                "usage": usage,
            })
        except ValueError as error:
            self._write_json(400, {"error": str(error)})
        except (RuntimeError, urllib.error.URLError, urllib.error.HTTPError, KeyError, json.JSONDecodeError) as error:
            self._write_json(502, {"error": str(error)})

    def _cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")

    def _write_json(self, status: int, payload: dict) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self._cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    print(f"FlowForge EdgeTwin AI: http://{HOST}:{PORT}")
    print(f"Nebius model: {MODEL}")
    print("Cloud inference is enabled" if os.environ.get("NEBIUS_API_KEY") else "No API key: browser fallback will remain active")
    ThreadingHTTPServer((HOST, PORT), FlowForgeHandler).serve_forever()
