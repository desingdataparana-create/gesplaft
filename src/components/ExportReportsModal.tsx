import React,{useMemo,useState} from 'react';
import {X,Download} from 'lucide-react';
import type {EvaluationRecord,RiskCriterion,FactorWeight,RegulatoryThreshold,OrganizationSettings} from '../types';
import {filterRecordsByPeriod,generateRecordsXLS,generateRecordsCSV,generateCriteriaXLS,generateCriteriaCSV,generateThresholdsXLS,generateThresholdsCSV,downloadFile} from '../utils/exportUtils';

interface Props{organization:OrganizationSettings;isOpen:boolean;onClose:()=>void;records:EvaluationRecord[];criteria:RiskCriterion[];factorWeights:FactorWeight[];thresholds:RegulatoryThreshold[];initialReportType?:string}

const iso=(d:Date)=>d.toISOString().slice(0,10);
function range(period:string):{start:string;end:string}{
  const t=new Date(),y=t.getFullYear(),m=t.getMonth();
  if(period==='MES')return {start:iso(new Date(y,m,1)),end:iso(new Date(y,m+1,0))};
  if(period==='MES_ANTERIOR')return {start:iso(new Date(y,m-1,1)),end:iso(new Date(y,m,0))};
  if(period==='ANIO')return {start:iso(new Date(y,0,1)),end:iso(new Date(y,11,31))};
  return {start:'',end:''};
}

export function ExportReportsModal({organization,isOpen,onClose,records,criteria,factorWeights,thresholds}:Props){
  const [period,setPeriod]=useState('MES'),[from,setFrom]=useState(''),[to,setTo]=useState(''),[risk,setRisk]=useState('ALL'),[status,setStatus]=useState('ALL'),[done,setDone]=useState('');
  const {start,end}=period==='PERSONALIZADO'?{start:from,end:to}:range(period);
  const rows=useMemo(()=>filterRecordsByPeriod(records,{startDate:start||undefined,endDate:end||undefined,riskLevel:risk,status,pepOnly:null,department:'ALL'}),[records,start,end,risk,status]);
  if(!isOpen)return null;
  const total=rows.reduce((s,r)=>s+(r.amountARS||0),0),stamp=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
  const meta={title:'Reporte de Evaluaciones y Monitoreo de Riesgo PLA/FT',generatedAt:new Date().toLocaleString('es-AR'),generatedBy:organization.shortName,startDate:start||'Inicio histórico',endDate:end||'Actualidad',totalRecords:rows.length,totalAmountARS:total};
  const save=(content:string,name:string,type:string)=>{downloadFile(content,name,type);setDone(name)};
  const xls='application/vnd.ms-excel;charset=utf-8;',csv='text/csv;charset=utf-8;';
  const sel='w-full p-3 border border-slate-300 rounded-lg bg-white text-sm';
  const link='text-teal-800 font-semibold underline underline-offset-2';
  return <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-3 overflow-y-auto"><div role="dialog" aria-modal="true" aria-label="Informes" className="bg-white rounded-xl w-full max-w-xl max-h-[94vh] flex flex-col">
    <header className="p-5 border-b border-slate-100 flex justify-between items-start"><div><h2 className="font-semibold text-lg">Informes</h2><p className="text-sm text-slate-500 mt-1">Descargá el listado de expedientes para presentarlo o analizarlo.</p></div><button type="button" onClick={onClose} aria-label="Cerrar informes"><X size={18}/></button></header>
    <div className="overflow-y-auto p-5 space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="field-label">Período<select className={sel} value={period} onChange={e=>setPeriod(e.target.value)}><option value="MES">Este mes</option><option value="MES_ANTERIOR">Mes anterior</option><option value="ANIO">Este año</option><option value="TODO">Todo el historial</option><option value="PERSONALIZADO">Elegir fechas…</option></select></label>
        <label className="field-label">Riesgo<select className={sel} value={risk} onChange={e=>setRisk(e.target.value)}><option value="ALL">Todos</option><option value="CRITICO">Crítico</option><option value="ALTO">Alto</option><option value="MEDIO">Medio</option><option value="BAJO">Bajo</option></select></label>
        <label className="field-label">Estado<select className={sel} value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">Todos</option><option value="PENDIENTE">Pendiente</option><option value="EN_ANALISIS">En análisis</option><option value="JUSTIFICADO">Justificado</option><option value="REPORTE_ROS">Reporte ROS</option></select></label>
      </div>
      {period==='PERSONALIZADO'&&<div className="grid sm:grid-cols-2 gap-3"><label className="field-label">Desde<input type="date" className={sel} value={from} max={to||undefined} onChange={e=>setFrom(e.target.value)}/></label><label className="field-label">Hasta<input type="date" className={sel} value={to} min={from||undefined} onChange={e=>setTo(e.target.value)}/></label></div>}
      <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3"><strong>{rows.length}</strong> {rows.length===1?'expediente':'expedientes'} · ${total.toLocaleString('es-AR')}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!rows.length} className="button-primary inline-flex items-center gap-2" onClick={()=>save(generateRecordsXLS(rows,meta),`Expedientes_${stamp}.xls`,xls)}><Download size={16}/>Descargar Excel</button>
        <button type="button" disabled={!rows.length} className="button-secondary" onClick={()=>save(generateRecordsCSV(rows),`Expedientes_${stamp}.csv`,csv)}>Descargar CSV</button>
      </div>
      {done&&<p role="status" className="text-sm text-emerald-800">Archivo generado: {done}</p>}
      <details className="border-t border-slate-100 pt-3 text-sm"><summary className="cursor-pointer font-semibold text-teal-800">Otros informes: parámetros y umbrales</summary>
        <div className="mt-3 space-y-2"><p>Parámetros de riesgo ({criteria.length}): <button type="button" className={link} onClick={()=>save(generateCriteriaXLS(criteria,factorWeights),`Parametros_${stamp}.xls`,xls)}>Excel</button> · <button type="button" className={link} onClick={()=>save(generateCriteriaCSV(criteria),`Parametros_${stamp}.csv`,csv)}>CSV</button></p>
        <p>Umbrales regulatorios ({thresholds.length}): <button type="button" className={link} onClick={()=>save(generateThresholdsXLS(thresholds),`Umbrales_${stamp}.xls`,xls)}>Excel</button> · <button type="button" className={link} onClick={()=>save(generateThresholdsCSV(thresholds),`Umbrales_${stamp}.csv`,csv)}>CSV</button></p></div></details>
    </div>
  </div></div>;
}
