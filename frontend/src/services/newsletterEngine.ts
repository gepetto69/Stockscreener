// @ts-nocheck
import { LocalEngine } from './localEngine';

function esc(s: any) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fmt(n: any, d = 1) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 'n.d.';
  return v.toFixed(d);
}

function isGenericNews(item: any) {
  const t = `${item?.title || ''} ${item?.summary || ''}`;
  return /Forte accélération des investissements d'infrastructures|Pourquoi le Moat de .+ renforce sa position dominante|Objectif de cours rehaussé pour/.test(t);
}

function stanceFromIdea(idea: any, mos: number | null, forensic: any, quality: number) {
  const action = idea?.action;
  const manipulator = forensic?.beneish_m_score?.isManipulator;
  const distress = forensic?.altman_z_score?.zone === 'distress';
  if (manipulator || distress || action === 'sortir') {
    return { key: 'vendre', label: 'Vendre / sortir', color: '#b91c1c', why: idea?.reason || 'Drapeau forensique : on ne conserve pas.' };
  }
  if (action === 'alléger' || (mos != null && mos < 0 && (idea?.ret_10d || 0) > 3)) {
    return { key: 'alleger', label: 'Alléger', color: '#b45309', why: idea?.reason || 'Le cours a déjà payé une large part de la croissance.' };
  }
  if (action === 'renforcer' || action === 'ouvrir' || (mos != null && mos >= 15 && quality >= 70)) {
    return { key: 'acheter', label: 'Acheter / renforcer', color: '#047857', why: idea?.reason || 'Marge de sécurité et qualité suffisantes pour ajouter.' };
  }
  return { key: 'conserver', label: 'Conserver', color: '#334155', why: idea?.reason || 'Noyau de qualité dans ses bandes : on ne touche à rien.' };
}

