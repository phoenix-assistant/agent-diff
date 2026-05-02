import type { Capability } from './types.js';
import { buildModel, vectorize, topTerms, cosineSimilarity } from './embedding.js';

interface DocEntry {
  id: string;
  text: string;
}

/**
 * Extract capabilities by clustering interactions using k-means on TF-IDF vectors.
 */
export function extractCapabilities(docs: DocEntry[], k: number): Capability[] {
  if (docs.length === 0) return [];
  k = Math.min(k, docs.length);

  const model = buildModel(docs.map((d) => d.text));
  const vecs = docs.map((d) => vectorize(model, d.text));
  const dim = model.vocabulary.size;

  if (dim === 0) return [];

  // K-means clustering
  const assignments = new Int32Array(docs.length);
  // Initialize centroids to first k docs
  const centroids: Float64Array[] = [];
  for (let i = 0; i < k; i++) {
    centroids.push(Float64Array.from(vecs[i % vecs.length]));
  }

  for (let iter = 0; iter < 20; iter++) {
    // Assign
    let changed = false;
    for (let i = 0; i < vecs.length; i++) {
      let bestCluster = 0, bestSim = -1;
      for (let c = 0; c < k; c++) {
        const sim = cosineSimilarity(vecs[i], centroids[c]);
        if (sim > bestSim) { bestSim = sim; bestCluster = c; }
      }
      if (assignments[i] !== bestCluster) changed = true;
      assignments[i] = bestCluster;
    }
    if (!changed) break;

    // Update centroids
    for (let c = 0; c < k; c++) {
      const centroid = new Float64Array(dim);
      let count = 0;
      for (let i = 0; i < vecs.length; i++) {
        if (assignments[i] === c) {
          for (let d = 0; d < dim; d++) centroid[d] += vecs[i][d];
          count++;
        }
      }
      if (count > 0) for (let d = 0; d < dim; d++) centroid[d] /= count;
      centroids[c] = centroid;
    }
  }

  // Build capabilities from clusters
  const capabilities: Capability[] = [];
  for (let c = 0; c < k; c++) {
    const ids: string[] = [];
    for (let i = 0; i < docs.length; i++) {
      if (assignments[i] === c) ids.push(docs[i].id);
    }
    if (ids.length === 0) continue;

    const keywords = topTerms(model, centroids[c], 5);
    capabilities.push({
      name: keywords.slice(0, 3).join('-') || `cluster-${c}`,
      keywords,
      interactionIds: ids,
    });
  }

  return capabilities;
}
