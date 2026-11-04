import React, { useState, useEffect } from 'react';
import { RegulatoryThreshold } from '../types';
import { X, Save, Scale, DollarSign, Info } from 'lucide-react';

interface EditThresholdModalProps {
  isOpen: boolean;
  threshold: RegulatoryThreshold | null;
  onClose: () => void;
  onSave: (updatedThreshold: RegulatoryThreshold) => Promise<void> | void;
}

export const EditThresholdModal: React.FC<EditThresholdModalProps> = ({
  isOpen,
  threshold,
  onClose,
  onSave,
}) => {
  const [amountARS, setAmountARS] = useState<number>(0);
  const [actionRequired, setActionRequired] = useState('');
  const [description, setDescription] = useState('');
  const [regulationSource, setRegulatorySource] = useState('');

  const [saveError,setSaveError]=useState('');
  const [saveBusy,setSaveBusy]=useState(false);
  useEffect(() => {
    setSaveError('');
    if (threshold) {
      setAmountARS(threshold.amountARS);
      setActionRequired(threshold.actionRequired);
      setDescription(threshold.description);
      setRegulatorySource(threshold.regulationSource);
    }
  }, [threshold, isOpen]);

  if (!isOpen || !threshold) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountARS || amountARS <= 0) {
      alert('Por favor ingrese un monto válido en pesos argentinos.');
      return;
    }

    const updated: RegulatoryThreshold = {
      ...threshold,
      amountARS,
      actionRequired,
      description,
      regulationSource,
      periodicity:'POR_OPERACION',
      lastUpdated: new Date().toISOString().slice(0, 10),
    };

    setSaveError('');setSaveBusy(true);
    try {await onSave(updated);onClose();}catch(error){setSaveError((error as Error).message);}finally{setSaveBusy(false);}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/30 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl sm:rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Actualizar piso UIF
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {threshold.code} • {threshold.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-sm">
          
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Piso UIF en pesos argentinos ($ ARS)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amountARS}
                onChange={(e) => setAmountARS(Number(e.target.value))}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-base font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-teal-500"
                required
              />
            </div>
            <div className="text-xs text-slate-500 font-mono mt-1">
              Equivalente: <strong>$ {amountARS.toLocaleString('es-AR')} ARS</strong>
            </div>
          </div>

          <details className="surface p-3 space-y-3"><summary className="text-xs text-teal-700">Referencia y alcance</summary>
            <label className="field-label">Fuente normativa<input value={regulationSource} onChange={e=>setRegulatorySource(e.target.value)}/></label>
            <label className="field-label">Alcance<textarea rows={2} value={description} onChange={e=>setDescription(e.target.value)}/></label>
            <label className="field-label">Acción requerida<textarea rows={2} value={actionRequired} onChange={e=>setActionRequired(e.target.value)}/></label>
          </details>

          <div className="p-3 bg-teal-50 rounded-xl border border-teal-100 flex items-start gap-2.5 text-xs text-teal-900">
            <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <p>
              El cambio se guardará en la configuración de riesgo.
            </p>
          </div>

          {/* Action buttons */}
          {saveError&&<p role="alert" className="text-sm text-rose-700">{saveError}</p>}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saveBusy}
              className="px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Guardar piso UIF</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
