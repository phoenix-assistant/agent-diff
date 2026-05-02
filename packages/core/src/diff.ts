import type { Snapshot, DiffResult, CapabilityDiff } from './types.js';
import { buildModel, vectorize, cosineSimilarity } from './embedding.js';
import { classifyRegressions } from './regression.js';
import { extractCapabilities } from './taxonomy.js';

/** Serialize an interaction to text for embedding */
function interactionToText(i: { request: string; response: string; toolCalls: { name: string }[] }): string {
  const tools = i.toolCalls.map((t) => t.name).join(' ');
  return `${i.request} ${i.response} ${tools}`;
}

/** Jensen-Shannon divergence between two probability distributions */
function jsDivergence(p: Float64Array, q: Float64Array): number {
  // Normalize to probability distributions
  const normalize = (v: Float64Array): Float64Array => {
    const sum = v.reduce((a, b) => a + Math.abs(b), 0) || 1;
    return Float64Array.from(v, (x) => Math.abs(x) / sum);
  };
  const pn = normalize(p);
  const qn = normalize(q);
  const m = Float64Array.from(pn, (_, i) => (pn[i] + qn[i]) / 2);

  const kl = (a: Float64Array, b: Float64Array): number => {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] > 0 && b[i] > 0) sum += a[i] * Math.log(a[i] / b[i]);
    }
    return sum;
  };

  return (kl(pn, m) + kl(qn, m)) / 2;
}

/** Compare two snapshots and produce a behavioral diff */
export function compareSnapshots(a: Snapshot, b: Snapshot): DiffResult {
  const docsA = a.interactions.map(interactionToText);
  const docsB = b.interactions.map(interactionToText);
  const allDocs = [...docsA, ...docsB];

  if (allDocs.length === 0) {
    return {
      snapshotA: a.name,
      snapshotB: b.name,
      overallSimilarity: 1,
      jensenShannonDivergence: 0,
      capabilities: [],
      regressions: [],
    };
  }

  const model = buildModel(allDocs);

  // Compute aggregate vectors for each snapshot
  const vecA = aggregateVectors(docsA.map((d) => vectorize(model, d)), model.vocabulary.size);
  const vecB = aggregateVectors(docsB.map((d) => vectorize(model, d)), model.vocabulary.size);

  const overallSimilarity = cosineSimilarity(vecA, vecB);
  const jensenShannonDivergence = jsDivergence(vecA, vecB);

  // Extract capabilities and compute per-capability diffs
  const capsA = extractCapabilities(a.interactions.map((i) => ({ id: i.id, text: interactionToText(i) })), 5);
  const capsB = extractCapabilities(b.interactions.map((i) => ({ id: i.id, text: interactionToText(i) })), 5);

  const allCapNames = new Set([...capsA.map((c) => c.name), ...capsB.map((c) => c.name)]);
  const capabilities: CapabilityDiff[] = [];

  for (const cap of allCapNames) {
    const capA = capsA.find((c) => c.name === cap);
    const capB = capsB.find((c) => c.name === cap);

    const simA = capA ? computeCapSimilarity(capA.interactionIds, a, model) : 0;
    const simB = capB ? computeCapSimilarity(capB.interactionIds, b, model) : 0;
    const delta = simB - simA;

    capabilities.push({
      capability: cap,
      similarityA: simA,
      similarityB: simB,
      delta,
      status: Math.abs(delta) < 0.05 ? 'stable' : delta > 0 ? 'improved' : 'regressed',
    });
  }

  // Run regression detection
  const scoresA = docsA.map((d) => magnitude(vectorize(model, d)));
  const scoresB = docsB.map((d) => magnitude(vectorize(model, d)));
  const regressions = classifyRegressions(scoresA, scoresB, Array.from(allCapNames));

  return { snapshotA: a.name, snapshotB: b.name, overallSimilarity, jensenShannonDivergence, capabilities, regressions };
}

function aggregateVectors(vecs: Float64Array[], size: number): Float64Array {
  const agg = new Float64Array(size);
  if (vecs.length === 0) return agg;
  for (const v of vecs) for (let i = 0; i < size; i++) agg[i] += v[i];
  for (let i = 0; i < size; i++) agg[i] /= vecs.length;
  return agg;
}

function magnitude(v: Float64Array): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

function computeCapSimilarity(ids: string[], snap: Snapshot, model: ReturnType<typeof buildModel>): number {
  const texts = snap.interactions.filter((i) => ids.includes(i.id)).map((i) => `${i.request} ${i.response}`);
  if (texts.length < 2) return 1;
  const vecs = texts.map((t) => vectorize(model, t));
  let sum = 0, count = 0;
  for (let i = 0; i < vecs.length; i++) {
    for (let j = i + 1; j < vecs.length; j++) {
      sum += cosineSimilarity(vecs[i], vecs[j]);
      count++;
    }
  }
  return count > 0 ? sum / count : 1;
}
