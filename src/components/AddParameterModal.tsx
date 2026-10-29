import React, { useState, useEffect } from 'react';
import { RiskCriterion, RiskFactorCategory, RiskLevel } from '../types';
import { X, Plus, Save, AlertCircle, Sliders } from 'lucide-react';

interface AddParameterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (criterion: RiskCriterion) => Promise<void> | void;
  editingCriterion: RiskCriterion | null;
}

export const AddParameterModal: React.FC<AddParameterModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingCriterion,
}) => {
  const [category, setCategory] = useState<RiskFactorCategory>('CLIENTE');
  const [code, setCode] = useState('CLI-08');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subgroup, setSubgroup] = useState('');
  const [score, setScore] = useState<number>(3);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('MEDIO');
  const [mitigationFactor, setMitigationFactor] = useState<number>(0.7);
  const [regulatoryBase, setRegulatoryBase] = useState('Res. UIF 194/2023');

  const [saveError,setSaveError]=useState('');
  const [saveBusy,setSaveBusy]=useState(false);
  useEffect(() => {
    setSaveError('');
    if (editingCriterion) {
      setCategory(editingCriterion.category);
      setCode(editingCriterion.code);
      setName(editingCriterion.name);
      setDescription(editingCriterion.description);
      setSubgroup(editingCriterion.subgroup);
      setScore(editingCriterion.score);
      setRiskLevel(editingCriterion.riskLevel);
      setMitigationFactor(editingCriterion.mitigationFactor);
      setRegulatoryBase(editingCriterion.regulatoryBase);
    } else {
      setCategory('CLIENTE');
      setCode(`CLI-${Math.floor(10 + Math.random() * 89)}`);
      setName('');
      setDescription('');
      setSubgroup('General');
      setScore(3);
      setRiskLevel('MEDIO');
      setMitigationFactor(0.7);
      setRegulatoryBase('Res. UIF 194/2023');
    }
  }, [editingCriterion, isOpen]);

  const handleScoreChange = (newScore: number) => {
    setScore(newScore);
    if (newScore === 1) setRiskLevel('BAJO');
    else if (newScore === 2) setRiskLevel('BAJO');
    else if (newScore === 3) setRiskLevel('MEDIO');
    else if (newScore === 4) setRiskLevel('ALTO');
    else if (newScore === 5) setRiskLevel('CRITICO');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      alert('Por favor complete los campos obligatorios: Código y Nombre.');
      return;
    }

    const newCriterion: RiskCriterion = {
      id: editingCriterion ? editingCriterion.id : `crit-${Date.now()}`,
      category,
      code,
      name,
      description,
      subgroup: subgroup || 'General',
      score,
      riskLevel,
      mitigationFactor,
      active: editingCriterion ? editingCriterion.active : true,
      regulatoryBase: regulatoryBase || 'Manual PLA/FT IAFAS',
      lastUpdated: new Date().toISOString().slice(0, 10),
    };

    setSaveError('');setSaveBusy(true);
    try{await onSave(newCriterion);onClose();}catch(error){setSaveError((error as Error).message);}finally{setSaveBusy(false);}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[94vh] sm:max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {editingCriterion ? 'Editar Parámetro de Riesgo' : 'Nuevo Parámetro de Riesgo PLA/FT'}
              </h3>
              <p className="text-xs text-slate-400">Matriz de Enfoque Basado en Riesgo IAFAS</p>
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
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto flex-1">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Factor de Riesgo</label>
                <select
                  value={category}
                  onChange={(e) => {
                    const cat = e.target.value as RiskFactorCategory;
                    setCategory(cat);
                    const prefix = cat === 'CLIENTE' ? 'CLI' : cat === 'PRODUCTO' ? 'PROD' : cat === 'CANAL' ? 'CAN' : cat === 'GEOGRAFIA' ? 'GEO' : 'OPER';
                    if (!editingCriterion) {
                      setCode(`${prefix}-${Math.floor(10 + Math.random() * 89)}`);
                    }
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                >
                  <option value="CLIENTE">Factor Cliente / Apostador</option>
                  <option value="PRODUCTO">Factor Producto / Juego</option>
                  <option value="CANAL">Factor Canal de Distribución</option>
                  <option value="GEOGRAFIA">Factor Zona Geográfica</option>
                  <option value="OPERACIONAL">Factor Operacional / Transaccional</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Código Identificador</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-teal-800 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  placeholder="CLI-08"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Nombre del Parámetro / Condición</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                placeholder="Ej. Apostador con residencia transitoria en zona fronteriza..."
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Subgrupo / Tipología</label>
                <input
                  type="text"
                  value={subgroup}
                  onChange={(e) => setSubgroup(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  placeholder="Ej. Ubicación, Calidad PEP..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Base Normativa / Regla</label>
                <input
                  type="text"
                  value={regulatoryBase}
                  onChange={(e) => setRegulatoryBase(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  placeholder="Res. UIF 194/2023 - Art. 12"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Descripción Técnica y Criterio de Aplicación</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-normal text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                placeholder="Describa el supuesto fáctico, los indicios de riesgo y el impacto en la operación..."
              />
            </div>

            {/* Scoring & Mitigator Slider */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700">Puntaje Inherente (1-5)</label>
                  <span className="font-bold text-teal-800">{score} ({riskLevel})</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={score}
                  onChange={(e) => handleScoreChange(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>1 (Bajo)</span>
                  <span>3 (Medio)</span>
                  <span>5 (Crítico)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700">Factor Mitigador</label>
                  <span className="font-mono font-bold text-slate-900">x{mitigationFactor.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={mitigationFactor}
                  onChange={(e) => setMitigationFactor(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
                <div className="text-[10px] text-slate-400 mt-1">
                  Coeficiente reductor ante control eficaz.
                </div>
              </div>
            </div>

          </div>

          {saveError&&<p role="alert" className="px-6 py-3 text-sm text-rose-700">{saveError}</p>}
          {/* Sticky Footer */}
          <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-white">
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
              className="px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{editingCriterion ? 'Guardar Cambios' : 'Crear Parámetro'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
