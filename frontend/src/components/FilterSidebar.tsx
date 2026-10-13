import React from 'react';
import type { FilterParams } from '../types/stock';
import { Filter, RotateCcw, TrendingUp, ShieldCheck, DollarSign, PieChart, Sparkles, X } from 'lucide-react';

interface Props {
  filters: FilterParams;
  onChange: (filters: FilterParams) => void;
  onReset: () => void;
  sectorsList: string[];
  onCloseMobile?: () => void;
}

export const FilterSidebar: React.FC<Props> = ({ filters, onChange, onReset, sectorsList, onCloseMobile }) => {
  const [collapsed, setCollapsed] = React.useState<boolean>(false);

  const handleInputChange = (field: keyof FilterParams, value: any) => {
    onChange({
      ...filters,
      page: 1,
      [field]: value === '' ? undefined : value
    });
  };

  const applyPresetQuality = () => {
    onChange({
      ...filters,
      page: 1,
      min_quality_score: 75,
      min_piotroski_score: 6,
      min_roe: 15,
      min_roic: 12,
      max_net_debt_to_ebitda: 2.5,
      min_current_ratio: 1.5,
      min_operating_margin: 15,
      min_fcf_conversion: 80,
      max_pe: 35,
    });
  };

  const applyPresetDeepValue = () => {
    onChange({
      ...filters,
      page: 1,
      min_quality_score: 60,
      max_pe: 20,
      max_pfcf: 18,
      max_net_debt_to_ebitda: 2.0,
      min_roe: 12,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-2 text-indigo-400 font-semibold text-sm sm:text-base hover:text-indigo-300 transition"
          >
            <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Filtres de Qualité</span>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 lg:hidden">
              {collapsed ? 'Afficher' : 'Réduire'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser</span>
          </button>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Fermer les filtres"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className={`${collapsed ? 'hidden lg:block' : 'block'} space-y-5`}>
      {/* Preset Strategy Buttons */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Presets Stratégiques
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={applyPresetQuality}
            className="text-xs bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 px-3 py-2 rounded-lg font-medium transition text-left"
          >
            ⭐ Compounders Qualité (Buffett / Terry Smith)
          </button>
          <button
            onClick={applyPresetDeepValue}
            className="text-xs bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 px-3 py-2 rounded-lg font-medium transition text-left"
          >
            💎 Qualité & Prix Raisonnable (GARP)
          </button>
        </div>
      </div>

      {/* 1. Global Quality Score Slider */}
      <div className="bg-slate-800/40 p-3.5 rounded-lg border border-slate-700/50 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-slate-200">Score de Qualité Global</span>
          <span className="text-indigo-400 font-bold">
            {filters.min_quality_score ? `≥ ${filters.min_quality_score}/100` : 'Tous (0-100)'}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="95"
          step="5"
          value={filters.min_quality_score || 0}
          onChange={(e) => handleInputChange('min_quality_score', Number(e.target.value) || undefined)}
          className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-700 rounded-lg appearance-none"
        />
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>0 (Tous)</span>
          <span>50 (Moyen)</span>
          <span>75+ (Haute Qualité)</span>
        </div>
      </div>

      {/* Piotroski F-Score Filter */}
      <div className="bg-slate-800/40 p-3.5 rounded-lg border border-slate-700/50 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-slate-200">Score de Piotroski (F-Score)</span>
          <span className="text-emerald-400 font-bold">
            {filters.min_piotroski_score ? `≥ ${filters.min_piotroski_score}/9` : 'Tous (0-9)'}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="9"
          step="1"
          value={filters.min_piotroski_score || 0}
          onChange={(e) => handleInputChange('min_piotroski_score', Number(e.target.value) || undefined)}
          className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-700 rounded-lg appearance-none"
        />
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>0 (Tous)</span>
          <span>4+ (Modéré)</span>
          <span>6+ (Solide)</span>
        </div>
      </div>

      {/* 2. Solvabilité & Santé Financière */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Santé & Solvabilité
        </h3>
        
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-300">
            <span>Dette Nette / EBITDA Max</span>
            <span className="font-semibold text-slate-200">
              {filters.max_net_debt_to_ebitda !== undefined ? `≤ ${filters.max_net_debt_to_ebitda}x` : 'Non filtré'}
            </span>
          </div>
          <input
            type="number"
            step="0.5"
            placeholder="Ex: 2.5"
            value={filters.max_net_debt_to_ebitda ?? ''}
            onChange={(e) => handleInputChange('max_net_debt_to_ebitda', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-300">
            <span>Ratio Liquidité Générale Min</span>
            <span className="font-semibold text-slate-200">
              {filters.min_current_ratio !== undefined ? `≥ ${filters.min_current_ratio}` : 'Non filtré'}
            </span>
          </div>
          <input
            type="number"
            step="0.1"
            placeholder="Ex: 1.5"
            value={filters.min_current_ratio ?? ''}
            onChange={(e) => handleInputChange('min_current_ratio', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-300">
            <span>Couverture des Intérêts Min</span>
            <span className="font-semibold text-slate-200">
              {filters.min_interest_coverage !== undefined ? `≥ ${filters.min_interest_coverage}x` : 'Non filtré'}
            </span>
          </div>
          <input
            type="number"
            step="1.0"
            placeholder="Ex: 5.0"
            value={filters.min_interest_coverage ?? ''}
            onChange={(e) => handleInputChange('min_interest_coverage', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* 3. Rentabilité & Profitabilité */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          Rentabilité & Profitabilité
        </h3>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-xs text-slate-300">ROE Min (%)</span>
            <input
              type="number"
              placeholder="Ex: 15"
              value={filters.min_roe ?? ''}
              onChange={(e) => handleInputChange('min_roe', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-slate-300">ROIC Min (%)</span>
            <input
              type="number"
              placeholder="Ex: 12"
              value={filters.min_roic ?? ''}
              onChange={(e) => handleInputChange('min_roic', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-300">
            <span>Marge Opérationnelle Min (%)</span>
            <span className="font-semibold text-slate-200">
              {filters.min_operating_margin !== undefined ? `≥ ${filters.min_operating_margin}%` : 'Non filtré'}
            </span>
          </div>
          <input
            type="number"
            placeholder="Ex: 15"
            value={filters.min_operating_margin ?? ''}
            onChange={(e) => handleInputChange('min_operating_margin', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={!!filters.margin_expansion_required}
            onChange={(e) => handleInputChange('margin_expansion_required', e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-0"
          />
          <span>Exiger marge stable ou croissante (5 ans)</span>
        </label>
      </div>

      {/* 4. Croissance & Génération de Cash */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          Croissance & Cash Flow
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-xs text-slate-300">CA CAGR 5 ans (%)</span>
            <input
              type="number"
              placeholder="Ex: 5"
              value={filters.min_revenue_growth_5y ?? ''}
              onChange={(e) => handleInputChange('min_revenue_growth_5y', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-slate-300">BPA CAGR 5 ans (%)</span>
            <input
              type="number"
              placeholder="Ex: 7"
              value={filters.min_eps_growth_5y ?? ''}
              onChange={(e) => handleInputChange('min_eps_growth_5y', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-300">
            <span>Taux Conversion FCF (%)</span>
            <span className="font-semibold text-slate-200">
              {filters.min_fcf_conversion !== undefined ? `≥ ${filters.min_fcf_conversion}%` : 'Non filtré'}
            </span>
          </div>
          <input
            type="number"
            placeholder="Ex: 80"
            value={filters.min_fcf_conversion ?? ''}
            onChange={(e) => handleInputChange('min_fcf_conversion', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* 5. Valorisation */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <PieChart className="w-4 h-4 text-purple-400" />
          Valorisation (P/E & P/FCF)
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-xs text-slate-300">P/E Max</span>
            <input
              type="number"
              placeholder="Ex: 25"
              value={filters.max_pe ?? ''}
              onChange={(e) => handleInputChange('max_pe', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-slate-300">P/FCF Max</span>
            <input
              type="number"
              placeholder="Ex: 30"
              value={filters.max_pfcf ?? ''}
              onChange={(e) => handleInputChange('max_pfcf', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 6. Sécurité & Risque Forensic (Altman & Beneish) */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Sécurité & Forensic (Altman/Beneish)
        </h3>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-300">
            <span>Altman Z-Score Min</span>
            <span className="font-semibold text-slate-200">
              {filters.min_altman_z !== undefined ? `≥ ${filters.min_altman_z}` : 'Non filtré'}
            </span>
          </div>
          <input
            type="number"
            step="0.1"
            placeholder="Ex: 2.99 (Zone Verte)"
            value={filters.min_altman_z ?? ''}
            onChange={(e) => handleInputChange('min_altman_z', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={!!filters.exclude_beneish_manipulators}
            onChange={(e) => handleInputChange('exclude_beneish_manipulators', e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-0"
          />
          <span>Exclure drapeaux rouges Beneish (M-Score &gt; -1.78)</span>
        </label>
      </div>

      {/* 6b. Douve économique */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          Douve économique (Moat)
        </h3>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-300">
            <span>Étoiles min.</span>
            <span className="font-semibold text-amber-300">
              {filters.min_moat_stars !== undefined ? `≥ ${filters.min_moat_stars}★` : 'Non filtré'}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            step="0.5"
            value={filters.min_moat_stars ?? 1}
            onChange={(e) => handleInputChange('min_moat_stars', Number(e.target.value) > 1 ? Number(e.target.value) : undefined)}
            className="w-full accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>1★ toutes</span>
            <span>5★ infranchissable</span>
          </div>
        </div>
      </div>

      {/* 7. Secteurs */}
      {sectorsList.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Secteurs</span>
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {sectorsList.map((sec) => {
              const isChecked = filters.sectors?.includes(sec) ?? false;
              return (
                <label key={sec} className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer py-0.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const cur = filters.sectors || [];
                      const updated = e.target.checked ? [...cur, sec] : cur.filter(s => s !== sec);
                      handleInputChange('sectors', updated.length > 0 ? updated : undefined);
                    }}
                    className="w-3.5 h-3.5 rounded text-indigo-600 bg-slate-800 border-slate-700"
                  />
                  <span>{sec}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
