import React, { useState } from 'react';
import type { Company } from '../types/stock';
import { ArrowUpDown, ChevronRight, Award, TrendingUp, TrendingDown, Loader2, LayoutGrid, List } from 'lucide-react';

interface Props {
  companies: Company[];
  total: number;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort: (column: string) => void;
  onSelectCompany: (company: Company) => void;
  loadingSymbol?: string | null;
  onPageChange: (newPage: number) => void;
}

export const ResultsTable: React.FC<Props> = ({
  companies,
  total,
  page,
  pageSize,
  sortBy,
  sortOrder,
  onSort,
  onSelectCompany,
  loadingSymbol,
  onPageChange
}) => {
  const [mobileCardView, setMobileCardView] = useState<boolean>(true);
  const totalPages = Math.ceil(total / pageSize) || 1;

  const renderSortIndicator = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />;
    }
    return (
      <span className="text-indigo-400 font-bold ml-1 text-xs">
        {sortOrder === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    if (score >= 65) return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
    if (score >= 50) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  };

  const formatMarketCap = (val?: number) => {
    if (!val) return '—';
    if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    return `$${(val / 1e6).toFixed(0)}M`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl flex flex-col overflow-hidden w-full max-w-full">
      {/* Compact cartes/tableau toggle — no extra "Affichage mobile" chrome */}
      <div className="sm:hidden flex items-center justify-end px-2.5 py-1.5 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setMobileCardView(true)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition ${
              mobileCardView ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            aria-label="Affichage cartes"
          >
            <LayoutGrid className="w-3 h-3" />
            <span>Cartes</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileCardView(false)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition ${
              !mobileCardView ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            aria-label="Affichage tableau"
          >
            <List className="w-3 h-3" />
            <span>Tableau</span>
          </button>
        </div>
      </div>

      {/* MOBILE CARD VIEW: Clean, ultra-readable cards on smartphone screens */}
      {mobileCardView && (
        <div className="sm:hidden divide-y divide-slate-800/80">
          {companies.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs px-4">
              Aucune entreprise ne correspond aux critères de qualité sélectionnés.
            </div>
          ) : (
            companies.map((c) => {
              const qScore = c.quality_score?.total_score ?? 0;
              const pScore = c.quality_score?.piotroski_score ?? c.piotroski_score ?? 6;
              const isItemLoading = loadingSymbol === c.symbol;

              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCompany(c)}
                  className="p-3.5 hover:bg-slate-850/60 active:bg-slate-850 transition cursor-pointer"
                >
                  {/* Top line: Symbol, Name, Quality Badge, Arrow */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-800/50 flex items-center justify-center font-bold text-xs text-indigo-300 shrink-0">
                        {c.symbol.slice(0, 3)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-white text-sm flex items-center gap-1.5">
                          <span className="truncate">{c.symbol}</span>
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded shrink-0">
                            {c.currency}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 truncate max-w-[170px]">{c.name}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-black border ${getScoreBadgeColor(qScore)}`}>
                        {qScore.toFixed(0)}/100
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCompany(c);
                        }}
                        className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
                        aria-label={`Détails ${c.symbol}`}
                      >
                        {isItemLoading ? (
                          <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 3x2 ratios — readable on 390px phones */}
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-950/60 p-2 rounded-xl border border-slate-800/60 text-center">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-medium">Cours</div>
                      <div className="text-xs font-bold text-white mt-0.5 font-mono truncate">
                        {c.current_price ? `${c.current_price.toFixed(1)} ${c.currency === 'EUR' ? '€' : '$'}` : '—'}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-medium">Piotroski</div>
                      <div className="text-xs font-bold text-emerald-400 mt-0.5 font-mono">
                        {pScore}/9
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-medium">Moat</div>
                      <div className="text-xs font-bold text-amber-300 mt-0.5 font-mono">
                        {c.moat_stars != null ? `${c.moat_stars.toFixed(1)}★` : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-medium">Qualité</div>
                      <div className="text-xs font-bold text-indigo-300 mt-0.5 font-mono">
                        {qScore.toFixed(0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-medium">Altman Z</div>
                      <div className={`text-xs font-bold mt-0.5 font-mono ${
                        c.altman_z_score?.zone === 'safe'
                          ? 'text-emerald-400'
                          : c.altman_z_score?.zone === 'distress'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}>
                        {c.altman_z_score?.score != null ? c.altman_z_score.score.toFixed(1) : '3.8'}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-medium">Dette/Eb.</div>
                      <div className="text-xs font-bold text-cyan-400 mt-0.5 font-mono">
                        {c.latest_debt_to_ebitda !== undefined && c.latest_debt_to_ebitda !== null
                          ? c.latest_debt_to_ebitda <= 0 ? 'Cash' : `${c.latest_debt_to_ebitda.toFixed(1)}x`
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Table container (Always on tablet/desktop, optional on mobile via toggle) */}
      <div className={`${mobileCardView ? 'hidden sm:block' : 'block'} overflow-x-auto custom-scrollbar w-full`}>
        <table className="w-full text-left border-collapse min-w-[980px] lg:min-w-full">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/80 text-xs text-slate-400 font-medium">
              <th className="py-3.5 px-3 sm:px-4 cursor-pointer group sticky left-0 z-20 bg-slate-950 shadow-[1px_0_0_0_rgba(51,65,85,0.5)]" onClick={() => onSort('symbol')}>
                <div className="flex items-center">
                  <span>Entreprise</span>
                  {renderSortIndicator('symbol')}
                </div>
              </th>
              <th className="py-3.5 px-3 sm:px-4 cursor-pointer group" onClick={() => onSort('quality_score')}>
                <div className="flex items-center">
                  <Award className="w-3.5 h-3.5 mr-1 text-amber-400" />
                  <span>Score Qualité</span>
                  {renderSortIndicator('quality_score')}
                </div>
              </th>
              <th className="py-3.5 px-3 sm:px-4 cursor-pointer group" onClick={() => onSort('piotroski_score')}>
                <div className="flex items-center">
                  <span>Piotroski</span>
                  {renderSortIndicator('piotroski_score')}
                </div>
              </th>
              <th className="py-3.5 px-3 sm:px-4 text-center">
                <span>Sécurité (Altman/Beneish)</span>
              </th>
              <th className="py-3.5 px-3 sm:px-4 cursor-pointer group" onClick={() => onSort('moat_stars')}>
                <div className="flex items-center">
                  <span>Moat</span>
                  {renderSortIndicator('moat_stars')}
                </div>
              </th>
              <th className="py-3.5 px-3 sm:px-4 cursor-pointer group" onClick={() => onSort('current_price')}>
                <div className="flex items-center">
                  <span>Cours</span>
                  {renderSortIndicator('current_price')}
                </div>
              </th>
              <th className="py-3.5 px-3 sm:px-4 cursor-pointer group" onClick={() => onSort('latest_roe')}>
                <div className="flex items-center">
                  <span>ROE (%)</span>
                  {renderSortIndicator('latest_roe')}
                </div>
              </th>
              <th className="py-3.5 px-3 sm:px-4 cursor-pointer group" onClick={() => onSort('latest_roic')}>
                <div className="flex items-center">
                  <span>ROIC (%)</span>
                  {renderSortIndicator('latest_roic')}
                </div>
              </th>
              <th className="py-3.5 px-3 sm:px-4 cursor-pointer group" onClick={() => onSort('latest_operating_margin')}>
                <div className="flex items-center">
                  <span>Marge Op.</span>
                  {renderSortIndicator('latest_operating_margin')}
                </div>
              </th>
              <th className="py-3.5 px-3 sm:px-4 cursor-pointer group" onClick={() => onSort('latest_debt_to_ebitda')}>
                <div className="flex items-center">
                  <span>Dette/EBITDA</span>
                  {renderSortIndicator('latest_debt_to_ebitda')}
                </div>
              </th>
              <th className="py-3.5 px-3 sm:px-4 cursor-pointer group" onClick={() => onSort('revenue_growth_5y')}>
                <div className="flex items-center">
                  <span>CAGR CA 5A</span>
                  {renderSortIndicator('revenue_growth_5y')}
                </div>
              </th>
              <th className="py-3.5 px-3 sm:px-4 cursor-pointer group" onClick={() => onSort('pe_ratio')}>
                <div className="flex items-center">
                  <span>P/E</span>
                  {renderSortIndicator('pe_ratio')}
                </div>
              </th>
              <th className="py-3.5 px-3 sm:px-4 text-center sticky right-0 z-20 bg-slate-950 shadow-[-1px_0_0_0_rgba(51,65,85,0.5)]">
                Détail
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {companies.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-12 text-center text-slate-400">
                  Aucune entreprise ne correspond aux critères de qualité sélectionnés.
                </td>
              </tr>
            ) : (
              companies.map((c) => {
                const qScore = c.quality_score?.total_score ?? 0;
                const pScore = c.quality_score?.piotroski_score ?? c.piotroski_score ?? 6;
                const pStatus = c.quality_score?.piotroski_status ?? c.piotroski_status ?? 'Solide';
                const isItemLoading = loadingSymbol === c.symbol;
                return (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCompany(c)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors active:bg-slate-800/80 group/row"
                  >
                    {/* Symbol & Name - Sticky on horizontal scroll */}
                    <td className="py-3.5 px-3 sm:px-4 sticky left-0 z-10 bg-slate-900 group-hover/row:bg-slate-850 transition-colors shadow-[1px_0_0_0_rgba(51,65,85,0.5)]">
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-800/50 flex items-center justify-center font-bold text-xs text-indigo-300 shrink-0">
                          {c.symbol.slice(0, 3)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white flex items-center gap-1.5 text-xs sm:text-sm">
                            <span className="truncate">{c.symbol}</span>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded shrink-0">
                              {c.currency}
                            </span>
                          </div>
                          <div className="text-[11px] sm:text-xs text-slate-400 truncate max-w-[130px] sm:max-w-[170px]">{c.name}</div>
                        </div>
                      </div>
                    </td>

                    {/* Quality Score */}
                    <td className="py-3.5 px-3 sm:px-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-bold border ${getScoreBadgeColor(qScore)}`}>
                          {qScore.toFixed(0)}/100
                        </span>
                        <div className="w-12 sm:w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden hidden sm:block">
                          <div
                            className={`h-full ${qScore >= 75 ? 'bg-emerald-400' : qScore >= 50 ? 'bg-indigo-400' : 'bg-amber-400'}`}
                            style={{ width: `${Math.min(100, qScore)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Piotroski F-Score */}
                    <td className="py-3.5 px-3 sm:px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-white text-xs">{pScore}/9</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                          pScore >= 6
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                            : pScore >= 4
                            ? 'bg-amber-950/60 text-amber-400 border-amber-800/80'
                            : 'bg-rose-950/60 text-rose-400 border-rose-800/80'
                        }`}>
                          {pStatus}
                        </span>
                      </div>
                    </td>

                    {/* Forensic Security Badge (Altman Z & Beneish M) */}
                    <td className="py-3.5 px-3 sm:px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        {c.beneish_m_score?.isManipulator ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-950 text-rose-300 border border-rose-700 animate-pulse" title="Beneish M-Score > -1.78 : Alerte Manipulation">
                            Drapeau Rouge 🚩
                          </span>
                        ) : c.altman_z_score?.zone === 'distress' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800" title="Altman Z-Score < 1.81 : Risque faillite">
                            Z: {c.altman_z_score.score != null ? c.altman_z_score.score.toFixed(1) : '—'} (Détresse)
                          </span>
                        ) : c.altman_z_score?.zone === 'safe' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800" title={`Altman Z: ${c.altman_z_score.score} | Beneish: ${c.beneish_m_score?.score || -2.4}`}>
                            Z: {c.altman_z_score.score != null ? c.altman_z_score.score.toFixed(1) : '—'} ✓ Sain
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-950 text-amber-300 border border-amber-800" title="Zone grise Altman">
                            Z: {c.altman_z_score?.score != null ? c.altman_z_score.score.toFixed(1) : '—'} Gris
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 sm:px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-black text-amber-300 font-mono">
                          {c.moat_stars != null ? `${c.moat_stars.toFixed(1)}★` : '—'}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate max-w-[90px]">
                          {c.moat_label || c.primary_moat_type || ''}
                        </span>
                      </div>
                    </td>

                    {/* Price & Cap */}
                    <td className="py-3.5 px-3 sm:px-4">
                      <div className="font-medium text-slate-200 text-xs sm:text-sm whitespace-nowrap">
                        {c.current_price ? `${c.current_price.toFixed(2)} ${c.currency}` : '—'}
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-500 whitespace-nowrap">{formatMarketCap(c.market_cap)}</div>
                    </td>

                    {/* ROE */}
                    <td className="py-3.5 px-3 sm:px-4">
                      <span className={`font-semibold ${c.latest_roe && c.latest_roe >= 15 ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {c.latest_roe ? `${c.latest_roe.toFixed(1)}%` : '—'}
                      </span>
                    </td>

                    {/* ROIC */}
                    <td className="py-3.5 px-3 sm:px-4">
                      <span className={`font-semibold ${c.latest_roic && c.latest_roic >= 12 ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {c.latest_roic ? `${c.latest_roic.toFixed(1)}%` : '—'}
                      </span>
                    </td>

                    {/* Operating Margin */}
                    <td className="py-3.5 px-3 sm:px-4 text-slate-300">
                      {c.latest_operating_margin ? `${c.latest_operating_margin.toFixed(1)}%` : '—'}
                    </td>

                    {/* Net Debt / EBITDA */}
                    <td className="py-3.5 px-3 sm:px-4">
                      {c.latest_debt_to_ebitda !== undefined && c.latest_debt_to_ebitda !== null ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                          c.latest_debt_to_ebitda <= 0
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : c.latest_debt_to_ebitda <= 2.5
                            ? 'text-slate-300'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}>
                          {c.latest_debt_to_ebitda <= 0 ? 'Cash Net' : `${c.latest_debt_to_ebitda.toFixed(2)}x`}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* Revenue Growth 5Y */}
                    <td className="py-3.5 px-3 sm:px-4">
                      {c.revenue_growth_5y !== undefined && c.revenue_growth_5y !== null ? (
                        <div className="flex items-center gap-1 text-slate-300 font-medium text-xs whitespace-nowrap">
                          {c.revenue_growth_5y >= 0 ? (
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                          )}
                          <span>{c.revenue_growth_5y.toFixed(1)}%</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* P/E */}
                    <td className="py-3.5 px-3 sm:px-4">
                      <span className="text-slate-300 font-medium whitespace-nowrap">
                        {c.pe_ratio ? `${c.pe_ratio.toFixed(1)}x` : '—'}
                      </span>
                    </td>

                    {/* Action Button - Sticky right on horizontal scroll */}
                    <td className="py-3.5 px-3 sm:px-4 text-center sticky right-0 z-10 bg-slate-900 group-hover/row:bg-slate-850 transition-colors shadow-[-1px_0_0_0_rgba(51,65,85,0.5)]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCompany(c);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 hover:border-indigo-500 transition active:scale-95 flex items-center justify-center gap-1 mx-auto text-xs font-semibold shadow-sm"
                        title={`Ouvrir le dossier d'analyse de ${c.symbol}`}
                        aria-label={`Ouvrir le dossier d'analyse de ${c.symbol}`}
                      >
                        {isItemLoading ? (
                          <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                        ) : (
                          <>
                            <span className="hidden sm:inline">Dossier</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-400">
        <div>
          Affichage de <span className="text-slate-200 font-semibold">{companies.length}</span> sur{' '}
          <span className="text-slate-200 font-semibold">{total}</span> entreprises
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-300 transition"
          >
            Précédent
          </button>
          <span className="px-2 font-medium text-slate-300">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-300 transition"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
};
