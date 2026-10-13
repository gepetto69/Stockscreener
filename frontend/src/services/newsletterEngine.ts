// @ts-nocheck
import { LocalEngine } from './localEngine';

function esc(s: any) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildNewsletterHtml(opts: {
  userName?: string;
  portfolios: any[];
  playbook?: any;
  newsBySymbol?: Record<string, any[]>;
} = {}) {
  const when = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const name = opts.userName || 'investisseur';
  const portfolios = opts.portfolios || [];
  const playbook = opts.playbook;
  const newsBySymbol = opts.newsBySymbol || {};
  const nPos = portfolios.reduce((s, p) => s + (p.positions?.length || 0), 0);
  const totalVal = portfolios.reduce((s, p) => s + Number(p.total_value || 0), 0);
  const nOrders = (playbook?.orders || []).length;
  const nextReview = playbook?.protocol?.next_review || 'dans 10 jours';

  const ideaRows = (playbook?.ideas || [])
    .filter((r) => r.in_portfolio || ['renforcer', 'alléger', 'sortir', 'ouvrir'].includes(r.action))
    .slice(0, 12)
    .map(
      (r) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0"><strong>${esc(r.symbol)}</strong></td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${r.ret_10d == null ? '—' : esc(r.ret_10d) + '%'}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${r.mos == null ? '—' : esc(r.mos) + '%'}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0">${esc(r.action)}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#475569">${esc(r.reason || '')}</td>
      </tr>`
    )
    .join('');

  const steps = (playbook?.protocol?.steps || [])
    .map((s, i) => `<li style="margin:0 0 6px">${i + 1}. ${esc(s)}</li>`)
    .join('');

  const portfolioBlocks = portfolios
    .map((p) => {
      const rows = (p.positions || [])
        .map(
          (pos) => `<tr>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0"><strong>${esc(pos.symbol)}</strong><br/><span style="color:#64748b;font-size:12px">${esc(pos.name)}</span></td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${esc(pos.shares)}</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${esc(pos.current_price)}</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;color:${(pos.unrealized_pnl || 0) >= 0 ? '#047857' : '#b91c1c'}">${esc(pos.unrealized_pnl_pct)}%</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${esc(pos.weight_pct)}%</td>
          </tr>`
        )
        .join('');
      const pnl = (p.total_pnl || 0) >= 0 ? '#047857' : '#b91c1c';
      return `<h2 style="font-size:16px;margin:28px 0 8px">${esc(p.name)} · ${esc(p.strategy_title || p.strategy)}</h2>
        <p style="color:#475569;font-size:13px">Valeur ${esc(p.total_value)} ${esc(p.currency)} · P&L <span style="color:${pnl};font-weight:700">${esc(p.total_pnl)} (${esc(p.total_pnl_pct)}%)</span> · Cash ${esc(p.cash_balance)}</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:#0f172a;color:#fff">
            <th style="text-align:left;padding:8px">Ligne</th><th style="text-align:right;padding:8px">Titres</th>
            <th style="text-align:right;padding:8px">Cours</th><th style="text-align:right;padding:8px">P&L</th>
            <th style="text-align:right;padding:8px">Poids</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="5" style="padding:12px;color:#64748b">Portefeuille vide</td></tr>'}</tbody>
        </table>`;
    })
    .join('');

  const orders = (playbook?.orders || [])
    .map(
      (o) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0"><strong>${esc(o.action)}</strong> ${esc(o.symbol)}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${esc(o.delta_shares)}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0">${esc(o.reason)}</td>
      </tr>`
    )
    .join('');

  const newsBlocks = Object.entries(newsBySymbol)
    .map(([sym, items]) => {
      const lis = (items || [])
        .slice(0, 3)
        .map(
          (n) => `<li style="margin:0 0 10px">
            <a href="${esc(n.link)}" style="color:#1d4ed8;font-weight:600;text-decoration:none">${esc(n.title)}</a>
            <div style="color:#64748b;font-size:12px">${esc(n.publisher)} · ${esc(n.published_at)} · ${esc(n.sentiment)}</div>
            <div style="font-size:13px;color:#334155">${esc(n.summary)}</div>
          </li>`
        )
        .join('');
      return `<h3 style="font-size:14px;margin:18px 0 6px">${esc(sym)}</h3><ul style="padding-left:16px;margin:0">${lis}</ul>`;
    })
    .join('');

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><title>Revue QualityScreener</title></head>
  <body style="margin:0;background:#f1f5f9;font-family:Georgia,serif;color:#0f172a">
    <div style="max-width:720px;margin:0 auto;background:#fff;padding:32px 28px">
      <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#6366f1;font-weight:700">QualityScreener PRO</div>
      <h1 style="font-size:26px;margin:8px 0 4px">Revue de portefeuille & ajustement 10 jours</h1>
      <p style="color:#64748b;margin:0 0 20px">${esc(when)} · Bonjour ${esc(name)}</p>
      <p style="font-size:15px;line-height:1.55">Voici la photographie de vos portefeuilles, les ordres d’ajustement 10 jours (renforcer / alléger autour de la valeur intrinsèque) et les actualités à surveiller sur vos lignes. Document éducatif, pas un conseil en investissement personnalisé.</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:13px">
        <tr>
          <td style="padding:12px;background:#eef2ff;border-radius:8px">
            <strong>${esc(portfolios.length)}</strong> portefeuille${portfolios.length > 1 ? 's' : ''} ·
            <strong>${esc(nPos)}</strong> lignes · valeur ~ <strong>${esc(Math.round(totalVal))}</strong> ·
            <strong>${esc(nOrders)}</strong> ordre${nOrders > 1 ? 's' : ''} 10j · prochaine revue ${esc(nextReview)}
          </td>
        </tr>
      </table>
      ${steps ? `<h2 style="font-size:16px;margin:8px 0">Protocole 10 jours</h2><ol style="padding-left:18px;color:#334155;font-size:13px">${steps}</ol>` : ''}
      ${portfolioBlocks}
      ${
        ideaRows
          ? `<h2 style="font-size:16px;margin:28px 0 8px">Radar 10 jours (MOS × repli / rallye)</h2>
            <table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#0f172a;color:#fff">
              <th style="text-align:left;padding:8px">Titre</th><th style="text-align:right;padding:8px">10j</th>
              <th style="text-align:right;padding:8px">MOS</th><th style="text-align:left;padding:8px">Signal</th>
              <th style="text-align:left;padding:8px">Lecture</th></tr></thead><tbody>${ideaRows}</tbody></table>`
          : ''
      }
      <h2 style="font-size:16px;margin:28px 0 8px">Ordres proposés — horizon 10 jours</h2>
      ${
        orders
          ? `<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#0e7490;color:#fff">
              <th style="text-align:left;padding:8px">Ordre</th><th style="text-align:right;padding:8px">Qté</th>
              <th style="text-align:left;padding:8px">Pourquoi</th></tr></thead><tbody>${orders}</tbody></table>`
          : '<p style="color:#64748b">Aucun ordre : le noyau est dans ses bandes. On ne touche à rien cette revue.</p>'
      }
      <h2 style="font-size:16px;margin:28px 0 8px">Actualités sur vos titres</h2>
      ${newsBlocks || '<p style="color:#64748b">Pas d’actualité chargée pour cette revue.</p>'}
      <p style="margin-top:32px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px">
        Envoyé depuis info@qualityscreenerpro.com · QualityScreener PRO<br/>
        Ceci n’est pas un conseil en investissement. Vérifiez toujours les cours live et votre situation fiscale avant d’exécuter un ordre.
      </p>
    </div>
  </body></html>`;
}

export function collectNewsletterData() {
  const user = LocalEngine.getCurrentUser();
  const list = LocalEngine.listPortfolios(user?.id || null) || [];
  const portfolios = list.map((p) => LocalEngine.getPortfolioPerformance(p.id)).filter(Boolean);
  const activeId = LocalEngine.getActivePortfolioId();
  const active = portfolios.find((p) => p.id === activeId) || portfolios[0];
  const watchlist = (LocalEngine.getWatchlist() || []).map((w) => w.symbol);
  const playbook = LocalEngine.getTenDayPlaybook({
    positions: (active?.positions || []).map((p) => ({
      symbol: p.symbol,
      name: p.name,
      shares: p.shares,
      current_price: p.current_price,
      buy_price: p.buy_price
    })),
    cash: active?.cash_balance || 0,
    total_value: active?.total_value || 0,
    watchlist
  });
  const newsBySymbol: Record<string, any[]> = {};
  const symbols = new Set<string>();
  for (const p of portfolios) {
    for (const pos of p.positions || []) symbols.add(pos.symbol);
  }
  for (const s of symbols) {
    const rec = LocalEngine.getCompanyDetail(s);
    newsBySymbol[s] = LocalEngine.getCompanyNews(s, rec?.name || s, 3);
  }
  return {
    userName: user?.name || user?.email?.split('@')[0],
    userEmail: user?.email || '',
    portfolios,
    playbook,
    newsBySymbol
  };
}

export function openNewsletterPdf(html: string) {
  const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200');
  if (!w) return;
  w.document.write(html.replace('</body>', '<script>window.onload=()=>window.print()</script></body>'));
  w.document.close();
}

export async function sendNewsletterEmail(to: string, html: string, subject: string) {
  const body = JSON.stringify({
    to,
    subject,
    html,
    from: 'info@qualityscreenerpro.com'
  });
  const res = await fetch('/newsletter.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `Envoi impossible (${res.status})`);
  }
  return data;
}
