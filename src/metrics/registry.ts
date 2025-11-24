// src/metrics/registry.ts
import { Registry, collectDefaultMetrics } from 'prom-client';

export const metricsRegistry = new Registry();

metricsRegistry.setDefaultLabels({
  service: 'gammon-guru-backend'
});

collectDefaultMetrics({
  register: metricsRegistry
});
