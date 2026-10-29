import React from 'react';
import { EvaluationRecord, RiskCriterion, OrganizationSettings } from '../types';
import { 
  X, 
  Printer, 
  FileText, 
  Building2, 
  User, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Scale,
  Award
} from 'lucide-react';

interface RiskDossierModalProps {
  organization:OrganizationSettings;
  record: EvaluationRecord | null;
  criteria: RiskCriterion[];
  onClose: () => void;
  onAnalyze?: (record:EvaluationRecord)=>void;
}

export const RiskDossierModal: React.FC<RiskDossierModalProps> = ({
  organization,
  record,
  criteria,
  onClose,
  onAnalyze,
}) => {
  if (!record) return null;

  const selectedCriteriaObjs = (record.criteriaSnapshot||criteria).filter((c) => record.selectedCriteriaIds.includes(c.id));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Ficha del expediente" data-dossier className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[92vh] my-auto print:max-h-none print:border-none print:shadow-none print:my-0">
        
        {/* Modal Action Bar (Sticky, Hidden on print) */}
        <div className="bg-white border-b border-slate-100 px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-900">
            <FileText className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="truncate">Ficha Oficial de Evaluación PLA/FT ({record.dossierNumber})</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {onAnalyze&&<button className="button-secondary" onClick={()=>onAnalyze(record)}>Analizar</button>}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Cerrar ficha"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body with internal scroll */}
        <div className="p-4 sm:p-6 md:p-8 space-y-6 text-slate-800 text-xs sm:text-sm overflow-y-auto flex-1 print:overflow-visible print:p-0">
          
          {/* Institutional Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide">
                {organization.logo&&<img src={organization.logo} alt="Logo de la organización" className="h-12 max-w-40 object-contain mb-3"/>}
                {organization.shortName} · {organization.legalName}
              </div>
              <div className="text-xs font-semibold text-slate-600">
                {[organization.taxId&&`CUIT ${organization.taxId}`,organization.address].filter(Boolean).join(' · ')}
              </div>
              <div className="text-[11px] sm:text-xs text-slate-500 font-medium">
                {organization.area}
                <div className="text-[11px]">{[organization.email,organization.phone,organization.website].filter(Boolean).join(' · ')}</div>
              </div>
            </div>

            <div className="sm:text-right font-mono text-xs border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
              <div className="font-extrabold text-slate-900 text-sm sm:text-base">{record.dossierNumber}</div>
              <div className="text-slate-500">Registro: {new Date(record.timestamp).toLocaleString('es-AR')}</div>
              <div className="text-slate-500">Operación: {new Date(record.operationAt||record.timestamp).toLocaleString('es-AR')}</div>
            </div>
          </div>

          {/* Section: Subject Information */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider border-b border-slate-200 pb-1.5">
              1. Identificación del Sujeto Evaluado y Operación
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Sujeto / Denominación:</span>
                <strong className="text-slate-900 font-bold text-sm sm:text-xs">{record.subjectName}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">CUIT / CUIL / DNI:</span>
                <strong className="text-slate-900 font-mono font-bold">{record.taxId}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Condición PEP en esta operación:</span>
                <strong className={`font-bold ${record.pepStatus ? 'text-amber-800' : 'text-slate-700'}`}>
                  {record.pepStatus ? `SÍ (PEP: ${record.pepDetails || 'Declarado'})` : 'NO PEP'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Actividad Declarada:</span>
                <strong className="text-slate-900">{record.activityOcupation}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Operación / Monto:</span>
                <strong className="text-slate-900 font-mono font-bold">
                  {record.operationType.replace('_', ' ')} - $ {record.amountARS.toLocaleString('es-AR')}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Canal / Sala / Dpto:</span>
                <strong className="text-slate-900">{record.channelName} ({record.locationDepartment})</strong>
              </div>
              {([['Dirección',record.address],['Correo electrónico',record.email],['Teléfono',record.phone]] as const).map(([label,value])=><div key={label}><span className="text-slate-500 block">{label}:</span><strong className="text-slate-900 break-words">{value || 'No registrado en esta evaluación'}</strong></div>)}
            </div>
          </div>

          {/* Section: Matrix Parameters Evaluated (Responsive table) */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider border-b border-slate-200 pb-1.5">
              2. Parámetros de Riesgo Imputados por la Matriz
            </h4>

            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 w-20">Código</th>
                    <th className="p-2.5 w-28">Factor</th>
                    <th className="p-2.5">Variable / Descripción</th>
                    <th className="p-2.5 text-center w-20">Puntaje</th>
                    <th className="p-2.5 text-center w-20">Nivel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedCriteriaObjs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                        Sin parámetros específicos imputados.
                      </td>
                    </tr>
                  ) : (
                    selectedCriteriaObjs.map((item) => (
                      <tr key={item.id}>
                        <td className="p-2.5 font-mono font-bold text-teal-800">{item.code}</td>
                        <td className="p-2.5 font-semibold text-slate-700">{item.category}</td>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[11px] text-slate-500">{item.regulatoryBase}</div>
                        </td>
                        <td className="p-2.5 text-center font-bold">{item.score}/5</td>
                        <td className="p-2.5 text-center font-bold">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            item.riskLevel === 'CRITICO' ? 'bg-rose-100 text-rose-800' :
                            item.riskLevel === 'ALTO' ? 'bg-orange-100 text-orange-800' :
                            item.riskLevel === 'MEDIO' ? 'bg-amber-100 text-amber-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {item.riskLevel}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Calculated Scoring & Regulatory Measures */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 sm:p-5 bg-slate-900 text-white rounded-2xl space-y-2">
              <div className="text-[11px] text-slate-400 font-bold uppercase">Dictamen de Riesgo</div>
              <div className="text-3xl sm:text-4xl font-black font-mono">
                {record.weightedScore} <span className="text-sm text-slate-400">/ 100</span>
              </div>
              <div className="text-xs font-bold text-teal-300">
                Nivel Asignado: RIESGO {record.riskLevel}
              </div>
              <div className="text-[11px] text-slate-300">
                Debida Diligencia Exigible: <strong>{record.dueDiligenceLevel}</strong>
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 flex flex-col justify-between">
              <div>
                <div className="text-[11px] text-slate-500 font-bold uppercase">Medidas Obligatorias</div>
                <div className="text-xs space-y-1.5 text-slate-700 mt-2">
                  <div>• DJOF Requerida: <strong>{record.requiresDJOF ? 'SÍ (Con certificación)' : 'NO'}</strong></div>
                  <div>• Legajo Documental: <strong>{record.requiresDocumentation ? 'SÍ' : 'NO'}</strong></div>
                  <div>• Estado Actual: <strong>{record.status}</strong></div>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-200">
                Registro de evaluación PLA/FT
              </div>
            </div>
          </div>

          {/* Observations & Notes */}
          {record.notes && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <span className="font-bold text-slate-700">Observaciones del Auditor:</span>
              <p className="text-slate-600 leading-relaxed">{record.notes}</p>
            </div>
          )}

          {record.profileAssessment&&<section className="surface p-4 space-y-2 text-xs"><h4 className="font-semibold">Perfil considerado al cargar la operación</h4><p>{record.profileAssessment.profileSummary||'Sin información suficiente al momento de la carga'}</p><p>Comparación: {record.profileAssessment.comparison}</p><p>{record.profileAssessment.comparisonReason}</p><p>Origen declarado: {record.profileAssessment.originDeclared||'Pendiente'}</p><p>Destino declarado: {record.profileAssessment.destinationDeclared||'Pendiente'}</p></section>}
          {record.analysis&&<section className="surface p-4 space-y-2 text-xs"><h4 className="font-semibold">Análisis documentado</h4><p>{record.analysis.classification} · {new Date(record.analysis.reviewedAt).toLocaleString('es-AR')} · {record.analysis.analyst}</p><p>{record.analysis.profileSummary}</p><p>Inusualidad: {record.analysis.unusualType||'No consignada'}</p><p>Documentación solicitada: {record.analysis.documentationRequested||'No consignada'}</p><p>Documentación revisada: {record.analysis.documentationReviewed||'No consignada'}</p><p>Origen y destino: {record.analysis.fundsAssessment||'No consignado'}</p><p>Beneficiario final: {record.analysis.beneficialOwner||'No consignado'}</p><p className="font-medium">Decisión: {record.analysis.reasoning}</p>{record.status==='REPORTE_ROS'&&<p>ROS registrado: {record.analysis.rosReference} · {record.analysis.rosSubmittedAt}</p>}</section>}
          {/* Signatures & Seal Block */}
          <div className="pt-6 sm:pt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 text-center text-xs">
            <div className="border-t border-slate-300 pt-2 space-y-0.5">
              <div className="font-bold text-slate-900">{record.evaluator}</div>
              <div className="text-slate-500">{record.evaluatorRole}</div>
              <div className="text-[10px] text-slate-400">{organization.shortName} · {organization.area}</div>
            </div>

            <div className="border-t border-slate-300 pt-2 space-y-0.5">
              <div className="font-bold text-slate-900">Comité de Control y Prevención LA/FT</div>
              <div className="text-slate-500">{organization.area}</div>
              <div className="text-[10px] text-slate-400">{organization.shortName}</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
