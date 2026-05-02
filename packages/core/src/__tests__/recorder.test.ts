import { describe, it, expect } from 'vitest';
import { SessionRecorder } from '../recorder.js';

describe('SessionRecorder', () => {
  it('records interactions and creates snapshots', () => {
    const recorder = new SessionRecorder();

    recorder.startInteraction('What is 2+2?');
    recorder.recordToolCall('calculator', { op: 'add', a: 2, b: 2 }, 4, 10);
    recorder.endInteraction('The answer is 4', ['math']);

    recorder.startInteraction('Write hello world');
    recorder.endInteraction('console.log("hello world")', ['code']);

    expect(recorder.count).toBe(2);

    const snapshot = recorder.toSnapshot('v1');
    expect(snapshot.name).toBe('v1');
    expect(snapshot.interactions).toHaveLength(2);
    expect(snapshot.interactions[0].toolCalls).toHaveLength(1);
    expect(snapshot.interactions[0].tags).toEqual(['math']);
  });

  it('clears recorded interactions', () => {
    const recorder = new SessionRecorder();
    recorder.startInteraction('test');
    recorder.endInteraction('done');
    expect(recorder.count).toBe(1);
    recorder.clear();
    expect(recorder.count).toBe(0);
  });
});
