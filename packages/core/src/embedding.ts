/**
 * TF-IDF vectorizer — self-contained, no external dependencies.
 */

export interface TfIdfModel {
  vocabulary: Map<string, number>;
  idf: Float64Array;
  docCount: number;
}

/** Tokenize text into lowercase terms */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/** Compute term frequency for a document */
function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) ?? 0) + 1);
  }
  // Normalize by doc length
  for (const [k, v] of tf) {
    tf.set(k, v / tokens.length);
  }
  return tf;
}

/** Build a TF-IDF model from a corpus of documents */
export function buildModel(documents: string[]): TfIdfModel {
  const docTokens = documents.map(tokenize);
  const vocab = new Map<string, number>();
  const df = new Map<string, number>();

  // Build vocabulary and document frequencies
  for (const tokens of docTokens) {
    const seen = new Set<string>();
    for (const t of tokens) {
      if (!vocab.has(t)) vocab.set(t, vocab.size);
      if (!seen.has(t)) {
        df.set(t, (df.get(t) ?? 0) + 1);
        seen.add(t);
      }
    }
  }

  // Compute IDF: log(N / df) + 1
  const n = documents.length || 1;
  const idf = new Float64Array(vocab.size);
  for (const [term, idx] of vocab) {
    idf[idx] = Math.log(n / (df.get(term) ?? 1)) + 1;
  }

  return { vocabulary: vocab, idf, docCount: n };
}

/** Vectorize a single document against a fitted model */
export function vectorize(model: TfIdfModel, document: string): Float64Array {
  const tokens = tokenize(document);
  const tf = termFrequency(tokens);
  const vec = new Float64Array(model.vocabulary.size);

  for (const [term, freq] of tf) {
    const idx = model.vocabulary.get(term);
    if (idx !== undefined) {
      vec[idx] = freq * model.idf[idx];
    }
  }
  return vec;
}

/** Vectorize multiple documents */
export function vectorizeAll(model: TfIdfModel, documents: string[]): Float64Array[] {
  return documents.map((d) => vectorize(model, d));
}

/** Cosine similarity between two vectors */
export function cosineSimilarity(a: Float64Array, b: Float64Array): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/** Get top N terms by TF-IDF weight from a vector */
export function topTerms(model: TfIdfModel, vec: Float64Array, n: number = 10): string[] {
  const entries: [string, number][] = [];
  for (const [term, idx] of model.vocabulary) {
    if (vec[idx] > 0) entries.push([term, vec[idx]]);
  }
  entries.sort((a, b) => b[1] - a[1]);
  return entries.slice(0, n).map(([t]) => t);
}
