import { buildTelemetry, offlineRecommendation, normalizeRecommendation } from './edge-agent-core.mjs';

const byId = id => document.getElementById(id);
const modelLabel = 'nvidia/nemotron-3-super-120b-a12b';
let sequence = 1;
let latestTelemetry = null;
let latestDecision = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function renderTelemetry(result) {
  latestTelemetry = buildTelemetry(result, window.FlowForgeFactory?.getLayout() || 'baseline');
  const values = [latestTelemetry.bottleneck.replace('_', ' '), `${latestTelemetry.attainment_pct}%`, `${latestTelemetry.blocked_time_pct}%`, latestTelemetry.predicted_conflicts];
  byId('agent-telemetry').querySelectorAll('dd').forEach((node, index) => { node.textContent = values[index]; });
  byId('telemetry-json').textContent = JSON.stringify(latestTelemetry, null, 2);
  byId('telemetry-seq').textContent = `SEQ ${String(sequence++).padStart(4, '0')}`;
}

function renderDecision(decision) {
  latestDecision = decision;
  const dispatchLabel = { fifo: 'FIFO', nearest: 'NEAREST-JOB', zone: 'ZONE-BASED' }[decision.recommended_dispatch];
  const layoutLabel = decision.recommended_layout === 'optimized' ? 'OPTIMIZED U-CELL' : 'BASELINE';
  byId('agent-output').className = '';
  byId('agent-output').innerHTML = `<div class="decision-summary"><h3>${escapeHtml(decision.summary)}</h3><p>Physical AI proposes a guarded factory-control update. Review the evidence before applying it to the twin.</p></div><div class="decision-metrics"><div><span>DISPATCH</span><strong>${dispatchLabel}</strong></div><div><span>LAYOUT</span><strong>${layoutLabel}</strong></div><div><span>CONFIDENCE</span><strong>${Math.round(decision.confidence * 100)}%</strong></div></div><div class="decision-rationale">${escapeHtml(decision.rationale)}</div>`;
  byId('agent-risk').textContent = `${decision.risk_level.toUpperCase()} RISK`;
  byId('agent-risk').className = decision.risk_level;
  byId('agent-provenance').textContent = decision.source.toUpperCase();
  byId('apply-agent-action').disabled = false;
}

function renderUsage(payload) {
  const usage = payload.usage || {};
  const hasUsage = Number.isFinite(Number(usage.total_tokens)) && Number(usage.total_tokens) > 0;
  byId('agent-usage').hidden = !hasUsage;
  if (!hasUsage) return;
  byId('agent-provider').textContent = payload.provider || 'Nebius Token Factory';
  byId('agent-input-tokens').textContent = Number(usage.input_tokens || 0).toLocaleString();
  byId('agent-output-tokens').textContent = Number(usage.output_tokens || 0).toLocaleString();
  byId('agent-cost').textContent = `$${Number(usage.estimated_cost_usd || 0).toFixed(6)}`;
}

async function analyze() {
  const result = window.FlowForgeFactory?.getLastResult();
  if (!result) {
    byId('agent-feedback').textContent = 'Run a simulation before requesting an AI decision.';
    return;
  }
  renderTelemetry(result);
  const button = byId('analyze-factory');
  button.disabled = true;
  button.innerHTML = '<span>◌</span> NEMOTRON REASONING…';
  byId('agent-feedback').textContent = 'Sending minimized telemetry to the configured edge-agent endpoint…';
  const endpoint = window.FLOWFORGE_EDGE_AGENT_ENDPOINT || `${window.location.origin}/api/edge-agent`;
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telemetry: latestTelemetry }) });
    if (!response.ok) throw new Error(`Agent endpoint returned ${response.status}`);
    const payload = await response.json();
    renderDecision(normalizeRecommendation(payload.recommendation || payload, latestTelemetry));
    renderUsage(payload);
    byId('agent-mode').textContent = 'LIVE · TOKEN FACTORY';
    byId('agent-model').textContent = payload.model || modelLabel;
    byId('agent-feedback').textContent = 'Live Nemotron inference completed through Nebius Token Factory.';
  } catch (error) {
    renderDecision(offlineRecommendation(latestTelemetry));
    byId('agent-usage').hidden = true;
    byId('agent-mode').textContent = 'DEMO · EDGE FALLBACK';
    byId('agent-model').textContent = 'NEMOTRON ENDPOINT READY';
    byId('agent-feedback').textContent = `Cloud endpoint unavailable; deterministic edge fallback kept the control loop operational. (${error.message})`;
  } finally {
    button.disabled = false;
    button.innerHTML = '<span>✦</span> ANALYZE WITH NEMOTRON';
  }
}

function applyDecision() {
  if (!latestDecision) return;
  window.FlowForgeFactory?.applyRecommendation(latestDecision);
  byId('agent-feedback').textContent = `Applied ${latestDecision.recommended_layout} layout, ${latestDecision.recommended_dispatch} dispatch, and ${latestDecision.recommended_agv} AGVs to the live twin.`;
  byId('apply-agent-action').disabled = true;
}

window.addEventListener('factory:simulation', event => renderTelemetry(event.detail));
byId('analyze-factory').addEventListener('click', analyze);
byId('apply-agent-action').addEventListener('click', applyDecision);

const initialResult = window.FlowForgeFactory?.getLastResult();
if (initialResult) renderTelemetry(initialResult);
