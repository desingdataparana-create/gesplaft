import type { FactorWeight, RegulatoryThreshold, RiskCriterion } from '../types';

export const EBR_CATEGORIES = ['CLIENTE', 'PRODUCTO', 'CANAL', 'GEOGRAFIA'] as const;
export const UIF_FLOOR_CODE = 'UMB-ID-01';

/** Adapt previous configuration for new evaluations, without rewriting historical records. */
export function simplifyRiskConfiguration<T extends {
  criteria: RiskCriterion[];
  factorWeights: FactorWeight[];
  thresholds: RegulatoryThreshold[];
}>(config: T): T {
  const weights = config.factorWeights.filter(w => w.category !== 'OPERACIONAL');
  const total = weights.reduce((sum, w) => sum + w.weightPercentage, 0);
  let assigned = 0;
  const factorWeights = weights.map((w, index) => {
    const weightPercentage = index === weights.length - 1
      ? Math.round((100 - assigned) * 100) / 100
      : Math.round((total > 0 ? w.weightPercentage / total * 100 : 100 / weights.length) * 100) / 100;
    assigned += weightPercentage;
    return { ...w, weightPercentage };
  });
  return {
    ...config,
    criteria: config.criteria.filter(c => c.category !== 'OPERACIONAL'),
    factorWeights,
    thresholds: config.thresholds.filter(t => t.code === UIF_FLOOR_CODE).map(t => ({
      ...t, title: 'Piso UIF', periodicity: 'POR_OPERACION' as const,
    })),
  };
}
