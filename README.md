# agent-diff

**Behavioral diff engine for AI agents.** Compare agent versions by analyzing interaction patterns, not just outputs.

Record agent sessions → snapshot behavioral patterns → diff across versions → detect regressions.

## How It Works

```
Agent v1 sessions → TF-IDF vectorization → behavioral fingerprint
                                                    ↓
                                              cosine similarity
                                              JS divergence
                                              Welch's t-test
                                                    ↓
Agent v2 sessions → TF-IDF vectorization → behavioral fingerprint
                                                    ↓
                                            capability heatmap
                                            regression report
```

**No external model dependencies.** Uses self-contained TF-IDF vectorization with cosine similarity and Jensen-Shannon divergence for behavioral comparison.

## Packages

| Package | Description |
|---------|-------------|
| `@phoenixaihub/agent-diff-core` | Session recorder, TF-IDF embeddings, diff engine, regression detection, SQLite storage |
| `@phoenixaihub/agent-diff-cli` | CLI for recording, snapshotting, comparing, and reporting |
| `@phoenixaihub/agent-diff-server` | Hono HTTP API + dashboard |

## Quick Start

```bash
npm install
npm run build

# Record sessions
npx agent-diff record --name v1
# Enter JSON interactions, type "done" to save

# Import from file
npx agent-diff snapshot --name v1 --file sessions-v1.json

# Compare versions
npx agent-diff compare v1 v2

# Generate HTML report with capability heatmap
npx agent-diff report v1 v2 --html -o report.html

# List snapshots
npx agent-diff list
```

## Server

```bash
cd packages/server
npm start
# → http://localhost:3456
```

### API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sessions` | Create snapshot from interactions |
| GET | `/snapshots` | List all snapshots |
| GET | `/snapshots/:name` | Get snapshot details |
| GET | `/compare/:v1/:v2` | Compare two snapshots |
| GET | `/dashboard` | HTML dashboard |
| GET | `/health` | Health check |

### POST /sessions

```json
{
  "name": "v2.1",
  "interactions": [
    {
      "id": "abc-123",
      "request": "What is the weather?",
      "response": "It's 72°F and sunny.",
      "toolCalls": [{ "name": "weather_api", "input": {"city": "SF"}, "output": {"temp": 72}, "durationMs": 150 }],
      "startedAt": "2026-05-01T10:00:00Z",
      "durationMs": 500
    }
  ]
}
```

## Core API

```typescript
import { SessionRecorder, Storage, compareSnapshots } from '@phoenixaihub/agent-diff-core';

// Record
const recorder = new SessionRecorder();
recorder.startInteraction('What is 2+2?');
recorder.recordToolCall('calc', { op: 'add' }, 4, 10);
recorder.endInteraction('The answer is 4');
const snapshot = recorder.toSnapshot('v1');

// Store
const storage = new Storage('agent-diff.db');
storage.saveSnapshot(snapshot);

// Compare
const diff = compareSnapshots(snapshotV1, snapshotV2);
console.log(diff.overallSimilarity);     // 0.87
console.log(diff.jensenShannonDivergence); // 0.042
console.log(diff.capabilities);           // per-capability breakdown
console.log(diff.regressions);            // statistical significance
```

## Architecture

- **TF-IDF Vectorizer**: Self-contained text → vector encoding. No external models needed.
- **Cosine Similarity**: Measures behavioral overlap between agent versions.
- **Jensen-Shannon Divergence**: Information-theoretic distance between behavioral distributions.
- **K-Means Clustering**: Auto-discovers capability categories from interaction patterns.
- **Welch's t-test**: Statistical regression detection with configurable significance threshold.
- **SQLite Storage**: Persistent snapshots and diffs via better-sqlite3.

## Development

```bash
npm install
npm run build    # Build all packages
npm test         # Run all tests
```

## License

MIT
