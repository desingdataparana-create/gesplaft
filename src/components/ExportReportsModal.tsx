import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Download, 
  FileCode, 
  FileSpreadsheet, 
  FileText, 
  Calendar, 
  Filter, 
  Check, 
  CheckCircle2, 
  TrendingUp, 
  ShieldAlert, 
  Building2, 
  UserCheck, 
  FileDown, 
  Sparkles,
  ArrowRight,
  Layers
} from 'lucide-react';
import { EvaluationRecord, RiskCriterion, FactorWeight, RegulatoryThreshold, RiskLevel, OrganizationSettings } from '../types';
import { 
  filterRecordsByPeriod, 
  generateRecordsXML, 
  generateRecordsXLS, 
  generateRecordsCSV,
  generateCriteriaXML,
  generateCriteriaXLS,
  generateCriteriaCSV,
  generateThresholdsXML,
  generateThresholdsXLS,
  generateThresholdsCSV,
  downloadFile
} from '../utils/exportUtils';

interface ExportReportsModalProps {
  organization:OrganizationSettings;
  isOpen: boolean;
  onClose: () => void;
  records: EvaluationRecord[];
  criteria: RiskCriterion[];
  factorWeights: FactorWeight[];
  thresholds: RegulatoryThreshold[];
  initialReportType?: 'EXPEDIENTES' | 'PARAMETROS' | 'UMBRALES' | 'ESTADISTICAS';
}

