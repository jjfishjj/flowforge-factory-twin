# FlowForge EdgeTwin AI

## Tagline

A human-governed Physical AI agent that turns factory digital-twin telemetry into measurable AGV and layout decisions using NVIDIA Nemotron on Nebius Token Factory.

## Track

Physical AI Track

## Links

- Demo: https://jjfishjj.github.io/flowforge-factory-twin/
- Source: https://github.com/jjfishjj/flowforge-factory-twin
- License: MIT

## Inspiration

Factory teams often review layout, production capacity, and mobile-robot traffic in separate tools. That makes it difficult to connect a congestion signal to a safe, explainable operating decision. FlowForge EdgeTwin AI closes that gap with a visible sense → filter → reason → act loop: the digital twin produces a small sensor envelope, NVIDIA Nemotron reasons over it through Nebius Token Factory, and an operator approves the proposed change before it reaches the simulated control layer.

## What it does

FlowForge simulates a production line with receiving, CNC, inspection, assembly, packaging, WIP, and an AGV fleet. It calculates shift output, attainment, OEE effects, queue depth, blocked travel time, utilization, predicted conflicts, and the active bottleneck.

The EdgeTwin AI Agent sends only a minimized telemetry envelope to a server-side proxy. NVIDIA Nemotron 3 Super returns a bounded JSON recommendation for:

- factory layout: baseline or optimized U-cell;
- AGV dispatch: FIFO, nearest-job, or zone-based;
- fleet size: one to eight AGVs;
- risk level, rationale, and confidence.

The browser validates the response against an allowlist and requires an explicit human approval before applying it. The interface also shows the provider, model, input/output tokens, and estimated cost for every live decision. If cloud inference is unavailable, a clearly labeled deterministic edge fallback keeps the demonstration operational without pretending that it came from Nemotron.

## How we built it

The factory twin is implemented with accessible HTML, CSS, JavaScript, and Canvas, with no client-side framework. A small Python server hosts the application and proxies OpenAI-compatible chat-completion requests to Nebius Token Factory. The API key remains server-side in a Git-ignored `.env` file.

The Physical AI control loop is:

1. **Sense:** the digital twin measures OEE, WIP, bottleneck, AGV utilization, blocked time, queue depth, and conflicts.
2. **Filter:** the edge contract converts these values into `flowforge.edge-telemetry.v1` and removes unrelated application data.
3. **Reason:** `nvidia/nemotron-3-super-120b-a12b` produces a structured factory-control recommendation through Nebius Token Factory.
4. **Guard:** browser-side normalization rejects unsupported actions and clamps the fleet to a safe simulated range.
5. **Act:** the operator explicitly applies the accepted recommendation to the live digital twin.
6. **Measure:** the simulation reruns so the operator can compare output, travel, utilization, and conflicts.

The project also includes an OpenUSD-ready factory package with layout variants, component references, payloads, and MES-style metadata for a later NVIDIA Omniverse or Isaac Sim workflow.

## Live result

For the baseline scenario — eight-hour shift, demand 1,000, assembly OEE 82%, three AGVs, and FIFO dispatch — the twin reported:

- 821 units output and 82.1% demand attainment;
- CNC 01 as the bottleneck;
- 88% AGV utilization;
- 11.9% blocked time;
- 21 predicted conflict events.

A verified live Token Factory call used 323 input tokens and 526 output tokens. Nemotron recommended the optimized layout, nearest-job dispatch, and five AGVs with 78% confidence. The estimated inference cost was US$0.000570 at the displayed October 2026 public rate.

## Challenges

- Keeping the Token Factory key out of browser code while preserving a one-command local demo.
- Constraining a generative model to a small, auditable factory-control action space.
- Separating live cloud provenance from deterministic fallback behavior.
- Turning a pre-existing digital-twin portfolio project into a genuine closed-loop Physical AI system during the submission period.

## Accomplishments

- A working Nemotron-powered sense → reason → act loop rather than a static AI mockup.
- Human approval and browser-side action validation before simulated actuation.
- Per-decision token and cost transparency.
- A resilient fallback that remains visibly distinct from live inference.
- A portable OpenUSD-ready representation of the same factory and layouts.

## What we learned

The most useful factory recommendation is not necessarily the largest model response. A compact, well-defined telemetry contract and a bounded action schema make the system easier to audit, cheaper to run, and safer to demonstrate. Token Factory made it possible to use an NVIDIA open model through a familiar OpenAI-compatible interface while retaining model and cost visibility.

## Token Factory and NVIDIA feedback

The OpenAI-compatible endpoint made the integration fast, and the public Nemotron model provided useful structured reasoning from a compact operational payload. The clearest strengths were low per-decision cost, simple model switching, and usage metadata in the response. For Physical AI developers, model-card examples that combine structured output, rate limits, regional endpoints, and edge-to-cloud reference architectures would make first-time production planning even easier.

## Significant updates during the submission period

FlowForge existed before the hackathon as an interactive digital-factory and OpenUSD portfolio demo. During the submission period it was significantly upgraded with:

- the EdgeTwin AI Agent interface;
- the minimized `flowforge.edge-telemetry.v1` contract;
- live NVIDIA Nemotron inference through Nebius Token Factory;
- a server-side secret proxy and local `.env` loading;
- allowlisted, human-approved layout, dispatch, and fleet actions;
- deterministic edge fallback with explicit provenance;
- provider, model, token, and estimated-cost reporting;
- automated tests for telemetry, fallback, and action normalization.

## What's next

- Connect the telemetry contract to real MQTT or OPC UA messages on NVIDIA Jetson.
- Run policy evaluation and synthetic congestion scenarios with Nebius Serverless Jobs.
- Validate the OpenUSD stage and robot traffic in NVIDIA Isaac Sim or Omniverse.
- Persist before/after decisions as an auditable operations timeline.

## Built with

Nebius Token Factory, NVIDIA Nemotron 3 Super, Python, JavaScript, HTML, CSS, Canvas, OpenUSD, GitHub Pages.

