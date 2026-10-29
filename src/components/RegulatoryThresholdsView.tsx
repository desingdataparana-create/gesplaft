import React, { useState } from 'react';
import { RegulatoryThreshold } from '../types';
import { 
  Scale, 
  Edit3, 
  Save, 
  Check, 
  FileText, 
  AlertCircle, 
  DollarSign, 
  Calendar,
  ExternalLink,
  BookOpen,
  Download,
  FileCode,
  FileSpreadsheet,
  ChevronDown
} from 'lucide-react';
import { 
  generateThresholdsXML, 
  generateThresholdsXLS, 
  generateThresholdsCSV, 
  downloadFile 
} from '../utils/exportUtils';

interface RegulatoryThresholdsViewProps {
  thresholds: RegulatoryThreshold[];
  onUpdateThresholds: (thresholds: RegulatoryThreshold[]) => void;
  onOpenExportModal?: (initialType?: 'EXPEDIENTES' | 'PARAMETROS' | 'UMBRALES' | 'ESTADISTICAS') => void;
}

export const RegulatoryThresholdsView: React.FC<RegulatoryThresholdsViewProps> = ({
  thresholds,
  onUpdateThresholds,
  onOpenExportModal,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [savedMsg, setSavedMsg] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const startEdit = (t: RegulatoryThreshold) => {
    setEditingId(t.id);
    setEditAmount(t.amountARS);
  };

  const saveEdit = (id: string) => {
    const updated = thresholds.map((t) =>
      t.id === id ? { ...t, amountARS: editAmount, lastUpdated: new Date().toISOString().slice(0, 10) } : t
    );
    onUpdateThresholds(updated);
    setEditingId(null);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  const handleExport = (format: 'XML' | 'XLS' | 'CSV') => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    if (format === 'XML') {
      const filename = `IAFAS_Umbrales_Regulatorios_${timestamp}.xml`;
      const xml = generateThresholdsXML(thresholds);
      downloadFile(xml, filename, 'application/xml;charset=utf-8;');
    } else if (format === 'XLS') {
      const filename = `IAFAS_Umbrales_Regulatorios_${timestamp}.xls`;
      const xls = generateThresholdsXLS(thresholds);
      downloadFile(xls, filename, 'application/vnd.ms-excel;charset=utf-8;');
    } else if (format === 'CSV') {
      const filename = `IAFAS_Umbrales_Regulatorios_${timestamp}.csv`;
      const csv = generateThresholdsCSV(thresholds);
      downloadFile(csv, filename, 'text/csv;charset=utf-8;');
    }

    setShowExportMenu(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 shrink-0">
        <div>
          <p className="text-sm text-slate-500 font-medium">Marco Legal & Parámetros Cuantitativos • UIF & IAFAS</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Umbrales Regulatorios y Normativa PLA/FT
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {savedMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <Check className="w-4 h-4 text-emerald-600" /> Umbral actualizado correctamente
            </div>
          )}

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2.5 rounded-xl font-medium text-xs border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Exportar umbrales normativos"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Exportar Umbrales</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-40 animate-fadeIn text-xs">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Exportar {thresholds.length} umbrales
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
                {onOpenExportModal && (
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        onOpenExportModal('UMBRALES');
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
        </div>
      </div>

      {/* Threshold Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {thresholds.map((item) => {
          const isEditing = editingId === item.id;
          return (
            <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                    {item.code}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {item.periodicity.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Amount Display & Edit */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monto Vigente:</span>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(Number(e.target.value))}
                        className="w-36 p-1.5 text-sm font-mono font-bold bg-white border border-teal-500 rounded-lg focus:ring-2 focus:ring-teal-500 text-right focus:outline-none"
                      />
                      <button
                        onClick={() => saveEdit(item.id)}
                        className="p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 cursor-pointer shadow-sm"
                        title="Guardar nuevo monto"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xl font-extrabold text-slate-900">
                        $ {item.amountARS.toLocaleString('es-AR')}
                      </span>
                      <button
                        onClick={() => startEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                        title="Modificar umbral"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-600 font-medium pt-2 border-t border-slate-200/70">
                  <strong className="text-slate-700">Acción Requerida:</strong> {item.actionRequired}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                <span className="flex items-center gap-1 font-medium">
                  <FileText className="w-3 h-3 text-slate-400" />
                  {item.regulationSource}
                </span>
                <span>Act: {item.lastUpdated}</span>
              </div>

            </div>
          );
        })}
      </div>

      {/* Normative References Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-teal-600" />
          Compendio de Normas Aplicables a IAFAS (Entre Ríos)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 space-y-1.5">
            <div className="font-bold text-slate-900">Resolución UIF N° 194/2023</div>
            <p className="text-slate-500 leading-relaxed">
              Reglamentación del sector de Explotación de Juegos de Azar como Sujetos Obligados ante la UIF. Enfoque Basado en Riesgo (EBR).
            </p>
          </div>

          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 space-y-1.5">
            <div className="font-bold text-slate-900">Resolución UIF N° 35/2023</div>
            <p className="text-slate-500 leading-relaxed">
              Régimen de Personas Expuestas Políticamente (PEP). Definición de categorías, parientes cercanos y medidas de debida diligencia reforzada.
            </p>
          </div>

          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 space-y-1.5">
            <div className="font-bold text-slate-900">Manual de PLA/FT IAFAS (v3.4)</div>
            <p className="text-slate-500 leading-relaxed">
              Procedimientos internos para salas de casino, agencias oficiales de Entre Ríos, tómbola, quini 6 y plataforma online.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
