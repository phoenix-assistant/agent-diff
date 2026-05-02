import type { DiffResult } from '@phoenixaihub/agent-diff-core';

export function generateHtmlReport(diff: DiffResult): string {
  const capRows = diff.capabilities
    .map((c) => {
      const color = c.status === 'improved' ? '#22c55e' : c.status === 'regressed' ? '#ef4444' : '#6b7280';
      const bg = c.status === 'improved' ? '#f0fdf4' : c.status === 'regressed' ? '#fef2f2' : '#f9fafb';
      return `<tr style="background:${bg}">
        <td>${c.capability}</td>
        <td>${(c.similarityA * 100).toFixed(1)}%</td>
        <td>${(c.similarityB * 100).toFixed(1)}%</td>
        <td style="color:${color};font-weight:600">${c.delta > 0 ? '+' : ''}${(c.delta * 100).toFixed(1)}%</td>
        <td style="color:${color}">${c.status}</td>
      </tr>`;
    })
    .join('\n');

  const heatmapCells = diff.capabilities
    .map((c) => {
      const intensity = Math.min(Math.abs(c.delta) * 5, 1);
      const hue = c.delta >= 0 ? 120 : 0;
      return `<div style="background:hsla(${hue},70%,50%,${intensity});padding:12px;border-radius:6px;text-align:center;min-width:100px">
        <div style="font-size:11px;opacity:0.8">${c.capability}</div>
        <div style="font-size:18px;font-weight:700">${c.delta > 0 ? '+' : ''}${(c.delta * 100).toFixed(1)}%</div>
      </div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Agent Diff: ${diff.snapshotA} → ${diff.snapshotB}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;padding:40px;max-width:1000px;margin:0 auto}
    h1{font-size:28px;margin-bottom:8px}
    .subtitle{color:#94a3b8;margin-bottom:32px}
    .card{background:#1e293b;border-radius:12px;padding:24px;margin-bottom:24px}
    .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px}
    .stat{background:#1e293b;border-radius:12px;padding:20px;text-align:center}
    .stat-value{font-size:32px;font-weight:700;color:#38bdf8}
    .stat-label{font-size:13px;color:#94a3b8;margin-top:4px}
    table{width:100%;border-collapse:collapse}
    th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #334155}
    th{color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px}
    td{color:#e2e8f0}
    .heatmap{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
    .warn{background:#7f1d1d;border:1px solid #dc2626;border-radius:8px;padding:16px;margin-top:16px}
  </style>
</head>
<body>
  <h1>🔬 Agent Behavioral Diff</h1>
  <p class="subtitle">${diff.snapshotA} → ${diff.snapshotB}</p>

  <div class="stats">
    <div class="stat">
      <div class="stat-value">${(diff.overallSimilarity * 100).toFixed(1)}%</div>
      <div class="stat-label">Overall Similarity</div>
    </div>
    <div class="stat">
      <div class="stat-value">${diff.jensenShannonDivergence.toFixed(4)}</div>
      <div class="stat-label">JS Divergence</div>
    </div>
    <div class="stat">
      <div class="stat-value">${diff.capabilities.length}</div>
      <div class="stat-label">Capabilities Tracked</div>
    </div>
  </div>

  <div class="card">
    <h2 style="margin-bottom:16px">Capability Heatmap</h2>
    <div class="heatmap">${heatmapCells}</div>
  </div>

  <div class="card">
    <h2 style="margin-bottom:16px">Detailed Comparison</h2>
    <table>
      <thead><tr><th>Capability</th><th>${diff.snapshotA}</th><th>${diff.snapshotB}</th><th>Delta</th><th>Status</th></tr></thead>
      <tbody>${capRows}</tbody>
    </table>
  </div>

  ${diff.regressions.some((r) => r.significant) ? `
  <div class="warn">
    <h3>⚠️ Significant Regressions</h3>
    <ul style="margin-top:8px;padding-left:20px">
      ${diff.regressions.filter((r) => r.significant).map((r) => `<li>${r.capability} — p=${r.pValue.toFixed(4)}, t=${r.tStatistic.toFixed(3)}</li>`).join('\n')}
    </ul>
  </div>` : ''}
</body>
</html>`;
}
