import { describe, it, expect } from 'vitest';
import { buildModel, vectorize, cosineSimilarity, topTerms } from '../embedding.js';

describe('TF-IDF Embedding', () => {
  it('builds a model and vectorizes documents', () => {
    const docs = ['the cat sat on the mat', 'the dog sat on the log', 'birds fly in the sky'];
    const model = buildModel(docs);

    expect(model.vocabulary.size).toBeGreaterThan(0);
    expect(model.idf.length).toBe(model.vocabulary.size);

    const vec = vectorize(model, 'the cat sat on the mat');
    expect(vec.length).toBe(model.vocabulary.size);
  });

  it('similar documents have high cosine similarity', () => {
    const docs = ['typescript node express api', 'typescript react frontend app', 'python django backend server'];
    const model = buildModel(docs);
    const v1 = vectorize(model, 'typescript node express api');
    const v2 = vectorize(model, 'typescript react frontend app');
    const v3 = vectorize(model, 'python django backend server');

    expect(cosineSimilarity(v1, v2)).toBeGreaterThan(cosineSimilarity(v1, v3));
  });

  it('extracts top terms', () => {
    const docs = ['machine learning deep neural network', 'web development react javascript'];
    const model = buildModel(docs);
    const vec = vectorize(model, 'machine learning deep neural network');
    const terms = topTerms(model, vec, 3);
    expect(terms.length).toBeLessThanOrEqual(3);
    expect(terms.length).toBeGreaterThan(0);
  });
});
