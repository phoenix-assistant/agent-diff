import type { Regression } from './types.js';

/**
 * Welch's t-test for two independent samples with unequal variances.
 */
function welchTTest(a: number[], b: number[]): { t: number; p: number } {
  const meanA = a.reduce((s, x) => s + x, 0) / (a.length || 1);
  const meanB = b.reduce((s, x) => s + x, 0) / (b.length || 1);
  const varA = a.reduce((s, x) => s + (x - meanA) ** 2, 0) / (a.length - 1 || 1);
  const varB = b.reduce((s, x) => s + (x - meanB) ** 2, 0) / (b.length - 1 || 1);

  const seA = varA / (a.length || 1);
  const seB = varB / (b.length || 1);
  const se = Math.sqrt(seA + seB);

  if (se === 0) return { t: 0, p: 1 };

  const t = (meanA - meanB) / se;

  // Approximate p-value using normal distribution for large samples
  // For small samples this is an approximation
  const p = 2 * (1 - normalCDF(Math.abs(t)));

  return { t, p };
}

/** Standard normal CDF approximation (Abramowitz & Stegun) */
function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

/**
 * Classify regressions using Welch's t-test on score distributions.
 */
export function classifyRegressions(
  scoresA: number[],
  scoresB: number[],
  capabilities: string[],
  alpha: number = 0.05,
): Regression[] {
  if (scoresA.length < 2 || scoresB.length < 2) {
    return capabilities.map((cap) => ({
      capability: cap,
      pValue: 1,
      tStatistic: 0,
      significant: false,
    }));
  }

  const { t, p } = welchTTest(scoresA, scoresB);

  return capabilities.map((cap) => ({
    capability: cap,
    pValue: p,
    tStatistic: t,
    significant: p < alpha,
  }));
}
