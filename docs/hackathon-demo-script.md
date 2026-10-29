# FlowForge EdgeTwin AI — 2:15 demo script

This script keeps more than one minute on the working Physical AI modules and stays below Devpost's three-minute limit.

## 0:00–0:12 — Problem and promise

**Screen:** title, live factory canvas, and KPIs.

**Narration:** “Factory layout, production capacity, and mobile-robot traffic are often reviewed separately. FlowForge EdgeTwin AI connects them in one human-governed Physical AI loop.”

## 0:12–0:32 — Baseline simulation

**Action:** show Baseline, 8 hours, demand 1,000, OEE 82%, 3 AGVs, FIFO; click Run Simulation.

**Narration:** “This baseline produces 821 units against demand of 1,000. CNC 01 is the bottleneck, while three FIFO-dispatched AGVs reach 88% utilization, 11.9% blocked time, and 21 predicted conflicts.”

## 0:32–0:48 — Edge sensing

**Action:** scroll to EdgeTwin AI Agent and point to the telemetry envelope.

**Narration:** “The edge layer sends only the operational evidence needed for a decision: attainment, bottleneck, WIP, utilization, queues, blocked time, and predicted conflicts.”

## 0:48–1:15 — Live Nebius and Nemotron inference

**Action:** click Analyze with Nemotron and wait for `LIVE · TOKEN FACTORY`.

**Narration:** “A server-side proxy calls NVIDIA Nemotron 3 Super through the Nebius Token Factory OpenAI-compatible API. The key never enters the browser. The response is constrained to an auditable JSON action space.”

## 1:15–1:35 — Evidence, provenance, and cost

**Action:** highlight risk, recommendation, confidence, provider, model, token counts, and estimated cost.

**Narration:** “The live response identifies congestion risk and proposes a layout, dispatch policy, and fleet size. FlowForge shows the exact provider, model, token usage, and estimated cost. A typical decision costs far below one tenth of a cent.”

## 1:35–1:55 — Human-approved actuation

**Action:** click Apply Recommendation. Show layout, dispatch, and AGV values changing, then point to updated traffic results.

**Narration:** “The model cannot actuate directly. An operator reviews the rationale and explicitly applies the bounded recommendation. The twin reruns immediately so the team can compare operational impact.”

## 1:55–2:08 — Resilience and OpenUSD

**Action:** briefly show the four-stage pipeline and OpenUSD Studio.

**Narration:** “If cloud inference is unavailable, a clearly labeled deterministic edge fallback preserves the demo. The same factory is represented with OpenUSD variants and component metadata for a future Omniverse or Isaac Sim workflow.”

## 2:08–2:15 — Close

**Screen:** optimized twin and project title.

**Narration:** “FlowForge EdgeTwin AI turns factory signals into explainable, measurable, human-approved Physical AI decisions with NVIDIA Nemotron on Nebius.”

## Recording checklist

- Record at 1920×1080 with browser zoom at 90–100%.
- Keep the complete key, `.env`, terminal history, and account balance off screen.
- Ensure `LIVE · TOKEN FACTORY` appears in the captured run.
- Keep at least 60 seconds of actual application modules operating.
- Upload the final video publicly to YouTube and keep it at or below three minutes.

