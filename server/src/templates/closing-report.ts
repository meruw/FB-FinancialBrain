import type { Narrative } from '../schemas/narrator.js';
import type { ReconciliationSession } from '../services/data.js';

function categoryBadge(category: 'vendor' | 'pattern' | 'risk'): string {
  const styles: Record<string, string> = {
    vendor: 'background:#ede9ff;color:#5b52c4;',
    risk: 'background:#ffe8e8;color:#c0392b;',
    pattern: 'background:#e8f4ff;color:#1a6ea8;',
  };
  return `<span style="font-size:9px;text-transform:uppercase;letter-spacing:1px;font-weight:700;
    padding:3px 9px;border-radius:4px;white-space:nowrap;${styles[category]}">${category}</span>`;
}

function probabilityBar(pct: number, color = '#7F77DD'): string {
  return `
    <div style="height:6px;background:#ede9ff;border-radius:3px;margin:6px 0 0;">
      <div style="height:100%;width:${Math.round(pct * 100)}%;background:${color};border-radius:3px;"></div>
    </div>`;
}

export function buildClosingReportHtml(
  narrator: Narrative,
  session: ReconciliationSession,
  generatedAt: string,
): string {
  const currentPct = Math.round(narrator.stats.closeProbability * 100);
  const nextPct = Math.round(narrator.nextCloseProbability * 100);
  const deltaSign = narrator.nextCloseDelta >= 0 ? '+' : '';

  const insightsHtml = narrator.learnedThisSession
    .map(
      (item) => `
      <div style="display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px solid #f0eeff;">
        <div style="margin-top:2px;min-width:60px;">${categoryBadge(item.category)}</div>
        <p style="font-size:13px;line-height:1.7;color:#2d2d44;flex:1;">${item.insight}</p>
      </div>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      color: #1a1a2e;
      background: #ffffff;
      font-size: 14px;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div style="background:#7F77DD;color:white;padding:28px 48px;display:flex;justify-content:space-between;align-items:center;">
    <div>
      <div style="font-size:20px;font-weight:800;letter-spacing:0.5px;">FastBank Financial Brain</div>
      <div style="font-size:12px;opacity:0.75;margin-top:4px;letter-spacing:1px;text-transform:uppercase;">Session Closing Report</div>
    </div>
    <div style="text-align:right;font-size:12px;opacity:0.85;line-height:1.8;">
      <div>Generated ${generatedAt}</div>
      <div style="font-weight:600;">CONFIDENTIAL</div>
    </div>
  </div>

  <!-- SESSION META BAR -->
  <div style="background:#faf9ff;border-bottom:1px solid #e8e4ff;padding:14px 48px;display:flex;gap:48px;">
    <div>
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#999;">Period</div>
      <div style="font-size:14px;font-weight:600;margin-top:2px;">${session.period}</div>
    </div>
    <div>
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#999;">Account</div>
      <div style="font-size:14px;font-weight:600;margin-top:2px;">${session.account}${session.accountNumber ? ' ' + session.accountNumber : ''}</div>
    </div>
    <div>
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#999;">Currency</div>
      <div style="font-size:14px;font-weight:600;margin-top:2px;">${session.currency ?? 'USD'}</div>
    </div>
    <div>
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#999;">Session ID</div>
      <div style="font-size:14px;font-weight:600;margin-top:2px;">${session.id}</div>
    </div>
  </div>

  <!-- MAIN CONTENT -->
  <div style="padding:40px 48px;">

    <!-- PROBABILITY HERO -->
    <div style="display:flex;gap:40px;align-items:flex-start;margin-bottom:36px;padding-bottom:36px;border-bottom:1px solid #eee;">
      <div style="min-width:160px;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#999;margin-bottom:4px;">Close Probability</div>
        <div style="font-size:72px;font-weight:800;color:#7F77DD;line-height:1;">${currentPct}%</div>
        ${probabilityBar(narrator.stats.closeProbability)}
      </div>
      <div style="flex:1;padding-top:6px;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#999;margin-bottom:10px;">Brain Assessment</div>
        <p style="font-size:16px;font-style:italic;line-height:1.6;color:#2d2d44;">"${narrator.headline}"</p>
      </div>
    </div>

    <!-- SESSION STATS -->
    <div style="display:flex;gap:0;margin-bottom:36px;border:1px solid #ede9ff;border-radius:8px;overflow:hidden;">
      ${[
        { label: 'Transactions Matched', value: narrator.stats.matched },
        { label: 'Remaining Unmatched', value: narrator.stats.unmatched },
        { label: 'Match Rate', value: `${Math.round((narrator.stats.matched / (narrator.stats.matched + narrator.stats.unmatched)) * 100)}%` },
        { label: 'Blockers Resolved', value: narrator.stats.resolvedBlockers },
      ]
        .map(
          (s, i) => `
        <div style="flex:1;padding:18px 24px;text-align:center;${i > 0 ? 'border-left:1px solid #ede9ff;' : ''}">
          <div style="font-size:28px;font-weight:800;color:#1a1a2e;">${s.value}</div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-top:4px;">${s.label}</div>
        </div>`,
        )
        .join('')}
    </div>

    <!-- NARRATIVE -->
    <div style="margin-bottom:36px;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#7F77DD;font-weight:700;margin-bottom:14px;">Session Narrative</div>
      ${narrator.narrative
        .split('\n\n')
        .map(
          (para) =>
            `<p style="font-size:13.5px;line-height:1.85;color:#2d2d44;margin-bottom:14px;">${para.trim()}</p>`,
        )
        .join('')}
    </div>

    <!-- LEARNED THIS SESSION -->
    <div style="margin-bottom:36px;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#7F77DD;font-weight:700;margin-bottom:4px;">What the Brain Learned This Session</div>
      ${insightsHtml}
    </div>

    <!-- NEXT SESSION PROJECTION -->
    <div style="background:#faf9ff;border:2px solid #7F77DD;border-radius:10px;padding:28px 36px;margin-bottom:36px;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#7F77DD;font-weight:700;margin-bottom:20px;">Next Session Projection</div>
      <div style="display:flex;gap:0;align-items:flex-start;">
        <div style="flex:1;text-align:center;">
          <div style="font-size:48px;font-weight:800;color:#7F77DD;line-height:1;">${nextPct}%</div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-top:6px;">Projected Close Probability</div>
          ${probabilityBar(narrator.nextCloseProbability)}
        </div>
        <div style="width:1px;background:#e0dbff;margin:0 32px;"></div>
        <div style="flex:1;text-align:center;">
          <div style="font-size:48px;font-weight:800;color:#5b52c4;line-height:1;">${deltaSign}${narrator.nextCloseDelta}%</div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-top:6px;">Improvement from Today</div>
        </div>
        <div style="width:1px;background:#e0dbff;margin:0 32px;"></div>
        <div style="flex:1;text-align:center;">
          <div style="font-size:48px;font-weight:800;color:#5b52c4;line-height:1;">${narrator.sessionsToTarget}</div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-top:6px;">Sessions Until 95%+ Close Rate</div>
        </div>
      </div>
      <p style="font-size:12px;color:#888;font-style:italic;margin-top:18px;text-align:center;">
        Projection assumes all Brain recommendations with resolvability ≥ 50% are applied this session.
      </p>
    </div>

    <!-- DISCLAIMER -->
    <div style="background:#f8f8f8;border-left:3px solid #c0bcf0;border-radius:0 4px 4px 0;padding:16px 20px;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#aaa;font-weight:700;margin-bottom:6px;">Important Notice</div>
      <p style="font-size:11.5px;color:#666;line-height:1.7;">
        This report was generated by FastBank Financial Brain on ${generatedAt}.
        Close probability projections are based on historical reconciliation data for this account
        and are intended as operational guidance only. Values reflect the session state at the time
        of generation and do not constitute a final accounting decision. Always validate findings
        with your accounting team before making period-close or financial reporting decisions.
        FastBank Financial Brain does not constitute financial, legal, or audit advice.
      </p>
    </div>

  </div>

  <!-- FOOTER -->
  <div style="text-align:center;padding:16px 48px 28px;font-size:10px;color:#bbb;border-top:1px solid #f0eeff;margin-top:8px;">
    FastBank Financial Brain &nbsp;·&nbsp; Powered by Anthropic Claude &nbsp;·&nbsp; ${generatedAt}
  </div>

</body>
</html>`;
}
