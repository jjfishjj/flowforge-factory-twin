# Devpost additional information draft

## Submission profile

- Submitter type: Individual
- Organization: N/A
- Country: Taiwan
- Canadian province: N/A
- Track: Physical AI
- Project status before August 26, 2026: Existing
- Tavily runtime integration: No
- Learning: Significant
- Career AI value: Yes

## Significant update

The original project was an interactive factory digital twin and OpenUSD portfolio demo. During the hackathon it was significantly upgraded with the EdgeTwin AI Agent, a minimized telemetry contract, live NVIDIA Nemotron 3 Super inference through Nebius Token Factory, a server-side secret proxy, bounded human-approved control actions, a deterministic edge fallback with explicit provenance, per-call token and cost reporting, and automated tests.

## URLs

- Public code repository: https://github.com/jjfishjj/flowforge-factory-twin
- Working demo: https://jjfishjj.github.io/flowforge-factory-twin/

## Model choice

NVIDIA Nemotron 3 Super 120B A12B. We chose Super because its 12B active-parameter MoE design balances multi-agent reasoning quality, latency, and cost for short factory-control decisions. Our verified request cost about US$0.00057.

## Output quality

9/10. It followed the bounded JSON schema reliably, connected congestion evidence to layout and dispatch actions, and produced concise operational rationale. Results still require deterministic validation because the model can vary fleet-size recommendations between runs.

## Approach

We used the base model without fine-tuning. We prompt-engineered a safety-bounded system instruction, minimized the telemetry schema, requested JSON output, used low temperature, validated every action against an allowlist, clamped fleet size to 1–8, and required explicit human approval before actuation.

## Comparison

For this prototype, Nemotron Super delivered strong structured instruction-following and useful operational reasoning at a very low per-decision cost. We did not claim a formal model benchmark; the project evaluates successful bounded actions, latency, provenance, and measured token cost rather than subjective prose quality.

## Most valuable Nebius capabilities

Nebius Token Factory's public serverless endpoint and OpenAI-compatible API were the most valuable capabilities. They let the local edge proxy call Nemotron without provisioning a GPU or dedicated endpoint, while returning usage metadata for cost transparency. The service handled variable prototype traffic on demand; no dedicated GPU instance was required.

## Recommendation score

9/10. The familiar API, current NVIDIA open-model catalog, serverless access, and low pay-per-token cost make it easy to prototype auditable AI decision services. Clearer consolidated guidance for regions, rate limits, and structured-output compatibility would improve onboarding.

## Nebius inference experience

9/10. Compared with local inference, Token Factory removed model download, GPU memory, and serving work. Compared with other hosted APIs, the integration remained familiar while exposing an open NVIDIA model and useful token accounting.

## Improvements

A single model card showing regional endpoint selection, structured-output support, current rate limits, pricing, and production error handling would make first deployment faster. A small edge-to-cloud Physical AI reference architecture would also help robotics and IoT teams.

## Nemotron roadmap request

More compact agentic and multimodal Nemotron variants with reliable constrained decoding, richer tool-use examples, and reference evaluations for robotics, industrial telemetry, and long-running edge agents.

## AI tools used

OpenAI Codex for implementation support, browser automation for end-to-end verification, Node.js tests, Python validation, and NVIDIA Nemotron on Nebius Token Factory as the runtime decision model.

## Requires submitter confirmation

- Submitter and teammates are at least the age of majority where they reside.
- Submitter and teammates are not employees, representatives, or agents of the hackathon Promotion Entities.
- Builders & Brews city, if attended.

