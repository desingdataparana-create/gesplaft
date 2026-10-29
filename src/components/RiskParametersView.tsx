import React, { useState } from 'react';
import { 
  RiskCriterion, 
  RiskFactorCategory, 
  FactorWeight, 
  RiskLevel 
} from '../types';
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Download, 
  Upload, 
  RotateCcw, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  FileText, 
  UserCheck, 
  Dices, 
  Store, 
  MapPin, 
  Activity,
  Layers,
  Sparkles,
  Info,
  FileCode,
  FileSpreadsheet,
  ChevronDown
} from 'lucide-react';
import { 
  generateCriteriaXML, 
  generateCriteriaXLS, 
  generateCriteriaCSV, 
  downloadFile 
} from '../utils/exportUtils';

interface RiskParametersViewProps {
  onDeleteCriterion?:(criterion:RiskCriterion)=>Promise<void>;
  criteria: RiskCriterion[];
  factorWeights: FactorWeight[];
  onUpdateCriteria: (criteria: RiskCriterion[]) => void;
  onUpdateWeights: (weights: FactorWeight[]) => void;
  onOpenAddModal: () => void;
  onEditCriterion: (criterion: RiskCriterion) => void;
  onResetDefaults: () => void;
  onOpenExportModal?: (initialType?: 'EXPEDIENTES' | 'PARAMETROS' | 'UMBRALES' | 'ESTADISTICAS') => void;
}

