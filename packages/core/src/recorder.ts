import { randomUUID } from 'node:crypto';
import type { Interaction, ToolCall, Snapshot } from './types.js';

/**
 * Records agent interactions into a snapshot.
 */
export class SessionRecorder {
  private interactions: Interaction[] = [];
  private currentStart: number | null = null;
  private currentRequest: string = '';
  private currentToolCalls: ToolCall[] = [];

  /** Begin recording a new interaction */
  startInteraction(request: string): void {
    this.currentStart = Date.now();
    this.currentRequest = request;
    this.currentToolCalls = [];
  }

  /** Record a tool call within the current interaction */
  recordToolCall(name: string, input: unknown, output: unknown, durationMs: number): void {
    this.currentToolCalls.push({ name, input, output, durationMs });
  }

  /** End the current interaction and save it */
  endInteraction(response: string, tags?: string[]): Interaction {
    const start = this.currentStart ?? Date.now();
    const interaction: Interaction = {
      id: randomUUID(),
      request: this.currentRequest,
      response,
      toolCalls: [...this.currentToolCalls],
      startedAt: new Date(start).toISOString(),
      durationMs: Date.now() - start,
      tags,
    };
    this.interactions.push(interaction);
    this.currentStart = null;
    this.currentRequest = '';
    this.currentToolCalls = [];
    return interaction;
  }

  /** Add a pre-built interaction directly */
  addInteraction(interaction: Interaction): void {
    this.interactions.push(interaction);
  }

  /** Export all recorded interactions as a snapshot */
  toSnapshot(name: string): Snapshot {
    return {
      id: randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      interactions: [...this.interactions],
    };
  }

  /** Get current interaction count */
  get count(): number {
    return this.interactions.length;
  }

  /** Clear all recorded interactions */
  clear(): void {
    this.interactions = [];
  }
}
