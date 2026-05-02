export function dashboardHtml(snapshots: { name: string; createdAt: string; interactionCount: number }[]): string {
  const rows = snapshots
    .map(
      (s) => `<tr>
      <td><strong>${s.name}</strong></td>
      <td>${s.interactionCount}</td>
      <td>${new Date(s.createdAt).toLocaleString()}</td>
      <td><button onclick="compare('${s.name}')">Compare</button></td>
    </tr>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Agent Diff Dashboard</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:40px;max-width:900px;margin:0 auto}
    h1{font-size:24px;margin-bottom:24px}
    table{width:100%;border-collapse:collapse;background:#1e293b;border-radius:8px;overflow:hidden}
    th,td{padding:12px 16px;text-align:left;border-bottom:1px solid #334155}
    th{background:#0f172a;color:#94a3b8;font-size:12px;text-transform:uppercase}
    button{background:#3b82f6;color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:13px}
    button:hover{background:#2563eb}
    .compare-section{margin-top:32px;background:#1e293b;border-radius:8px;padding:24px}
    select{background:#334155;color:#e2e8f0;border:1px solid #475569;padding:8px 12px;border-radius:6px;font-size:14px}
    #result{margin-top:16px;white-space:pre-wrap;font-family:monospace;font-size:13px}
    .empty{text-align:center;padding:40px;color:#64748b}
  </style>
</head>
<body>
  <h1>🔬 Agent Diff Dashboard</h1>

  ${snapshots.length === 0 ? '<div class="empty">No snapshots yet. POST to /sessions to create one.</div>' : `
  <table>
    <thead><tr><th>Snapshot</th><th>Interactions</th><th>Created</th><th></th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="compare-section">
    <h2 style="margin-bottom:12px">Compare Snapshots</h2>
    <select id="v1">${snapshots.map((s) => `<option value="${s.name}">${s.name}</option>`).join('')}</select>
    <span style="margin:0 8px">→</span>
    <select id="v2">${snapshots.map((s) => `<option value="${s.name}">${s.name}</option>`).join('')}</select>
    <button onclick="runCompare()" style="margin-left:12px">Compare</button>
    <div id="result"></div>
  </div>
  `}

  <script>
    function compare(name) {
      document.getElementById('v1').value = name;
    }
    async function runCompare() {
      const v1 = document.getElementById('v1').value;
      const v2 = document.getElementById('v2').value;
      const res = await fetch('/compare/' + v1 + '/' + v2);
      const data = await res.json();
      document.getElementById('result').textContent = JSON.stringify(data, null, 2);
    }
  </script>
</body>
</html>`;
}