export const RiskParametersView: React.FC<RiskParametersViewProps> = ({
  onDeleteCriterion,
  criteria,
  factorWeights,
  onUpdateCriteria,
  onUpdateWeights,
  onOpenAddModal,
  onEditCriterion,
  onResetDefaults,
  onOpenExportModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<RiskFactorCategory | 'ALL'>('ALL');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<RiskLevel | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showWeightEditor, setShowWeightEditor] = useState(false);
  const [tempWeights, setTempWeights] = useState<FactorWeight[]>(factorWeights);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Filtered criteria list
  const filteredCriteria = criteria.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesLevel = selectedLevelFilter === 'ALL' || item.riskLevel === selectedLevelFilter;
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.subgroup.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.regulatoryBase.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesLevel && matchesSearch;
  });

  const getCategoryIcon = (category: RiskFactorCategory) => {
    switch (category) {
      case 'CLIENTE': return <UserCheck className="w-5 h-5 text-blue-600" />;
      case 'PRODUCTO': return <Dices className="w-5 h-5 text-purple-600" />;
      case 'CANAL': return <Store className="w-5 h-5 text-emerald-600" />;
      case 'GEOGRAFIA': return <MapPin className="w-5 h-5 text-amber-600" />;
      case 'OPERACIONAL': return <Activity className="w-5 h-5 text-rose-600" />;
    }
  };

  const getLevelBadge = (level: RiskLevel, score: number) => {
    switch (level) {
      case 'BAJO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Bajo ({score} pt)
          </span>
        );
      case 'MEDIO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Medio ({score} pts)
          </span>
        );
      case 'ALTO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            Alto ({score} pts)
          </span>
        );
      case 'CRITICO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
            Crítico ({score} pts)
          </span>
        );
    }
  };

  const handleToggleActive = (id: string) => {
    const updated = criteria.map((c) => (c.id === id ? { ...c, active: !c.active } : c));
    onUpdateCriteria(updated);
  };

  const handleDeleteCriterion = async (id:string) => {
    const criterion=criteria.find(c=>c.id===id);if(!criterion||!onDeleteCriterion)return;
    await onDeleteCriterion(criterion);
  };

  const handleExport = (format: 'XML' | 'XLS' | 'CSV' | 'JSON') => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    if (format === 'XML') {
      const filename = `IAFAS_Parametros_Riesgo_${timestamp}.xml`;
      const xml = generateCriteriaXML(criteria, factorWeights);
      downloadFile(xml, filename, 'application/xml;charset=utf-8;');
      setSaveNotification('Catálogo exportado exitosamente en XML');
    } else if (format === 'XLS') {
      const filename = `IAFAS_Parametros_Riesgo_${timestamp}.xls`;
      const xls = generateCriteriaXLS(criteria, factorWeights);
      downloadFile(xls, filename, 'application/vnd.ms-excel;charset=utf-8;');
      setSaveNotification('Catálogo exportado exitosamente en XLS (Excel)');
    } else if (format === 'CSV') {
      const filename = `IAFAS_Parametros_Riesgo_${timestamp}.csv`;
      const csv = generateCriteriaCSV(criteria);
      downloadFile(csv, filename, 'text/csv;charset=utf-8;');
      setSaveNotification('Catálogo exportado exitosamente en CSV');
    } else if (format === 'JSON') {
      const dataToExport = {
        institution: 'IAFAS - Entre Ríos',
        system: 'Matriz de Riesgos PLA/FT',
        exportDate: new Date().toISOString(),
        factorWeights,
        criteria,
      };
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `IAFAS_Parametros_Riesgo_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSaveNotification('Catálogo exportado en JSON');
    }

    setShowExportMenu(false);
    setTimeout(() => setSaveNotification(null), 3000);
  };

  const handleWeightChange = (category: RiskFactorCategory, val: number) => {
    setTempWeights((prev) =>
      prev.map((w) => (w.category === category ? { ...w, weightPercentage: Number(val) } : w))
    );
  };

  const totalTempWeight = tempWeights.reduce((acc, curr) => acc + curr.weightPercentage, 0);

  const handleSaveWeights = () => {
    if (totalTempWeight !== 100) {
      alert('La suma de las ponderaciones debe ser exactamente 100%. Actual: ' + totalTempWeight + '%');
      return;
    }
    onUpdateWeights(tempWeights);
    setShowWeightEditor(false);
    setSaveNotification('Ponderaciones de factores actualizadas correctamente');
    setTimeout(() => setSaveNotification(null), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {saveNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-3 animate-fade-in text-xs">
          <Check className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-medium">{saveNotification}</span>
        </div>
      )}

      {/* Main Top Banner & Description */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 shrink-0">
        <div>
          <p className="text-sm text-slate-500 font-medium">Control de Parámetros • /#parametrosRiesgo</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Definición de Riesgos Operativos y PLA/FT
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-nuevo-parametro"
            onClick={onOpenAddModal}
            className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm shadow-teal-200 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Parámetro</span>
          </button>
          <button
            id="btn-ajustar-ponderaciones"
            onClick={() => {
              setTempWeights(factorWeights);
              setShowWeightEditor(!showWeightEditor);
            }}
            className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-medium text-sm border border-slate-200 shadow-2xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <span>Ponderaciones ({factorWeights.reduce((a, b) => a + b.weightPercentage, 0)}%)</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              id="btn-exportar-parametros"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2.5 rounded-xl font-medium text-sm border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Exportar parámetros de riesgo"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Exportar</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-40 animate-fadeIn text-xs">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Exportar Catálogo ({criteria.length} criterios)
                </div>
                <button
                  onClick={() => handleExport('XML')}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                >
                  <FileCode className="w-4 h-4 text-emerald-600" />
                  <span>Formato <strong>XML</strong> (.xml)</span>
                </button>
                <button
                  onClick={() => handleExport('XLS')}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                  <span>Planilla <strong>Excel</strong> (.xls)</span>
                </button>
                <button
                  onClick={() => handleExport('CSV')}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Archivo <strong>CSV</strong> (.csv)</span>
                </button>
                <button
                  onClick={() => handleExport('JSON')}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span>Estructura <strong>JSON</strong> (.json)</span>
                </button>
                {onOpenExportModal && (
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        onOpenExportModal('PARAMETROS');
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-teal-50 text-teal-700 font-semibold flex items-center gap-2 cursor-pointer text-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Centro de Reportes...</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            id="btn-restablecer-defaults"
            onClick={onResetDefaults}
            className="bg-white hover:bg-rose-50 text-rose-600 px-3.5 py-2.5 rounded-xl font-medium text-sm border border-rose-200 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Restablecer a valores normativos oficiales IAFAS"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Restaurar</span>
          </button>
        </div>
      </div>

      {/* Weights Adjustment Drawer (Collapsible) */}
      {showWeightEditor && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-teal-600" />
                Ajuste de Ponderaciones por Factor de Riesgo (Total: 100%)
              </h3>
              <p className="text-xs text-slate-500">
                Defina el peso relativo de cada factor en el cálculo final del perfil de riesgo.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                totalTempWeight === 100 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-rose-100 text-rose-800'
              }`}>
                Suma: {totalTempWeight}% {totalTempWeight === 100 ? '(Válido)' : '(Debe sumar 100%)'}
              </span>
              <button
                onClick={handleSaveWeights}
                disabled={totalTempWeight !== 100}
                className="px-4 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Guardar Ponderaciones
              </button>
              <button
                onClick={() => setShowWeightEditor(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {tempWeights.map((w) => (
              <div key={w.category} className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{w.name.split('/')[0]}</span>
                  <span className="text-sm font-black text-teal-700">{w.weightPercentage}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={w.weightPercentage}
                  onChange={(e) => handleWeightChange(w.category, Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
                <p className="text-[11px] text-slate-500 line-clamp-2">{w.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Factor Category Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedCategory === 'ALL'
              ? 'bg-teal-50 text-teal-900 border-teal-300 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50/80'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <Layers className={`w-5 h-5 ${selectedCategory === 'ALL' ? 'text-teal-600' : 'text-slate-400'}`} />
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              selectedCategory === 'ALL' ? 'bg-teal-200 text-teal-900' : 'bg-slate-100 text-slate-600'
            }`}>
              {criteria.length}
            </span>
          </div>
          <div className="text-xs font-bold">Todos los Factores</div>
          <div className={`text-[11px] ${selectedCategory === 'ALL' ? 'text-teal-700 font-medium' : 'text-slate-400'}`}>
            Matriz completa
          </div>
        </button>

        {factorWeights.map((fw) => {
          const count = criteria.filter((c) => c.category === fw.category).length;
          const isSelected = selectedCategory === fw.category;
          return (
            <button
              key={fw.category}
              onClick={() => setSelectedCategory(fw.category)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-teal-50 text-teal-900 border-teal-300 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50/80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={isSelected ? 'text-teal-600' : 'text-slate-500'}>
                  {getCategoryIcon(fw.category)}
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-teal-200 text-teal-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {fw.weightPercentage}%
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </div>
              </div>
              <div className="text-xs font-bold truncate text-slate-900">
                {fw.name.replace('Factor ', '')}
              </div>
              <div className={`text-[11px] truncate ${isSelected ? 'text-teal-700 font-medium' : 'text-slate-400'}`}>
                {fw.category}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        
        {/* Search & Filter Top Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar parámetro por código, nombre o normativa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">Nivel:</span>
            {(['ALL', 'BAJO', 'MEDIO', 'ALTO', 'CRITICO'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevelFilter(lvl)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  selectedLevelFilter === lvl
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {lvl === 'ALL' ? 'Todos' : lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">ID</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Nombre del Parámetro</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Categoría</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Umbral (0-100)</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Mitigador</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Base Legal</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Estado</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCriteria.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <AlertTriangle className="w-8 h-8 text-amber-500" />
                      <p className="text-sm font-medium text-slate-600">No se encontraron parámetros con los filtros seleccionados.</p>
                      <button
                        onClick={() => {
                          setSelectedCategory('ALL');
                          setSelectedLevelFilter('ALL');
                          setSearchTerm('');
                        }}
                        className="text-xs text-teal-600 hover:underline font-medium cursor-pointer"
                      >
                        Limpiar todos los filtros
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCriteria.map((item) => {
                  const percent = Math.round((item.score / 5) * 100);
                  const barColor = item.score >= 5 ? 'bg-rose-600' : item.score === 4 ? 'bg-rose-500' : item.score === 3 ? 'bg-amber-500' : 'bg-emerald-500';

                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-50/50 transition-colors ${!item.active ? 'opacity-50' : ''}`}
                    >
                      {/* ID */}
                      <td className="px-6 py-4 text-sm font-mono text-slate-500 font-bold whitespace-nowrap">
                        {item.code}
                      </td>

                      {/* Name & description */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-800">
                          {item.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 max-w-sm line-clamp-2">
                          {item.description}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5 font-medium">
                          {getCategoryIcon(item.category)}
                          <span>{item.category}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">{item.subgroup}</span>
                      </td>

                      {/* Umbral Score Bar (0-100) */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700">{percent} / 100</span>
                            <span className="text-[10px] text-slate-400 font-medium">Nivel {item.riskLevel}</span>
                          </div>
                          <div className="w-28 sm:w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${barColor}`} 
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Mitigation Factor */}
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                          x{item.mitigationFactor.toFixed(2)}
                        </span>
                      </td>

                      {/* Regulatory Base */}
                      <td className="px-6 py-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]" title={item.regulatoryBase}>
                            {item.regulatoryBase}
                          </span>
                        </div>
                      </td>

                      {/* Active Status Badge */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleActive(item.id)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                            item.active 
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {item.active ? 'Activo' : 'En Pausa'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditCriterion(item)}
                            className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors cursor-pointer"
                            title="Editar parámetro"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {onDeleteCriterion&&<button
                            onClick={() => void handleDeleteCriterion(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Eliminar parámetro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium shrink-0 bg-slate-50/50">
          <div>
            Mostrando {filteredCriteria.length} de {criteria.length} parámetros registrados
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-slate-400">Escala de 1 (Mínimo) a 5 (Crítico)</span>
          </div>
        </div>

      </div>

      {/* Info Footnote on Methodology */}
      <div className="bg-slate-100/90 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
        <Info className="w-5 h-5 text-cyan-800 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-800">
            Metodología de Ponderación Institucional IAFAS:
          </p>
          <p>
            El cálculo del perfil de riesgo de cada operación o apostador resulta de la sumatoria del valor de cada factor multiplicado por su peso porcentual: <code className="bg-white px-1.5 py-0.5 rounded border text-cyan-900 font-mono text-[11px]">Score Final = Σ (Puntaje Factor × Ponderación %)</code>. 
            El scoring se escala de 0 a 100 puntos y determina la obligación inmediata de aplicar Debida Diligencia Simplificada (0-35), Estándar (36-70) o Reforzada (71-100) según lo dispuesto en el Manual de Prevención PLA/FT de IAFAS y las resoluciones de la Unidad de Información Financiera (UIF).
          </p>
        </div>
      </div>

    </div>
  );
};
