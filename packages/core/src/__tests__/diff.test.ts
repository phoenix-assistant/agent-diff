import { describe, it, expect } from 'vitest';
import { compareSnapshots } from '../diff.js';
import type { Snapshot } from '../types.js';

function makeSnapshot(name: string, interactions: { req: string; res: string }[]): Snapshot {
  return {
    id: name,
    name,
    createdAt: new Date().toISOString(),
    interactions: interactions.map((i, idx) => ({
      id: `${name}-${idx}`,
      request: i.req,
      response: i.res,
      toolCalls: [],
      startedAt: new Date().toISOString(),
      durationMs: 100,
    })),
  };
}

describe('Diff Engine', () => {
  it('identical snapshots have high similarity', () => {
    const snap = makeSnapshot('v1', [
      { req: 'calculate sum of numbers', res: 'the sum is 42' },
      { req: 'write a sorting algorithm', res: 'here is quicksort implementation' },
    ]);
    const result = compareSnapshots(snap, snap);
    expect(result.overallSimilarity).toBeCloseTo(1, 1);
    expect(result.jensenShannonDivergence).toBeCloseTo(0, 1);
  });

  it('different snapshots have lower similarity', () => {
    const a = makeSnapshot('v1', [
      { req: 'write python flask api', res: 'here is the flask application with routes' },
      { req: 'create database schema', res: 'SQL schema with users and posts tables' },
    ]);
    const b = makeSnapshot('v2', [
      { req: 'draw a landscape painting', res: 'beautiful mountain scene with watercolor' },
      { req: 'compose a symphony', res: 'orchestral piece in C minor' },
    ]);
    const result = compareSnapshots(a, b);
    expect(result.overallSimilarity).toBeLessThan(0.8);
  });

  it('handles empty snapshots', () => {
    const a = makeSnapshot('v1', []);
    const b = makeSnapshot('v2', []);
    const result = compareSnapshots(a, b);
    expect(result.overallSimilarity).toBe(1);
  });
});
