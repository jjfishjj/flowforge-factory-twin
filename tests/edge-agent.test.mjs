import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTelemetry, normalizeRecommendation, offlineRecommendation } from '../edge-agent-core.mjs';

const simulation = {
  shift: 8, demand: 1000, output: 821, attainment: 82.1, wip: 20,
  bottleneck: 'CNC_01', assemblyOee: 0.82, agv: 3, dispatch: 'fifo',
  utilization: 88, blockedTime: 11.9, maxQueue: 5, conflicts: 21
};

test('buildTelemetry emits the minimized edge schema', () => {
  const telemetry = buildTelemetry(simulation, 'baseline');
  assert.equal(telemetry.schema, 'flowforge.edge-telemetry.v1');
  assert.equal(telemetry.attainment_pct, 82.1);
  assert.equal(telemetry.predicted_conflicts, 21);
});

test('offline fallback turns congestion into a guarded action', () => {
  const recommendation = offlineRecommendation(buildTelemetry(simulation, 'baseline'));
  assert.equal(recommendation.risk_level, 'medium');
  assert.equal(recommendation.recommended_dispatch, 'zone');
  assert.equal(recommendation.recommended_layout, 'optimized');
});

test('normalization rejects unsupported model actions', () => {
  const telemetry = buildTelemetry(simulation, 'baseline');
  const normalized = normalizeRecommendation({ recommended_dispatch: 'unsafe-mode', recommended_agv: 99 }, telemetry);
  assert.equal(normalized.recommended_dispatch, 'zone');
  assert.equal(normalized.recommended_agv, 8);
});