export function buildHoldingBrief(symbol: string, playbook?: any) {
  const rec = LocalEngine.getCompanyDetail(symbol);
  if (!rec) return null;
  const warren = LocalEngine.getWarrenAnalysis(rec as any);
  const abigail = LocalEngine.getAbigailAnalysis(rec as any);
  const forensic = LocalEngine.getForensicAnalysis(rec as any);
  const moat = LocalEngine.getMoatAnalysis(symbol);
  const dcf = LocalEngine.getReverseDCFAnalysis(symbol);
  const einstein = LocalEngine.getEinsteinRanking(rec as any);
  const stmts = [...(rec.financial_statements || [])].sort((a: any, b: any) => a.fiscal_year - b.fiscal_year);
  const latest = stmts.length ? stmts[stmts.length - 1] : null;
  const qs = rec.quality_score || {};
  const quality = Number(qs.total_score);
  const piotroski = qs.piotroski_score;
  const mos = dcf?.margin_of_safety_pct ?? dcf?.margin_of_safety ?? null;
  const idea = (playbook?.ideas || []).find((r: any) => String(r.symbol).toUpperCase() === symbol);
  const stance = stanceFromIdea(idea, mos, forensic, quality);
  const summary = String(rec.business_summary || rec.description || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280);

  const paragraphs: string[] = [];
  paragraphs.push(
    `${rec.name} (${symbol}) — ${rec.industry || rec.sector || 'secteur n.d.'}. ` +
      `Cours ${fmt(rec.current_price, 2)} ${rec.currency || ''} · P/E ${fmt(rec.pe_ratio, 1)}x` +
      (rec.pfcf_ratio ? ` · P/FCF ${fmt(rec.pfcf_ratio, 1)}x` : '') +
      `. Note qualité transmise à l’IA : ${Number.isFinite(quality) ? `${fmt(quality, 1)}/100` : 'n.d.'}` +
      (piotroski != null ? ` · Piotroski ${piotroski}/9 (${qs.piotroski_status || ''})` : '') +
      `. Warren cote le moat ${warren?.moat_score || '—'}/5 (${warren?.moat_label || 'n.d.'}), sentiment ${warren?.sentiment_label || 'n.d.'}.`
  );

  if (summary) paragraphs.push(summary);

  paragraphs.push(
    `Abigail (bilan) : verdict « ${abigail?.verdict || 'n.d.'} ». ${abigail?.summary_text || ''}`.trim()
  );

  const altman = forensic?.altman_z_score;
  const beneish = forensic?.beneish_m_score;
  paragraphs.push(
    `Forensique : Altman Z ${altman?.score != null ? fmt(altman.score, 2) : 'n.d.'} (${altman?.zone || 'n.d.'})` +
      (beneish ? ` · Beneish M ${fmt(beneish.score, 2)}${beneish.isManipulator ? ' — drapeau manipulateur' : ' — pas de drapeau'}` : '') +
      `. ROE ${fmt(latest?.roe, 1)}% · ROIC ${fmt(latest?.roic, 1)}% · marge op. ${fmt(latest?.operating_margin, 1)}%` +
      (latest?.free_cash_flow ? ` · FCF ${fmt(latest.free_cash_flow, 0)}` : '') +
      '.'
  );

  if (moat) {
    paragraphs.push(moat.justification || `${rec.name} : douve ${moat.stars}/5 (${moat.moat_label}).`);
  }

  if (dcf) {
    paragraphs.push(
      `Reverse DCF : valeur intrinsèque ${fmt(dcf.intrinsic_value ?? dcf.intrinsicValue, 2)} vs cours ${fmt(rec.current_price, 2)}` +
        (mos != null ? ` → MOS ${fmt(mos, 1)}% (${dcf.valuation_verdict || ''})` : '') +
        (dcf.implied_growth_rate != null ? ` · croissance implicite ${fmt(dcf.implied_growth_rate, 1)}%/an` : '') +
        '.'
    );
  }

  if (einstein?.target_rank) {
    paragraphs.push(
      `Einstein : ${rec.name} est #${einstein.target_rank}/${einstein.total_evaluated} dans ${einstein.sector || 'son secteur'}. ${einstein.verdict || ''}`
    );
  }

  const genericThesis = /Leader sectoriel incontournable/;
  if (warren?.thesis_one_liner && !genericThesis.test(warren.thesis_one_liner)) {
    paragraphs.push(`Thèse Warren : ${warren.thesis_one_liner}`);
  }
  if (warren?.strengths?.length && warren.strengths[0] !== 'Bilan robuste avec levier sous contrôle') {
    paragraphs.push(`Points forts : ${warren.strengths.slice(0, 3).join(' · ')}.`);
  }
  if (warren?.risks?.length) {
    const uniqueRisks = warren.risks.filter((r) => !/^Sensibilité aux cycles|^Pression concurrentielle/.test(r) || /P\/E|multiple|Multiple/i.test(r));
    if (uniqueRisks.length) paragraphs.push(`Risques : ${uniqueRisks.slice(0, 3).join(' · ')}.`);
  }

  paragraphs.push(
    `Décision de l’expert (horizon 10 jours + fondamental) : ${stance.label}. ${stance.why}` +
      (idea?.ret_10d != null ? ` Variation 10 séances : ${fmt(idea.ret_10d, 2)}%.` : '')
  );

  return {
    symbol,
    name: rec.name,
    quality: Number.isFinite(quality) ? Number(quality.toFixed(1)) : null,
    piotroski: piotroski ?? null,
    warren_moat: warren?.moat_score ?? null,
    warren_moat_label: warren?.moat_label ?? null,
    abigail_verdict: abigail?.verdict ?? null,
    mos: mos != null ? Number(Number(mos).toFixed(1)) : null,
    stance,
    paragraphs: paragraphs.filter(Boolean)
  };
}

