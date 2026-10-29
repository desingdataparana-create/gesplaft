import React, { useState, useEffect } from 'react';
import { 
  RiskCriterion, 
  FactorWeight, 
  RegulatoryThreshold, 
  RiskFactorCategory, 
  RiskLevel 
} from '../types';
import { 
  Scale, 
  Grid3X3, 
  SlidersHorizontal, 
  Search, 
  Edit3, 
  Check, 
  Plus, 
  Download, 
  FileText, 
  Info,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { EditThresholdModal } from './EditThresholdModal';

interface NormativaMatrizViewProps {
  onDeleteCriterion?:(criterion:RiskCriterion)=>Promise<void>;
  deleting?:boolean;
  thresholds: RegulatoryThreshold[];
  onUpdateThresholds: (thresholds: RegulatoryThreshold[]) => Promise<void>;
  criteria: RiskCriterion[];
  factorWeights: FactorWeight[];
  onUpdateCriteria: (criteria: RiskCriterion[]) => void;
  onUpdateWeights: (weights: FactorWeight[]) => void;
  onOpenAddModal: () => void;
  onEditCriterion: (criterion: RiskCriterion) => void;
  onResetDefaults: () => void;
  onOpenExportModal?: (initialType?: 'EXPEDIENTES' | 'PARAMETROS' | 'UMBRALES' | 'ESTADISTICAS') => void;
}

export const NormativaMatrizView: React.FC<NormativaMatrizViewProps> = ({
  onDeleteCriterion,deleting=false,
  thresholds,
  onUpdateThresholds,
  criteria,
  factorWeights,
  onOpenAddModal,
  onEditCriterion,
  onResetDefaults,
  onOpenExportModal,
}) => {
  const [activeTab, setActiveTab] = useState<'UMBRALES' | 'MATRIZ' | 'CRITERIOS'>('CRITERIOS');

  // Thresholds modal state
  const [thresholdToEdit, setThresholdToEdit] = useState<RegulatoryThreshold | null>(null);
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
  const [thresholdSavedMsg, setThresholdSavedMsg] = useState(false);

  // Criteria filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RiskFactorCategory | 'ALL'>('ALL');

  const [criteriaPage,setCriteriaPage]=useState(1);
  useEffect(()=>setCriteriaPage(1),[searchTerm,selectedCategory,criteria.length]);

  // Matrix interactive cell
  const [selectedCell, setSelectedCell] = useState<{ prob: number; imp: number } | null>(null);

  const handleOpenEditThreshold = (t: RegulatoryThreshold) => {
    setThresholdToEdit(t);
    setIsThresholdModalOpen(true);
  };

  const handleSaveThreshold = async (updatedThreshold: RegulatoryThreshold) => {
    const updated = thresholds.map((t) =>
      t.id === updatedThreshold.id ? updatedThreshold : t
    );
    await onUpdateThresholds(updated);
    setThresholdSavedMsg(true);
    setTimeout(() => setThresholdSavedMsg(false), 3000);
  };

  // Matrix cell risk level helper
  const getCellRisk = (prob: number, imp: number): { level: RiskLevel; label: string; bgClass: string; textClass: string; score: number } => {
    const product = prob * imp;
    if (product >= 16) {
      return { level: 'CRITICO', label: 'Crítico', bgClass: 'bg-rose-500 hover:bg-rose-600 text-white', textClass: 'text-rose-700', score: product };
    }
    if (product >= 10) {
      return { level: 'ALTO', label: 'Alto', bgClass: 'bg-orange-500 hover:bg-orange-600 text-white', textClass: 'text-orange-700', score: product };
    }
    if (product >= 5) {
      return { level: 'MEDIO', label: 'Medio', bgClass: 'bg-amber-400 hover:bg-amber-500 text-slate-900', textClass: 'text-amber-700', score: product };
    }
    return { level: 'BAJO', label: 'Bajo', bgClass: 'bg-emerald-500 hover:bg-emerald-600 text-white', textClass: 'text-emerald-700', score: product };
  };

  const getMatrixCoordinates = (item: RiskCriterion) => {
    let baseScore = item.score;
    let impact = baseScore;
    let probability = Math.min(5, Math.max(1, (item.score % 3) + 2));
    if (item.category === 'CLIENTE' && item.score >= 4) {
      probability = 4;
      impact = item.score;
    } else if (item.category === 'OPERACIONAL') {
      probability = 5;
      impact = Math.min(5, item.score);
    } else if (item.category === 'GEOGRAFIA') {
      probability = 3;
      impact = item.score;
    }
    return { probability, impact };
  };

  // Filtered criteria list
  const filteredCriteria = criteria.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.regulatoryBase.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      <div className="page-heading"><div><h1>Configuración</h1><p>Criterios, umbrales y matriz de evaluación.</p></div></div>
      <nav aria-label="Secciones de configuración" className="flex gap-5 border-b border-slate-200 overflow-x-auto">{([['CRITERIOS','Criterios'],['UMBRALES','Umbrales'],['MATRIZ','Matriz']] as const).map(([id,label])=><button key={id} aria-current={activeTab===id?'page':undefined} onClick={()=>setActiveTab(id)} className={`text-sm py-3 whitespace-nowrap border-b-2 ${activeTab===id?'border-teal-700 text-teal-700 font-medium':'border-transparent text-slate-400'}`}>{label}</button>)}</nav>

      {/* SUB-VIEW 1: UMBRALES REGULATORIOS UIF */}
      {activeTab === 'UMBRALES' && (
        <div className="space-y-6">
          {thresholdSavedMsg && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-3">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Umbral actualizado correctamente en el sistema</span>
            </div>
          )}

          <div className="surface divide-y divide-slate-100">
            {thresholds.map(threshold=><div key={threshold.id} className="p-5 flex flex-col sm:flex-row sm:items-start gap-4"><div className="flex-1 min-w-0"><h3 className="text-sm font-medium text-slate-800">{threshold.title}</h3><p className="text-xs text-slate-400 mt-1">{threshold.periodicity==='POR_OPERACION'?'Por operación':threshold.periodicity==='ANUAL'?'Anual':'Mensual acumulado'}</p><details className="mt-3 text-xs text-slate-500"><summary className="text-teal-700">Ver alcance</summary><p className="mt-2 leading-relaxed">{threshold.description}</p><p className="mt-2">{threshold.actionRequired}</p><p className="mt-2 text-slate-400">{threshold.regulationSource}</p></details></div><div className="flex items-center justify-between sm:justify-start gap-5"><span className="tabular-nums font-medium text-slate-800">${threshold.amountARS.toLocaleString('es-AR')}</span><button className="button-secondary" onClick={()=>handleOpenEditThreshold(threshold)}>Editar</button></div></div>)}
          </div>
          <p className="text-xs text-slate-400">Los valores de esta demo requieren revisión antes de su uso operativo.</p>
        </div>
      )}

      {/* SUB-VIEW 2: MATRIZ 5x5 Y PONDERACIÓN DE FACTORES */}
      {activeTab === 'MATRIZ' && (
        <div className="space-y-6">
          {/* Ponderación de los 5 Factores */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4">
              Ponderación de Factores de Riesgo PLA/FT (Total: 100%)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              {factorWeights.map((fw) => (
                <div key={fw.category} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">{fw.name}</div>
                  <div className="text-2xl font-black font-mono text-teal-800 mt-1">
                    {fw.weightPercentage}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1 truncate" title={fw.description}>
                    {fw.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Matriz 5x5 Grilla */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Cuadrante 5x5: Probabilidad vs. Impacto
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Haga clic en cualquier casilla para ver los criterios correspondientes
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Bajo</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Medio</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Alto</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Crítico</span>
                </div>
              </div>

              {/* 5x5 Grid */}
              <div className="flex flex-col gap-2">
                {[5, 4, 3, 2, 1].map((impact) => (
                  <div key={impact} className="flex items-center gap-2">
                    <div className="w-16 text-right text-xs font-mono text-slate-500 font-bold pr-1">
                      Imp {impact}
                    </div>
                    {[1, 2, 3, 4, 5].map((probability) => {
                      const cellRisk = getCellRisk(probability, impact);
                      const matchingCriteria = criteria.filter((c) => {
                        const coords = getMatrixCoordinates(c);
                        return coords.probability === probability && coords.impact === impact;
                      });
                      const isSelected = selectedCell?.prob === probability && selectedCell?.imp === impact;

                      return (
                        <button
                          key={probability}
                          type="button"
                          onClick={() => setSelectedCell({ prob: probability, imp: impact })}
                          className={`flex-1 h-14 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer relative ${cellRisk.bgClass} ${
                            isSelected ? 'ring-4 ring-slate-900 ring-offset-2 scale-[1.04] z-10 shadow-lg' : 'opacity-90 hover:opacity-100'
                          }`}
                        >
                          <span className="text-sm font-mono font-black">
                            {matchingCriteria.length > 0 ? matchingCriteria.length : '-'}
                          </span>
                          <span className="text-[10px] opacity-90 uppercase tracking-tighter font-semibold">
                            {cellRisk.score} pts
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
                {/* Horizontal X axis */}
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-16"></div>
                  {[1, 2, 3, 4, 5].map((prob) => (
                    <div key={prob} className="flex-1 text-center text-xs font-mono text-slate-500 font-bold">
                      Prob {prob}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Selected Cell Detail Panel */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              {selectedCell ? (
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <div>
                      <div className="text-xs text-slate-400 font-mono">
                        Prob {selectedCell.prob} × Impacto {selectedCell.imp} ({selectedCell.prob * selectedCell.imp} pts)
                      </div>
                      <div className="text-base font-bold text-slate-900">
                        Nivel {getCellRisk(selectedCell.prob, selectedCell.imp).label}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCell(null)}
                      className="text-xs text-slate-400 hover:text-slate-700 font-bold"
                    >
                      Limpiar
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {criteria
                      .filter((c) => {
                        const coords = getMatrixCoordinates(c);
                        return coords.probability === selectedCell.prob && coords.impact === selectedCell.imp;
                      })
                      .map((c) => (
                        <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-mono font-bold text-teal-800">{c.code}</span>
                            <span className="text-[10px] text-slate-500 font-mono uppercase">{c.category}</span>
                          </div>
                          <div className="font-bold text-slate-900">{c.name}</div>
                          <div className="text-slate-500 mt-1 line-clamp-2">{c.description}</div>
                        </div>
                      ))}
                    {criteria.filter((c) => {
                      const coords = getMatrixCoordinates(c);
                      return coords.probability === selectedCell.prob && coords.impact === selectedCell.imp;
                    }).length === 0 && (
                      <p className="text-xs text-slate-400 italic py-6 text-center">
                        No hay criterios registrados en este cuadrante específico.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 flex flex-col items-center justify-center my-auto">
                  <Grid3X3 className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-600">Seleccione una celda de la matriz</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Podrá visualizar los criterios de riesgo asignados a ese nivel de probabilidad e impacto.
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>Total Criterios: <strong>{criteria.length}</strong></span>
                <button
                  type="button"
                  onClick={onResetDefaults}
                  className="text-slate-400 hover:text-rose-600 flex items-center gap-1 font-medium transition-colors"
                  title="Restablecer valores de ejemplo"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restablecer ejemplos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: CATÁLOGO DE CRITERIOS DE RIESGO */}
      {activeTab === 'CRITERIOS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="flex flex-col sm:flex-row flex-1 sm:items-center gap-3">
              <div className="relative flex-1 w-full max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar criterio por código, nombre o normativa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-teal-500 transition-colors"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 font-medium focus:outline-hidden"
              >
                <option value="ALL">Todas las Categorías</option>
                <option value="CLIENTE">Factor Cliente</option>
                <option value="PRODUCTO">Factor Producto</option>
                <option value="CANAL">Factor Canal</option>
                <option value="GEOGRAFIA">Factor Geografía</option>
                <option value="OPERACIONAL">Factor Operacional</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenAddModal}
                className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Criterio</span>
              </button>
            </div>
          </div>

          {/* Clean Criteria Table */}
          <div className="surface overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-5 w-24">Código</th>
                  <th className="py-3.5 px-5">Criterio / Factor</th>
                  <th className="py-3.5 px-4 w-32">Nivel</th>
                  <th className="py-3.5 px-5 hidden 2xl:table-cell">Base Normativa</th>
                  <th className="py-3.5 px-5 w-20 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCriteria.slice((criteriaPage-1)*10,criteriaPage*10).map((criterion) => {
                  return (
                    <tr key={criterion.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5 font-mono font-bold text-teal-800">
                        {criterion.code}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="font-medium text-slate-800">{criterion.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{criterion.description}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold ${
                          criterion.riskLevel === 'CRITICO' ? 'bg-rose-100 text-rose-800' :
                          criterion.riskLevel === 'ALTO' ? 'bg-orange-100 text-orange-800' :
                          criterion.riskLevel === 'MEDIO' ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {criterion.riskLevel} ({criterion.score} pt)
                        </span>
                      </td>
                      <td className="py-3.5 px-5 hidden 2xl:table-cell text-slate-500 font-mono text-xs">
                        {criterion.regulatoryBase}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => onEditCriterion(criterion)}
                          className="text-slate-400 hover:text-teal-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Editar criterio"
                          aria-label={`Editar ${criterion.name}`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {onDeleteCriterion&&<button type="button" disabled={deleting} onClick={()=>void onDeleteCriterion(criterion)} className="text-slate-400 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50" title="Eliminar parámetro" aria-label={`Eliminar ${criterion.name}`}><Trash2 className="w-4 h-4"/></button>}
                      </td>
                    </tr>
                  );
                })}
                {filteredCriteria.length===0&&<tr><td colSpan={5} className="p-8 text-center text-slate-400 text-sm">No hay criterios para esta búsqueda.</td></tr>}
              </tbody>
            </table>
            <div className="list-footer"><span>{filteredCriteria.length} criterios</span><div className="flex gap-3 items-center"><button disabled={criteriaPage===1} onClick={()=>setCriteriaPage(criteriaPage-1)}>Anterior</button><span>{criteriaPage} / {Math.max(1,Math.ceil(filteredCriteria.length/10))}</span><button disabled={criteriaPage>=Math.ceil(filteredCriteria.length/10)} onClick={()=>setCriteriaPage(criteriaPage+1)}>Siguiente</button></div></div>
          </div>
        </div>
      )}

      {/* Responsive Edit Threshold Modal */}
      <EditThresholdModal
        isOpen={isThresholdModalOpen}
        threshold={thresholdToEdit}
        onClose={() => {
          setIsThresholdModalOpen(false);
          setThresholdToEdit(null);
        }}
        onSave={handleSaveThreshold}
      />
    </div>
  );
};