export const ExportReportsModal: React.FC<ExportReportsModalProps> = ({
  organization,
  isOpen,
  onClose,
  records,
  criteria,
  factorWeights,
  thresholds,
  initialReportType = 'EXPEDIENTES'
}) => {
  const [reportType, setReportType] = useState<'EXPEDIENTES' | 'PARAMETROS' | 'UMBRALES' | 'ESTADISTICAS'>(initialReportType);

  useEffect(()=>{if(isOpen){setReportType(initialReportType);setLastExported(null);}},[isOpen,initialReportType]);

  // Period / Date filters
  const [periodPreset, setPeriodPreset] = useState<string>('TODO');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Additional filters for records
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [pepFilter, setPepFilter] = useState<string>('ALL'); // ALL, PEP_ONLY, NON_PEP
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');

  // Success download feedback
  const [lastExported, setLastExported] = useState<{ format: string; filename: string } | null>(null);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.locationDepartment) set.add(r.locationDepartment);
    });
    return Array.from(set).sort();
  }, [records]);

  // Handle period preset change
  const handlePresetChange = (preset: string) => {
    setPeriodPreset(preset);
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().slice(0, 10);

    if (preset === 'TODO') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'HOY') {
      const todayStr = formatDate(today);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7_DIAS') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(formatDate(d));
      setEndDate(formatDate(today));
    } else if (preset === '30_DIAS') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(formatDate(d));
      setEndDate(formatDate(today));
    } else if (preset === 'MES_ACTUAL') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(lastDay));
    } else if (preset === 'TRIMESTRE_ACTUAL') {
      const currentQuarter = Math.floor(today.getMonth() / 3);
      const firstDay = new Date(today.getFullYear(), currentQuarter * 3, 1);
      const lastDay = new Date(today.getFullYear(), (currentQuarter + 1) * 3, 0);
      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(lastDay));
    } else if (preset === 'ANIO_ACTUAL') {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      const lastDay = new Date(today.getFullYear(), 11, 31);
      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(lastDay));
    }
  };

  // Filtered records based on active options
  const filteredRecords = useMemo(() => {
    const pepOnly = pepFilter === 'PEP_ONLY' ? true : pepFilter === 'NON_PEP' ? false : null;
    return filterRecordsByPeriod(records, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      riskLevel: riskFilter,
      status: statusFilter,
      pepOnly,
      department: departmentFilter
    });
  }, [records, startDate, endDate, riskFilter, statusFilter, pepFilter, departmentFilter]);

  // Total amount in filtered records
  const totalFilteredAmount = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + (r.amountARS || 0), 0);
  }, [filteredRecords]);

  // Risk breakdown
  const riskCounts = useMemo(() => {
    return {
      CRITICO: filteredRecords.filter(r => r.riskLevel === 'CRITICO').length,
      ALTO: filteredRecords.filter(r => r.riskLevel === 'ALTO').length,
      MEDIO: filteredRecords.filter(r => r.riskLevel === 'MEDIO').length,
      BAJO: filteredRecords.filter(r => r.riskLevel === 'BAJO').length,
    };
  }, [filteredRecords]);

  if (!isOpen) return null;

  // Format date range string for filename
  const getDateRangeTag = () => {
    if (startDate && endDate) {
      return `${startDate}_al_${endDate}`;
    } else if (startDate) {
      return `desde_${startDate}`;
    } else if (endDate) {
      return `hasta_${endDate}`;
    }
    return 'Historico_Completo';
  };

  // Export handlers
  const handleExportXML = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const rangeTag = getDateRangeTag();

    if (reportType === 'EXPEDIENTES' || reportType === 'ESTADISTICAS') {
      const filename = `Reporte_Expedientes_PLAFT_${rangeTag}_${timestamp}.xml`;
      const xml = generateRecordsXML(filteredRecords, criteria, {
        title: 'Reporte de Evaluaciones y Monitoreo de Riesgo PLA/FT',
        generatedAt: new Date().toLocaleString('es-AR'),
        generatedBy: organization.shortName,
        startDate: startDate || 'Inicio Histórico',
        endDate: endDate || 'Actualidad',
        totalRecords: filteredRecords.length,
        totalAmountARS: totalFilteredAmount
      });
      downloadFile(xml, filename, 'application/xml;charset=utf-8;');
      setLastExported({ format: 'XML', filename });
    } else if (reportType === 'PARAMETROS') {
      const filename = `Catalogo_Parametros_Riesgo_${timestamp}.xml`;
      const xml = generateCriteriaXML(criteria, factorWeights);
      downloadFile(xml, filename, 'application/xml;charset=utf-8;');
      setLastExported({ format: 'XML', filename });
    } else if (reportType === 'UMBRALES') {
      const filename = `Umbrales_Regulatorios_UIF_${timestamp}.xml`;
      const xml = generateThresholdsXML(thresholds);
      downloadFile(xml, filename, 'application/xml;charset=utf-8;');
      setLastExported({ format: 'XML', filename });
    }
  };

  const handleExportXLS = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const rangeTag = getDateRangeTag();

    if (reportType === 'EXPEDIENTES' || reportType === 'ESTADISTICAS') {
      const filename = `Reporte_Expedientes_PLAFT_${rangeTag}_${timestamp}.xls`;
      const xls = generateRecordsXLS(filteredRecords, {
        title: 'Reporte de Evaluaciones y Monitoreo de Riesgo PLA/FT',
        generatedAt: new Date().toLocaleString('es-AR'),
        generatedBy: organization.shortName,
        startDate: startDate || 'Inicio Histórico',
        endDate: endDate || 'Actualidad',
        totalRecords: filteredRecords.length,
        totalAmountARS: totalFilteredAmount
      });
      downloadFile(xls, filename, 'application/vnd.ms-excel;charset=utf-8;');
      setLastExported({ format: 'XLS (Excel)', filename });
    } else if (reportType === 'PARAMETROS') {
      const filename = `Catalogo_Parametros_Riesgo_${timestamp}.xls`;
      const xls = generateCriteriaXLS(criteria, factorWeights);
      downloadFile(xls, filename, 'application/vnd.ms-excel;charset=utf-8;');
      setLastExported({ format: 'XLS (Excel)', filename });
    } else if (reportType === 'UMBRALES') {
      const filename = `Umbrales_Regulatorios_UIF_${timestamp}.xls`;
      const xls = generateThresholdsXLS(thresholds);
      downloadFile(xls, filename, 'application/vnd.ms-excel;charset=utf-8;');
      setLastExported({ format: 'XLS (Excel)', filename });
    }
  };

  const handleExportCSV = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const rangeTag = getDateRangeTag();

    if (reportType === 'EXPEDIENTES' || reportType === 'ESTADISTICAS') {
      const filename = `Reporte_Expedientes_PLAFT_${rangeTag}_${timestamp}.csv`;
      const csv = generateRecordsCSV(filteredRecords);
      downloadFile(csv, filename, 'text/csv;charset=utf-8;');
      setLastExported({ format: 'CSV', filename });
    } else if (reportType === 'PARAMETROS') {
      const filename = `Catalogo_Parametros_Riesgo_${timestamp}.csv`;
      const csv = generateCriteriaCSV(criteria);
      downloadFile(csv, filename, 'text/csv;charset=utf-8;');
      setLastExported({ format: 'CSV', filename });
    } else if (reportType === 'UMBRALES') {
      const filename = `Umbrales_Regulatorios_UIF_${timestamp}.csv`;
      const csv = generateThresholdsCSV(thresholds);
      downloadFile(csv, filename, 'text/csv;charset=utf-8;');
      setLastExported({ format: 'CSV', filename });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Centro de Exportación de Reportes PLA/FT
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
                  XML • XLS • CSV
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Generación y descarga de informes auditables por fechas y períodos conforme a Res. UIF 194/2023
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          
          {/* Success Banner */}
          {lastExported && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3.5 rounded-2xl flex items-center justify-between animate-fadeIn text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Archivo generado con éxito: <strong className="font-mono text-emerald-800">{lastExported.filename}</strong> en formato <strong>{lastExported.format}</strong>.
                </span>
              </div>
              <button
                onClick={() => setLastExported(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold underline ml-3 cursor-pointer"
              >
                Descartar
              </button>
            </div>
          )}

          {/* 1. Report Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              1. Seleccione el Tipo de Reporte
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              
              <button
                type="button"
                onClick={() => setReportType('EXPEDIENTES')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  reportType === 'EXPEDIENTES'
                    ? 'bg-teal-50/70 border-teal-400 shadow-sm ring-1 ring-teal-300'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-bold ${reportType === 'EXPEDIENTES' ? 'text-teal-800' : 'text-slate-800'}`}>
                    Expedientes & Evaluaciones
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                    {records.length} reg.
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  Detalle operativo, apostadores, scoring ponderado, alertas, PEP, debida diligencia y montos.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setReportType('PARAMETROS')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  reportType === 'PARAMETROS'
                    ? 'bg-teal-50/70 border-teal-400 shadow-sm ring-1 ring-teal-300'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-bold ${reportType === 'PARAMETROS' ? 'text-teal-800' : 'text-slate-800'}`}>
                    Catálogo de Parámetros EBR
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                    {criteria.length} param.
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  Variables de los 5 factores (Cliente, Producto, Canal, Geografía, Operacional) y mitigadores.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setReportType('UMBRALES')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  reportType === 'UMBRALES'
                    ? 'bg-teal-50/70 border-teal-400 shadow-sm ring-1 ring-teal-300'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-bold ${reportType === 'UMBRALES' ? 'text-teal-800' : 'text-slate-800'}`}>
                    Umbrales Regulatorios UIF
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                    {thresholds.length} umbrales
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  Límites dinerarios vigentes de identificación, DJOF, alerta ROS y normas aplicables.
                </p>
              </button>

            </div>
          </div>

          {/* 2. Period & Date Range Filter (Crucial for Expedientes) */}
          {(reportType === 'EXPEDIENTES' || reportType === 'ESTADISTICAS') && (
            <div className="bg-white p-4.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    2. Período y Rango de Fechas
                  </label>
                </div>
                <span className="text-[11px] text-slate-400">
                  Filtro temporal por fecha de evaluación
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'TODO', label: 'Todo el Histórico' },
                  { id: 'HOY', label: 'Hoy' },
                  { id: '7_DIAS', label: 'Últimos 7 días' },
                  { id: '30_DIAS', label: 'Últimos 30 días' },
                  { id: 'MES_ACTUAL', label: 'Mes Actual' },
                  { id: 'TRIMESTRE_ACTUAL', label: 'Trimestre Actual' },
                  { id: 'ANIO_ACTUAL', label: 'Año 2026' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetChange(preset.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      periodPreset === preset.id
                        ? 'bg-teal-600 text-white shadow-xs font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Explicit Date Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Fecha Desde (Inicio)
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPeriodPreset('CUSTOM');
                    }}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Fecha Hasta (Fin)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPeriodPreset('CUSTOM');
                    }}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Additional Dimensional Filters */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Filtros de Segmentación Adicionales
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  
                  {/* Risk Level */}
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1">Nivel de Riesgo</label>
                    <select
                      value={riskFilter}
                      onChange={(e) => setRiskFilter(e.target.value)}
                      className="w-full p-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none font-medium"
                    >
                      <option value="ALL">Todos los Riesgos</option>
                      <option value="CRITICO">Crítico</option>
                      <option value="ALTO">Alto</option>
                      <option value="MEDIO">Medio</option>
                      <option value="BAJO">Bajo</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1">Estado Expediente</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full p-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none font-medium"
                    >
                      <option value="ALL">Todos los Estados</option>
                      <option value="PENDIENTE">Pendientes</option>
                      <option value="EN_ANALISIS">En Análisis</option>
                      <option value="JUSTIFICADO">Justificados</option>
                      <option value="ALERTA_EMITIDA">Alerta Emitida</option>
                      <option value="REPORTE_ROS">Reporte ROS</option>
                    </select>
                  </div>

                  {/* PEP */}
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1">Condición PEP</label>
                    <select
                      value={pepFilter}
                      onChange={(e) => setPepFilter(e.target.value)}
                      className="w-full p-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none font-medium"
                    >
                      <option value="ALL">Todos los Sujetos</option>
                      <option value="PEP_ONLY">Solo Sujetos PEP</option>
                      <option value="NON_PEP">Sin Calidad PEP</option>
                    </select>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1">Departamento</label>
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="w-full p-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none font-medium"
                    >
                      <option value="ALL">Todos los Dptos.</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* 3. Live Preview & Statistics of Filtered Result */}
          {(reportType === 'EXPEDIENTES' || reportType === 'ESTADISTICAS') && (
            <div className="bg-white p-4.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    3. Resumen del Informe a Exportar
                  </span>
                  <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {filteredRecords.length} expedientes
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-700 font-mono">
                  Monto Auditado: <span className="font-bold text-slate-900">$ {totalFilteredAmount.toLocaleString('es-AR')}</span>
                </div>
              </div>

              {/* Metric Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-xl flex items-center justify-between">
                  <span className="font-semibold text-rose-800">Críticos</span>
                  <span className="font-bold font-mono text-rose-900">{riskCounts.CRITICO}</span>
                </div>
                <div className="p-2.5 bg-orange-50/70 border border-orange-200 rounded-xl flex items-center justify-between">
                  <span className="font-semibold text-orange-800">Altos</span>
                  <span className="font-bold font-mono text-orange-900">{riskCounts.ALTO}</span>
                </div>
                <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                  <span className="font-semibold text-amber-800">Medios</span>
                  <span className="font-bold font-mono text-amber-900">{riskCounts.MEDIO}</span>
                </div>
                <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <span className="font-semibold text-emerald-800">Bajos</span>
                  <span className="font-bold font-mono text-emerald-900">{riskCounts.BAJO}</span>
                </div>
              </div>

              {/* Sample Rows Table Preview */}
              {filteredRecords.length > 0 ? (
                <div className="border border-slate-100 rounded-xl overflow-hidden mt-2">
                  <div className="text-[10px] font-bold uppercase text-slate-400 bg-slate-50 px-3 py-1.5 border-b border-slate-100">
                    Vista previa de registros (primeros {Math.min(filteredRecords.length, 3)})
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {filteredRecords.slice(0, 3).map((r) => (
                      <div key={r.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-teal-800">{r.dossierNumber}</span>
                            <span className="text-slate-400">•</span>
                            <span className="font-semibold text-slate-800">{r.subjectName}</span>
                            {r.pepStatus && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                                PEP
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {r.locationDepartment} • {r.channelName} • {r.timestamp.slice(0, 10)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-slate-900">$ {r.amountARS.toLocaleString('es-AR')}</div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            r.riskLevel === 'CRITICO' ? 'bg-rose-100 text-rose-800' :
                            r.riskLevel === 'ALTO' ? 'bg-orange-100 text-orange-800' :
                            r.riskLevel === 'MEDIO' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {r.riskLevel} ({r.weightedScore})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-800">
                  No se encontraron registros para el período o filtros seleccionados. Pruebe ampliando el rango de fechas.
                </div>
              )}
            </div>
          )}

          {/* 4. Format Selection & Download Buttons */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              {reportType === 'EXPEDIENTES' || reportType === 'ESTADISTICAS' ? '4.' : '2.'} Descargar en el Formato Deseado
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* XML Format Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      .XML
                    </span>
                    <FileCode className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Extensible Markup Language</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Estructura normalizada con etiquetas institucionales y esquema para interoperabilidad y auditoría.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportXML}
                  disabled={reportType === 'EXPEDIENTES' && filteredRecords.length === 0}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <FileDown className="w-4 h-4" />
                  Exportar XML
                </button>
              </div>

              {/* XLS (Excel) Format Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-bold text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      .XLS (Excel)
                    </span>
                    <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Planilla Microsoft Excel</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Libro con estilos visuales, colores por nivel de riesgo, formato de moneda ARS y hoja de resumen.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportXLS}
                  disabled={reportType === 'EXPEDIENTES' && filteredRecords.length === 0}
                  className="w-full py-2 px-3 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-200 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <FileDown className="w-4 h-4" />
                  Exportar XLS
                </button>
              </div>

              {/* CSV Format Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-bold text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      .CSV
                    </span>
                    <FileText className="w-4 h-4 text-purple-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Valores Separados por Coma</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Formato estándar delimitado con codificación UTF-8 BOM, ideal para Power BI, Python y bases de datos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={reportType === 'EXPEDIENTES' && filteredRecords.length === 0}
                  className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <FileDown className="w-4 h-4" />
                  Exportar CSV
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400">
            {organization.shortName} · {organization.area}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
