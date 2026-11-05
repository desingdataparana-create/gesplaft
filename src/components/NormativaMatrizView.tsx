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
  canEdit?:boolean;
  onDeleteCriterion?:(criterion:RiskCriterion)=>Promise<void>;
  deleting?:boolean;
  thresholds: RegulatoryThreshold[];
  onUpdateThresholds: (thresholds: RegulatoryThreshold[]) => Promise<void>;
  criteria: RiskCriterion[];
  factorWeights: FactorWeight[];
  onUpdateCriteria: (criteria: RiskCriterion[]) => void;
  onUpdateWeights: (weights: FactorWeight[]) => Promise<void>;
  onOpenAddModal: () => void;
  onEditCriterion: (criterion: RiskCriterion) => void;
  onResetDefaults: () => void;
  onOpenExportModal?: (initialType?: 'EXPEDIENTES' | 'PARAMETROS' | 'UMBRALES' | 'ESTADISTICAS') => void;
}

export const NormativaMatrizView: React.FC<NormativaMatrizViewProps> = ({
  canEdit=true,onDeleteCriterion,deleting=false,
  thresholds,
  onUpdateThresholds,
  criteria,
  factorWeights,onUpdateWeights,
  onOpenAddModal,
  onEditCriterion,
  onResetDefaults,
  onOpenExportModal,
}) => {
  const [activeTab, setActiveTab] = useState<'UMBRALES' | 'MATRIZ' | 'CRITERIOS'>('CRITERIOS');

  const [draftWeights,setDraftWeights]=useState<FactorWeight[]|null>(null),[weightBusy,setWeightBusy]=useState(false),[weightError,setWeightError]=useState(''),[weightSaved,setWeightSaved]=useState(false);
  const weightsToEdit=draftWeights||factorWeights;
  // Thresholds modal state
  const [thresholdToEdit, setThresholdToEdit] = useState<RegulatoryThreshold | null>(null);
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
  const [thresholdSavedMsg, setThresholdSavedMsg] = useState(false);

  // Criteria filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RiskFactorCategory | 'ALL'>('ALL');

  const [criteriaPage,setCriteriaPage]=useState(1);


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

  const criteriaPages=Math.max(1,Math.ceil(filteredCriteria.length/10)),currentCriteriaPage=Math.min(criteriaPage,criteriaPages);
  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      <div className="page-heading"><div><h1>Configuración</h1><p>Criterios, piso UIF y matriz de evaluación.</p></div></div>
      <nav aria-label="Secciones de configuración" className="flex gap-5 border-b border-slate-200 overflow-x-auto">{([['CRITERIOS','Criterios'],['UMBRALES','Piso UIF'],['MATRIZ','Matriz']] as const).map(([id,label])=><button key={id} aria-current={activeTab===id?'page':undefined} onClick={()=>setActiveTab(id)} className={`text-sm py-3 whitespace-nowrap border-b-2 ${activeTab===id?'border-teal-700 text-teal-700 font-medium':'border-transparent text-slate-400'}`}>{label}</button>)}</nav>

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
            {thresholds.map(threshold=><div key={threshold.id} className="p-5 flex flex-col sm:flex-row sm:items-start gap-4"><div className="flex-1 min-w-0"><h3 className="text-sm font-medium text-slate-800">{threshold.title}</h3><p className="text-xs text-slate-400 mt-1">{threshold.periodicity==='POR_OPERACION'?'Por operación':threshold.periodicity==='ANUAL'?'Anual':'Mensual acumulado'}</p><details className="mt-3 text-xs text-slate-500"><summary className="text-teal-700">Ver alcance</summary><p className="mt-2 leading-relaxed">{threshold.description}</p><p className="mt-2">{threshold.actionRequired}</p><p className="mt-2 text-slate-400">{threshold.regulationSource}</p></details></div><div className="flex items-center justify-between sm:justify-start gap-5"><span className="tabular-nums font-medium text-slate-800">${threshold.amountARS.toLocaleString('es-AR')}</span><button disabled={!canEdit} className="button-secondary" onClick={()=>handleOpenEditThreshold(threshold)}>Editar</button></div></div>)}
          </div>
          <p className="text-xs text-slate-400">Los valores de esta demo requieren revisión antes de su uso operativo.</p>
        </div>
      )}

      {activeTab==='MATRIZ'&&<section className="surface p-6 space-y-5">
        <h2 className="font-semibold">Cálculo de riesgo y ponderaciones</h2>
        <p className="text-sm text-slate-600">La evaluación usa cuatro factores: condiciones del sujeto, producto o juego, canal y zona. Dentro de cada factor combina el puntaje máximo (70%) y el promedio (30%), los convierte a escala de 100 y aplica la ponderación configurada.</p>
        <p className="text-sm text-slate-600">Menos de 40 puntos: bajo; de 40 a menos de 75: medio; de 75 a menos de 85: alto; desde 85: crítico. PEP y los parámetros personales CLI-03, CLI-04 y CLI-07 establecen como mínimo riesgo alto. El piso UIF define el alcance monetario y no suma puntaje.</p>
        <form className="space-y-4" onSubmit={async e=>{e.preventDefault();setWeightBusy(true);setWeightError('');setWeightSaved(false);try{if(Math.abs(weightsToEdit.reduce((n,w)=>n+w.weightPercentage,0)-100)>.01)throw Error('Las ponderaciones deben sumar 100%.');await onUpdateWeights(weightsToEdit);setDraftWeights(null);setWeightSaved(true);}catch(err){setWeightError((err as Error).message)}finally{setWeightBusy(false)}}}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{weightsToEdit.map((w,index)=><label className="field-label" key={w.category}>{w.name}<input type="number" min="0" max="100" step="0.01" required disabled={weightBusy||!canEdit} value={w.weightPercentage} onChange={e=>{const value=Number(e.target.value);setDraftWeights(previous=>(previous||factorWeights).map((item,i)=>i===index?{...item,weightPercentage:value}:item));setWeightSaved(false)}}/>%</label>)}</div>
          <p className="text-sm">Total: {weightsToEdit.reduce((n,w)=>n+w.weightPercentage,0).toLocaleString('es-AR')}%</p>
          <button disabled={weightBusy||!canEdit} className="button-primary">{weightBusy?'Guardando…':'Guardar ponderaciones'}</button>
          {weightError&&<p role="alert" className="text-rose-700">{weightError}</p>}{weightSaved&&<p role="status" className="text-emerald-700">Ponderaciones guardadas. Los expedientes anteriores conservan su evaluación.</p>}
        </form>
      </section>}

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
                  onChange={(e) => {setSearchTerm(e.target.value);setCriteriaPage(1)}}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-teal-500 transition-colors"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => {setSelectedCategory(e.target.value as RiskFactorCategory|'ALL');setCriteriaPage(1)}}
                className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 font-medium focus:outline-hidden"
              >
                <option value="ALL">Todas las Categorías</option>
                <option value="CLIENTE">Factor Cliente</option>
                <option value="PRODUCTO">Factor Producto</option>
                <option value="CANAL">Factor Canal</option>
                <option value="GEOGRAFIA">Factor Geografía</option>

              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!canEdit} onClick={onOpenAddModal}
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
                {filteredCriteria.slice((currentCriteriaPage-1)*10,currentCriteriaPage*10).map((criterion) => {
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
                          disabled={!canEdit} onClick={() => onEditCriterion(criterion)}
                          className="text-slate-400 hover:text-teal-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Editar criterio"
                          aria-label={`Editar ${criterion.name}`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {onDeleteCriterion&&<button type="button" disabled={deleting||!canEdit} onClick={()=>void onDeleteCriterion(criterion)} className="text-slate-400 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50" title="Eliminar parámetro" aria-label={`Eliminar ${criterion.name}`}><Trash2 className="w-4 h-4"/></button>}
                      </td>
                    </tr>
                  );
                })}
                {filteredCriteria.length===0&&<tr><td colSpan={5} className="p-8 text-center text-slate-400 text-sm">No hay criterios para esta búsqueda.</td></tr>}
              </tbody>
            </table>
            <div className="list-footer"><span>{filteredCriteria.length} criterios</span><div className="flex gap-3 items-center"><button disabled={currentCriteriaPage===1} onClick={()=>setCriteriaPage(currentCriteriaPage-1)}>Anterior</button><span>{currentCriteriaPage} / {criteriaPages}</span><button disabled={currentCriteriaPage>=criteriaPages} onClick={()=>setCriteriaPage(currentCriteriaPage+1)}>Siguiente</button></div></div>
          </div>
        </div>
      )}

      {/* Responsive Edit Threshold Modal */}
      {isThresholdModalOpen&&<EditThresholdModal
        isOpen={isThresholdModalOpen}
        threshold={thresholdToEdit}
        onClose={() => {
          setIsThresholdModalOpen(false);
          setThresholdToEdit(null);
        }}
        onSave={handleSaveThreshold}
      />}
    </div>
  );
};
