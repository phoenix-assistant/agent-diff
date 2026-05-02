// ── Types ──

export interface ToolCall {
  name: string;
  input: unknown;
  output: unknown;
  durationMs: number;
}

export interface Interaction {
  id: string;
  request: string;
  response: string;
  toolCalls: ToolCall[];
  startedAt: string;
  durationMs: number;
  tags?: string[];
}

export interface Snapshot {
  id: string;
  name: string;
  createdAt: string;
  interactions: Interaction[];
}

export interface DiffResult {
  snapshotA: string;
  snapshotB: string;
  overallSimilarity: number;
  jensenShannonDivergence: number;
  capabilities: CapabilityDiff[];
  regressions: Regression[];
}

export interface CapabilityDiff {
  capability: string;
  similarityA: number;
  similarityB: number;
  delta: number;
  status: 'improved' | 'regressed' | 'stable';
}

export interface Regression {
  capability: string;
  pValue: number;
  tStatistic: number;
  significant: boolean;
}

export interface Capability {
  name: string;
  keywords: string[];
  interactionIds: string[];
}
