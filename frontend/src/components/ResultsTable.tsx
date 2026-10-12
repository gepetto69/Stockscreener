import React from 'react';
import type { Company } from '../types/stock';
import { ArrowUpDown, ChevronRight, Award, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  companies: Company[];
  total: number;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort: (column: string) => void;
  onSelectCompany: (symbol: string) => void;
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
  onPageChange
}) => {
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl flex flex-col overflow-hidden">
      {/* Table container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-xs text-slate-400 font-medium">
              <th className="py-3.5 px-4 cursor-pointer group" onClick={() => onSort('symbol')}>
                <div className="flex items-center">
                  <span>Entreprise</span>
                  {renderSortIndicator('symbol')}
                </div>
              </th>
              <th className="py-3.5 px-4 cursor-pointer group" onClick={() => onSort('quality_score')}>
                <div className="flex items-center">
                  <Award className="w-3.5 h-3.5 mr-1 text-amber-400" />
                  <span>Score Qualité</span>
                  {renderSortIndicator('quality_score')}
                </div>
              </th>
              <th className="py-3.5 px-4 cursor-pointer group" onClick={() => onSort('piotroski_score')}>
                <div className="flex items-center">
                  <span>Piotroski</span>
                  {renderSortIndicator('piotroski_score')}
                </div>
              </th>
              <th className="py-3.5 px-4 cursor-pointer group" onClick={() => onSort('current_price')}>
                <div className="flex items-center">
                  <span>Cours</span>
                  {renderSortIndicator('current_price')}
                </div>
              </th>
              <th className="py-3.5 px-4 cursor-pointer group" onClick={() => onSort('latest_roe')}>
                <div className="flex items-center">
                  <span>ROE (%)</span>
                  {renderSortIndicator('latest_roe')}
                </div>
              </th>
              <th className="py-3.5 px-4 cursor-pointer group" onClick={() => onSort('latest_roic')}>
                <div className="flex items-center">
                  <span>ROIC (%)</span>
                  {renderSortIndicator('latest_roic')}
                </div>
              </th>
              <th className="py-3.5 px-4 cursor-pointer group" onClick={() => onSort('latest_operating_margin')}>
                <div className="flex items-center">
                  <span>Marge Op.</span>
                  {renderSortIndicator('latest_operating_margin')}
                </div>
              </th>
              <th className="py-3.5 px-4 cursor-pointer group" onClick={() => onSort('latest_debt_to_ebitda')}>
                <div className="flex items-center">
                  <span>Dette/EBITDA</span>
                  {renderSortIndicator('latest_debt_to_ebitda')}
                </div>
              </th>
              <th className="py-3.5 px-4 cursor-pointer group" onClick={() => onSort('revenue_growth_5y')}>
                <div className="flex items-center">
                  <span>CAGR CA 5A</span>
                  {renderSortIndicator('revenue_growth_5y')}
                </div>
              </th>
              <th className="py-3.5 px-4 cursor-pointer group" onClick={() => onSort('pe_ratio')}>
                <div className="flex items-center">
                  <span>P/E</span>
                  {renderSortIndicator('pe_ratio')}
                </div>
              </th>
              <th className="py-3.5 px-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {companies.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-400">
                  Aucune entreprise ne correspond aux critères de qualité sélectionnés.
                </td>
              </tr>
            ) : (
              companies.map((c) => {
                const qScore = c.quality_score?.total_score ?? 0;
                const pScore = c.quality_score?.piotroski_score ?? c.piotroski_score ?? 6;
                const pStatus = c.quality_score?.piotroski_status ?? c.piotroski_status ?? 'Solide';
                return (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCompany(c.symbol)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    {/* Symbol & Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-800/50 flex items-center justify-center font-bold text-xs text-indigo-300">
                          {c.symbol.slice(0, 3)}
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            {c.symbol}
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                              {c.currency}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 truncate max-w-[170px]">{c.name}</div>
                        </div>
                      </div>
                    </td>

                    {/* Quality Score */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getScoreBadgeColor(qScore)}`}>
                          {qScore.toFixed(0)}/100
                        </span>
                        <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden hidden sm:block">
                          <div
                            className={`h-full ${qScore >= 75 ? 'bg-emerald-400' : qScore >= 50 ? 'bg-indigo-400' : 'bg-amber-400'}`}
                            style={{ width: `${Math.min(100, qScore)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Piotroski F-Score */}
                    <td className="py-3.5 px-4">
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

                    {/* Price & Cap */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200">
                        {c.current_price ? `${c.current_price.toFixed(2)} ${c.currency}` : '—'}
                      </div>
                      <div className="text-xs text-slate-500">{formatMarketCap(c.market_cap)}</div>
                    </td>

                    {/* ROE */}
                    <td className="py-3.5 px-4">
                      <span className={`font-semibold ${c.latest_roe && c.latest_roe >= 15 ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {c.latest_roe ? `${c.latest_roe.toFixed(1)}%` : '—'}
                      </span>
                    </td>

                    {/* ROIC */}
                    <td className="py-3.5 px-4">
                      <span className={`font-semibold ${c.latest_roic && c.latest_roic >= 12 ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {c.latest_roic ? `${c.latest_roic.toFixed(1)}%` : '—'}
                      </span>
                    </td>

                    {/* Operating Margin */}
                    <td className="py-3.5 px-4 text-slate-300">
                      {c.latest_operating_margin ? `${c.latest_operating_margin.toFixed(1)}%` : '—'}
                    </td>

                    {/* Net Debt / EBITDA */}
                    <td className="py-3.5 px-4">
                      {c.latest_debt_to_ebitda !== undefined && c.latest_debt_to_ebitda !== null ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
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
                    <td className="py-3.5 px-4">
                      {c.revenue_growth_5y !== undefined && c.revenue_growth_5y !== null ? (
                        <div className="flex items-center gap-1 text-slate-300 font-medium text-xs">
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
                    <td className="py-3.5 px-4">
                      <span className="text-slate-300 font-medium">
                        {c.pe_ratio ? `${c.pe_ratio.toFixed(1)}x` : '—'}
                      </span>
                    </td>

                    {/* Action Arrow */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition"
                        title="Voir la fiche détaillée"
                      >
                        <ChevronRight className="w-4 h-4" />
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
