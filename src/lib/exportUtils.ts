import { ClosedTrade, TerminalTelemetry } from '../types/terminal';

/**
 * Converts trade ledger data into CSV format and triggers browser download
 */
export function exportTradesToCsv(trades: ClosedTrade[], filename: string = 'grok-trencher-trades.csv') {
  if (!trades || trades.length === 0) {
    alert('Tidak ada transaksi yang dapat diekspor.');
    return;
  }

  const headers = [
    'Trade ID',
    'Date & Time (UTC)',
    'Symbol',
    'Token Name',
    'Mint Address (CA)',
    'Platform',
    'Entry Price (SOL)',
    'Exit Price (SOL)',
    'Invested (SOL)',
    'PnL (SOL)',
    'PnL (%)',
    'R-Multiplier',
    'Hold Duration (s)',
    'Exit Reason',
    'Jito Tip (SOL)'
  ];

  const rows = trades.map((t) => [
    t.id,
    new Date(t.exitTimestamp).toISOString(),
    `"${t.token.symbol.replace(/"/g, '""')}"`,
    `"${t.token.name.replace(/"/g, '""')}"`,
    t.token.mint,
    t.token.platform,
    t.entryPriceSol.toFixed(9),
    t.exitPriceSol.toFixed(9),
    t.solInvested.toFixed(4),
    t.pnlSol.toFixed(4),
    `${t.pnlPct.toFixed(2)}%`,
    `${t.rMultiplier.toFixed(2)}R`,
    t.holdDurationSec,
    `"${t.exitReason.replace(/"/g, '""')}"`,
    (t.jitoTipSol ?? 0.00005).toFixed(6)
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports trades as structured JSON
 */
export function exportTradesToJson(trades: ClosedTrade[], filename: string = 'grok-trencher-ledger.json') {
  if (!trades || trades.length === 0) {
    alert('Tidak ada transaksi yang dapat diekspor.');
    return;
  }

  const jsonString = JSON.stringify(trades, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates a clean, professional printable tax audit statement in a new window
 */
export function printTradeAuditReport(trades: ClosedTrade[], telemetry: TerminalTelemetry) {
  const winTrades = trades.filter((t) => t.pnlSol > 0);
  const lossTrades = trades.filter((t) => t.pnlSol <= 0);
  const totalPnl = trades.reduce((acc, t) => acc + t.pnlSol, 0);
  const winRate = trades.length > 0 ? ((winTrades.length / trades.length) * 100).toFixed(1) : '0';
  const totalVolume = trades.reduce((acc, t) => acc + t.solInvested, 0);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Grok Trencher - Trade & Tax Audit Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; background: #fff; color: #111; padding: 24px; margin: 0; }
          h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 900; letter-spacing: 0.5px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
          .meta { font-size: 11px; color: #666; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
          .summary-card { border: 1px solid #ddd; padding: 10px; border-radius: 6px; }
          .summary-title { font-size: 10px; color: #666; text-transform: uppercase; }
          .summary-value { font-size: 16px; font-weight: bold; margin-top: 4px; }
          .positive { color: #0a8043; }
          .negative { color: #c5221f; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f2f2f2; text-align: left; padding: 8px 6px; border-bottom: 2px solid #ccc; font-size: 10px; text-transform: uppercase; }
          td { padding: 6px; border-bottom: 1px solid #eee; }
          .mono { font-family: monospace; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>GROK TRENCHER // SOLANA ON-CHAIN TRADE AUDIT</h1>
            <div class="meta">Exported on: ${new Date().toUTCString()} • Total Recorded Trades: ${trades.length}</div>
          </div>
          <div>
            <button onclick="window.print()" style="padding: 6px 14px; background: #111; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px;">PRINT / SAVE PDF</button>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-title">Total Net Realized PnL</div>
            <div class="summary-value ${totalPnl >= 0 ? 'positive' : 'negative'}">${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(4)} SOL</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Win Rate</div>
            <div class="summary-value">${winRate}% (${winTrades.length}W / ${lossTrades.length}L)</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Cumulative Turnover</div>
            <div class="summary-value">${totalVolume.toFixed(2)} SOL</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Rolling Expectancy E[R]</div>
            <div class="summary-value positive">+${telemetry.rollingExpectancyR}R</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Date (UTC)</th>
              <th>Symbol</th>
              <th>Mint Address</th>
              <th>Entry (SOL)</th>
              <th>Exit (SOL)</th>
              <th>PnL (SOL)</th>
              <th>PnL (%)</th>
              <th>R-Mult</th>
              <th>Hold</th>
              <th>Exit Reason</th>
            </tr>
          </thead>
          <tbody>
            ${trades.map((t) => `
              <tr>
                <td class="mono">${t.id}</td>
                <td>${new Date(t.exitTimestamp).toLocaleDateString()} ${new Date(t.exitTimestamp).toLocaleTimeString()}</td>
                <td><strong>${t.token.symbol}</strong></td>
                <td class="mono">${t.token.mint.slice(0, 4)}...${t.token.mint.slice(-4)}</td>
                <td class="mono">${t.entryPriceSol.toFixed(8)}</td>
                <td class="mono">${t.exitPriceSol.toFixed(8)}</td>
                <td class="mono ${t.pnlSol >= 0 ? 'positive' : 'negative'}"><strong>${t.pnlSol >= 0 ? '+' : ''}${t.pnlSol.toFixed(4)}</strong></td>
                <td class="${t.pnlPct >= 0 ? 'positive' : 'negative'}">${t.pnlPct >= 0 ? '+' : ''}${t.pnlPct.toFixed(2)}%</td>
                <td>${t.rMultiplier >= 0 ? '+' : ''}${t.rMultiplier.toFixed(2)}R</td>
                <td>${t.holdDurationSec}s</td>
                <td>${t.exitReason}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
