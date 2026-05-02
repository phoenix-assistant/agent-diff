#!/usr/bin/env node
import { Command } from 'commander';
import { SessionRecorder, Storage, compareSnapshots } from '@phoenixaihub/agent-diff-core';
import { generateHtmlReport } from './report.js';
import { createInterface } from 'node:readline';
import { writeFileSync } from 'node:fs';

const program = new Command();

program
  .name('agent-diff')
  .description('Behavioral diff engine for AI agents')
  .version('0.1.0');

program
  .command('record')
  .description('Start an interactive recording session')
  .requiredOption('--name <name>', 'Snapshot name')
  .option('--db <path>', 'Database path', 'agent-diff.db')
  .action(async (opts: { name: string; db: string }) => {
    const recorder = new SessionRecorder();
    const rl = createInterface({ input: process.stdin, output: process.stdout });

    console.log(`Recording session "${opts.name}". Enter interactions as JSON lines.`);
    console.log('Format: {"request":"...","response":"...","toolCalls":[]}');
    console.log('Type "done" to save and exit.\n');

    for await (const line of rl) {
      if (line.trim() === 'done') break;
      try {
        const data = JSON.parse(line);
        recorder.startInteraction(data.request ?? '');
        if (data.toolCalls) {
          for (const tc of data.toolCalls) {
            recorder.recordToolCall(tc.name, tc.input, tc.output, tc.durationMs ?? 0);
          }
        }
        recorder.endInteraction(data.response ?? '', data.tags);
        console.log(`  ✓ Recorded interaction #${recorder.count}`);
      } catch {
        console.error('  ✗ Invalid JSON, skipping');
      }
    }

    const snapshot = recorder.toSnapshot(opts.name);
    const storage = new Storage(opts.db);
    storage.saveSnapshot(snapshot);
    storage.close();
    console.log(`\nSaved snapshot "${opts.name}" with ${snapshot.interactions.length} interactions.`);
  });

program
  .command('snapshot')
  .description('Import a snapshot from a JSON file')
  .requiredOption('--name <name>', 'Snapshot name')
  .option('--file <path>', 'JSON file with interactions array')
  .option('--db <path>', 'Database path', 'agent-diff.db')
  .action(async (opts: { name: string; file?: string; db: string }) => {
    if (!opts.file) {
      console.error('--file is required for snapshot import');
      process.exit(1);
    }
    const { readFileSync } = await import('node:fs');
    const data = JSON.parse(readFileSync(opts.file, 'utf-8'));
    const recorder = new SessionRecorder();
    for (const i of (data.interactions ?? data)) {
      recorder.addInteraction(i);
    }
    const snapshot = recorder.toSnapshot(opts.name);
    const storage = new Storage(opts.db);
    storage.saveSnapshot(snapshot);
    storage.close();
    console.log(`Saved snapshot "${opts.name}" with ${snapshot.interactions.length} interactions.`);
  });

program
  .command('compare <v1> <v2>')
  .description('Compare two snapshots')
  .option('--db <path>', 'Database path', 'agent-diff.db')
  .action((v1: string, v2: string, opts: { db: string }) => {
    const storage = new Storage(opts.db);
    const snapA = storage.getSnapshot(v1);
    const snapB = storage.getSnapshot(v2);
    if (!snapA || !snapB) {
      console.error(`Snapshot not found: ${!snapA ? v1 : v2}`);
      storage.close();
      process.exit(1);
    }

    const diff = compareSnapshots(snapA, snapB);
    storage.saveDiff(diff);
    storage.close();

    console.log(`\n  Comparison: ${v1} → ${v2}`);
    console.log(`  Overall Similarity: ${(diff.overallSimilarity * 100).toFixed(1)}%`);
    console.log(`  JS Divergence:      ${diff.jensenShannonDivergence.toFixed(4)}\n`);

    if (diff.capabilities.length > 0) {
      console.log('  Capabilities:');
      console.log('  ' + '-'.repeat(60));
      console.log('  ' + 'Capability'.padEnd(30) + 'Delta'.padEnd(10) + 'Status');
      console.log('  ' + '-'.repeat(60));
      for (const cap of diff.capabilities) {
        const emoji = cap.status === 'improved' ? '🟢' : cap.status === 'regressed' ? '🔴' : '⚪';
        console.log(`  ${cap.capability.padEnd(30)}${(cap.delta > 0 ? '+' : '') + cap.delta.toFixed(3).padEnd(10)}${emoji} ${cap.status}`);
      }
    }

    if (diff.regressions.some((r) => r.significant)) {
      console.log('\n  ⚠️  Significant regressions detected:');
      for (const r of diff.regressions.filter((r) => r.significant)) {
        console.log(`    ${r.capability} (p=${r.pValue.toFixed(4)}, t=${r.tStatistic.toFixed(3)})`);
      }
    }
  });

program
  .command('report <v1> <v2>')
  .description('Generate an HTML report')
  .option('--html', 'Output HTML format')
  .option('-o, --output <path>', 'Output file path', 'report.html')
  .option('--db <path>', 'Database path', 'agent-diff.db')
  .action((v1: string, v2: string, opts: { output: string; db: string }) => {
    const storage = new Storage(opts.db);
    const snapA = storage.getSnapshot(v1);
    const snapB = storage.getSnapshot(v2);
    if (!snapA || !snapB) {
      console.error(`Snapshot not found: ${!snapA ? v1 : v2}`);
      storage.close();
      process.exit(1);
    }

    const diff = compareSnapshots(snapA, snapB);
    storage.saveDiff(diff);
    storage.close();

    const html = generateHtmlReport(diff);
    writeFileSync(opts.output, html);
    console.log(`Report written to ${opts.output}`);
  });

program
  .command('list')
  .description('List all snapshots')
  .option('--db <path>', 'Database path', 'agent-diff.db')
  .action((opts: { db: string }) => {
    const storage = new Storage(opts.db);
    const snaps = storage.listSnapshots();
    storage.close();

    if (snaps.length === 0) {
      console.log('No snapshots found.');
      return;
    }

    console.log('\n  ' + 'Name'.padEnd(20) + 'Interactions'.padEnd(15) + 'Created');
    console.log('  ' + '-'.repeat(55));
    for (const s of snaps) {
      console.log(`  ${s.name.padEnd(20)}${String(s.interactionCount).padEnd(15)}${s.createdAt}`);
    }
  });

program.parse();
