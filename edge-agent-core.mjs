const dispatches = new Set(['fifo', 'nearest', 'zone']);
const layouts = new Set(['baseline', 'optimized']);

export function buildTelemetry(result, layout = 'baseline') {
  if (!result) throw new Error('Simulation telemetry is required.');
  return {
    schema: 'flowforge.edge-telemetry.v1',
    timestamp: new Date().toISOString(),
    plant: 'PLANT-01-TW',
    layout,
    shift_hours: Number(result.shift),
    demand_units: Number(result.demand),
    output_units: Number(result.output),
    attainment_pct: Number(result.attainment.toFixed(1)),
    wip_units: Number(result.wip),
    bottleneck: result.bottleneck,
    assembly_oee_pct: Number((result.assemblyOee * 100).toFixed(0)),
    agv_fleet: Number(result.agv),
    dispatch_strategy: result.dispatch,
    agv_utilization_pct: Number(result.utilization),
    blocked_time_pct: Number(result.blockedTime),
    max_queue: Number(result.maxQueue),
    predicted_conflicts: Number(result.conflicts)
  };
}

export function offlineRecommendation(telemetry) {
  const congested = telemetry.blocked_time_pct >= 9 || telemetry.predicted_conflicts >= 12;
  const capacityGap = telemetry.attainment_pct < 100;
  const recommendedDispatch = congested ? 'zone' : telemetry.dispatch_strategy;
  const recommendedLayout = telemetry.layout === 'baseline' && (congested || capacityGap) ? 'optimized' : telemetry.layout;
  const risk = telemetry.blocked_time_pct >= 15 || telemetry.predicted_conflicts >= 24 ? 'high' : congested || capacityGap ? 'medium' : 'low';
  const actionParts = [];
  if (recommendedLayout !== telemetry.layout) actionParts.push('switch to the optimized U-cell layout');
  if (recommendedDispatch !== telemetry.dispatch_strategy) actionParts.push('activate zone-based AGV dispatch');
  if (!actionParts.length) actionParts.push('hold the current control policy and continue monitoring');
  return {
    risk_level: risk,
    summary: capacityGap ? `Capacity is below demand with ${telemetry.bottleneck.replace('_', ' ')} constraining the line.` : 'The line can cover demand, but traffic risk still requires supervision.',
    recommended_dispatch: recommendedDispatch,
    recommended_layout: recommendedLayout,
    recommended_agv: telemetry.agv_fleet,
    rationale: `${telemetry.predicted_conflicts} predicted conflicts and ${telemetry.blocked_time_pct}% blocked time indicate that the safest next move is to ${actionParts.join(' and ')}.`,
    confidence: congested ? 0.88 : 0.76,
    source: 'deterministic-edge-fallback'
  };
}

export function normalizeRecommendation(value, telemetry) {
  const fallback = offlineRecommendation(telemetry);
  const recommendation = value && typeof value === 'object' ? value : {};
  return {
    risk_level: ['low', 'medium', 'high'].includes(recommendation.risk_level) ? recommendation.risk_level : fallback.risk_level,
    summary: String(recommendation.summary || fallback.summary).slice(0, 320),
    recommended_dispatch: dispatches.has(recommendation.recommended_dispatch) ? recommendation.recommended_dispatch : fallback.recommended_dispatch,
    recommended_layout: layouts.has(recommendation.recommended_layout) ? recommendation.recommended_layout : fallback.recommended_layout,
    recommended_agv: Math.max(1, Math.min(8, Number(recommendation.recommended_agv) || fallback.recommended_agv)),
    rationale: String(recommendation.rationale || fallback.rationale).slice(0, 560),
    confidence: Math.max(0, Math.min(1, Number(recommendation.confidence) || fallback.confidence)),
    source: String(recommendation.source || 'nvidia-nemotron-via-nebius').slice(0, 80)
  };
}
