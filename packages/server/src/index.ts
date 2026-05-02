import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { Storage, SessionRecorder, compareSnapshots } from '@phoenixaihub/agent-diff-core';
import type { Interaction } from '@phoenixaihub/agent-diff-core';
import { dashboardHtml } from './dashboard.js';

const app = new Hono();
const storage = new Storage(process.env.AGENT_DIFF_DB ?? 'agent-diff.db');

// POST /sessions — create a snapshot from interactions
app.post('/sessions', async (c) => {
  const body = await c.req.json<{ name: string; interactions: Interaction[] }>();
  if (!body.name || !body.interactions) {
    return c.json({ error: 'name and interactions required' }, 400);
  }

  const recorder = new SessionRecorder();
  for (const i of body.interactions) {
    recorder.addInteraction(i);
  }
  const snapshot = recorder.toSnapshot(body.name);
  storage.saveSnapshot(snapshot);

  return c.json({ id: snapshot.id, name: snapshot.name, interactions: snapshot.interactions.length }, 201);
});

// GET /snapshots — list all snapshots
app.get('/snapshots', (c) => {
  return c.json(storage.listSnapshots());
});

// GET /snapshots/:name — get a single snapshot
app.get('/snapshots/:name', (c) => {
  const snap = storage.getSnapshot(c.req.param('name'));
  if (!snap) return c.json({ error: 'not found' }, 404);
  return c.json(snap);
});

// GET /compare/:v1/:v2 — compare two snapshots
app.get('/compare/:v1/:v2', (c) => {
  const snapA = storage.getSnapshot(c.req.param('v1'));
  const snapB = storage.getSnapshot(c.req.param('v2'));
  if (!snapA || !snapB) {
    return c.json({ error: `snapshot not found: ${!snapA ? c.req.param('v1') : c.req.param('v2')}` }, 404);
  }

  const diff = compareSnapshots(snapA, snapB);
  storage.saveDiff(diff);
  return c.json(diff);
});

// GET /dashboard — HTML dashboard
app.get('/dashboard', (c) => {
  const snapshots = storage.listSnapshots();
  return c.html(dashboardHtml(snapshots));
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

const port = parseInt(process.env.PORT ?? '3456', 10);

export { app };
export default app;

// Only start server when run directly
if (process.argv[1]?.includes('agent-diff-server') || process.argv[1]?.endsWith('/index.js')) {
  serve({ fetch: app.fetch, port }, () => {
    console.log(`agent-diff server running on http://localhost:${port}`);
  });
}