export function buildNewsletterHtml(opts: {
  userName?: string;
  portfolios: any[];
  playbook?: any;
  newsBySymbol?: Record<string, any[]>;
  briefs?: any[];
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
  const briefs = opts.briefs || [];
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

  const briefBlocks = briefs
    .map((b) => {
      const paras = (b.paragraphs || []).map((p) => `<p style="font-size:14px;line-height:1.55;margin:0 0 10px;color:#1e293b">${esc(p)}</p>`).join('');
      return `<div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px 16px 8px;margin:16px 0">
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:baseline;justify-content:space-between">
          <h3 style="font-size:16px;margin:0">${esc(b.symbol)} · ${esc(b.name)}</h3>
          <span style="background:${b.stance?.color || '#334155'};color:#fff;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:4px 8px;border-radius:6px">${esc(b.stance?.label)}</span>
        </div>
        <p style="font-size:12px;color:#475569;margin:8px 0 12px">
          Cotation IA : qualité <strong>${b.quality != null ? esc(b.quality) + '/100' : 'n.d.'}</strong>
          ${b.piotroski != null ? ` · Piotroski <strong>${esc(b.piotroski)}/9</strong>` : ''}
          ${b.warren_moat != null ? ` · moat Warren <strong>${esc(b.warren_moat)}/5 ${esc(b.warren_moat_label || '')}</strong>` : ''}
          ${b.abigail_verdict ? ` · bilan Abigail <strong>${esc(b.abigail_verdict)}</strong>` : ''}
          ${b.mos != null ? ` · MOS DCF <strong>${esc(b.mos)}%</strong>` : ''}
        </p>
        ${paras}
      </div>`;
    })
    .join('');

  const newsBlocks = Object.entries(newsBySymbol)
    .map(([sym, items]) => {
      const real = (items || []).filter((n) => !isGenericNews(n)).slice(0, 3);
      if (!real.length) return '';
      const lis = real
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

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Revue QualityScreener</title>
  <style>
    @media print { body { background:#fff !important; } a { color:inherit !important; text-decoration:none; } .no-print { display:none !important; } }
  </style>
  </head>
  <body style="margin:0;background:#f1f5f9;font-family:Georgia,serif;color:#0f172a">
    <div style="max-width:720px;margin:0 auto;background:#fff;padding:32px 28px">
      <p class="no-print" style="margin:0 0 16px">
        <button type="button" onclick="window.print()" style="background:#0f172a;color:#fff;border:0;border-radius:8px;padding:10px 14px;font-size:13px">Enregistrer en PDF / Imprimer</button>
      </p>
      <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#6366f1;font-weight:700">QualityScreener PRO</div>
      <h1 style="font-size:26px;margin:8px 0 4px">Revue de portefeuille & expert IA</h1>
      <p style="color:#64748b;margin:0 0 20px">${esc(when)} · Bonjour ${esc(name)}</p>
      <p style="font-size:15px;line-height:1.55">Pour chaque ligne : la note transmise aux copilotes (qualité, Piotroski, moat Warren, bilan Abigail, MOS Reverse DCF) et la décision d’expert — acheter, alléger/vendre ou conserver. Document éducatif, pas un conseil en investissement personnalisé.</p>
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
      <h2 style="font-size:16px;margin:28px 0 8px">Analyse poussée par l’expert IA</h2>
      ${briefBlocks || '<p style="color:#64748b">Aucune ligne à analyser.</p>'}
      ${
        newsBlocks
          ? `<h2 style="font-size:16px;margin:28px 0 8px">Fil d’actualités (sources live)</h2>${newsBlocks}`
          : ''
      }
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
  const symbols = new Set<string>();
  for (const p of portfolios) {
    for (const pos of p.positions || []) symbols.add(pos.symbol);
  }
  const briefs = [...symbols].map((s) => buildHoldingBrief(s, playbook)).filter(Boolean);
  const newsBySymbol: Record<string, any[]> = {};
  return {
    userName: user?.name || user?.email?.split('@')[0],
    userEmail: user?.email || '',
    portfolios,
    playbook,
    briefs,
    newsBySymbol
  };
}

function printViaIframe(html: string) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Revue QualityScreener');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const run = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // ignore
    }
    setTimeout(() => iframe.remove(), 1500);
  };
  iframe.onload = run;
  setTimeout(run, 400);
}

export function openNewsletterPdf(html: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (!w) {
    URL.revokeObjectURL(url);
    printViaIframe(html);
    return;
  }
  setTimeout(() => URL.revokeObjectURL(url), 180000);
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

export { isGenericNews };
