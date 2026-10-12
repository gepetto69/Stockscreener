import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  portfolioName: string;
  positionsCount: number;
  totalValue: number;
  currency: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const PortfolioResetModal: React.FC<Props> = ({
  isOpen,
  portfolioName,
  positionsCount,
  totalValue,
  currency,
  onConfirm,
  onCancel,
  loading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600" />

        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Confirmer la réinitialisation</h3>
            <p className="text-xs text-rose-300">Action irréversible</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-slate-300 mb-6">
          <p>
            Vous êtes sur le point de supprimer l'intégralité du portefeuille :
          </p>
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Portefeuille :</span>
              <span className="font-bold text-white">{portfolioName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Positions ouvertes :</span>
              <span className="text-indigo-300">{positionsCount} titres</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Valeur totale :</span>
              <span className="text-emerald-400 font-bold">
                {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency === 'EUR' ? '€' : '$'}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Toutes les lignes d'actifs, historiques d'achat et réglages seront définitivement effacés. Vous pourrez ensuite en créer un nouveau avec la stratégie de votre choix.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition text-center"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:w-auto px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>Oui, réinitialiser</span>
          </button>
        </div>
      </div>
    </div>
  );
};
