import Database from 'better-sqlite3';
import type { Snapshot, DiffResult } from './types.js';

export class Storage {
  private db: Database.Database;

  constructor(dbPath: string = 'agent-diff.db') {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL,
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS diffs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        snapshot_a TEXT NOT NULL,
        snapshot_b TEXT NOT NULL,
        created_at TEXT NOT NULL,
        data TEXT NOT NULL,
        UNIQUE(snapshot_a, snapshot_b)
      );
    `);
  }

  saveSnapshot(snapshot: Snapshot): void {
    this.db.prepare(
      'INSERT OR REPLACE INTO snapshots (id, name, created_at, data) VALUES (?, ?, ?, ?)',
    ).run(snapshot.id, snapshot.name, snapshot.createdAt, JSON.stringify(snapshot));
  }

  getSnapshot(name: string): Snapshot | null {
    const row = this.db.prepare('SELECT data FROM snapshots WHERE name = ?').get(name) as { data: string } | undefined;
    return row ? JSON.parse(row.data) : null;
  }

  listSnapshots(): { name: string; createdAt: string; interactionCount: number }[] {
    const rows = this.db.prepare('SELECT name, created_at, data FROM snapshots ORDER BY created_at DESC').all() as {
      name: string; created_at: string; data: string;
    }[];
    return rows.map((r) => {
      const snap: Snapshot = JSON.parse(r.data);
      return { name: r.name, createdAt: r.created_at, interactionCount: snap.interactions.length };
    });
  }

  saveDiff(diff: DiffResult): void {
    this.db.prepare(
      'INSERT OR REPLACE INTO diffs (snapshot_a, snapshot_b, created_at, data) VALUES (?, ?, ?, ?)',
    ).run(diff.snapshotA, diff.snapshotB, new Date().toISOString(), JSON.stringify(diff));
  }

  getDiff(a: string, b: string): DiffResult | null {
    const row = this.db.prepare(
      'SELECT data FROM diffs WHERE snapshot_a = ? AND snapshot_b = ?',
    ).get(a, b) as { data: string } | undefined;
    return row ? JSON.parse(row.data) : null;
  }

  close(): void {
    this.db.close();
  }
}
