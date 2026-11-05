import {businessDateTimeInput} from '../utils/businessTime';
import {parseImportDate} from '../utils/operationImport';
import { SubjectEditor } from './SubjectsView';
import { SubjectNameField } from './SubjectNameField';
import { calculateRisk } from '../utils/calculateRisk';
import React, { useState, useMemo } from 'react';
import { 
  RiskCriterion, 
  FactorWeight, 
  EvaluationRecord, 
  RiskLevel, Subject, OperationType
} from '../types';
import { 
  X,
  Calculator, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  FileCheck, 
  UserCheck, 
  Save, 
  CheckCircle2, 
  Info,
  DollarSign,
  MapPin,
  Check,
  Eye,
  Plus
} from 'lucide-react';

interface RiskEvaluationModalProps {
  existingRecord?:EvaluationRecord|null;
  operationTypes:OperationType[];
  canEditSubject?: boolean;
  thresholds:import('../types').RegulatoryThreshold[];
  records:EvaluationRecord[];
  isOpen: boolean;
  onClose: () => void;
  criteria: RiskCriterion[];
  factorWeights: FactorWeight[];
  onSaveSubject: (subject:Partial<Subject>) => Promise<Subject>;
  onSaveEvaluation: (record: EvaluationRecord) => Promise<EvaluationRecord>;
  onViewDossier?: (record: EvaluationRecord) => void;
  initialSubjectData?: Partial<Subject> | null;
}

export const RiskEvaluationModal: React.FC<RiskEvaluationModalProps> = ({
  thresholds,records,operationTypes,existingRecord,
  canEditSubject=true,
  isOpen,
  onClose,
  criteria,
  factorWeights,
  onSaveSubject,
  onSaveEvaluation,
  onViewDossier,
  initialSubjectData,
}) => {
  const [operationDate,setOperationDate]=useState(()=>existingRecord?.operationAt?businessDateTimeInput(new Date(existingRecord.operationAt)):businessDateTimeInput());
  const [conditionConfirmed,setConditionConfirmed]=useState(false);
  const currentLocalDate=()=>businessDateTimeInput();
  const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
  const [subjectUpdatedAt,setSubjectUpdatedAt]=useState<string|undefined>(initialSubjectData?.updatedAt);
  const [subjectId, setSubjectId] = useState(initialSubjectData?.id||'');
  const [address, setAddress] = useState(initialSubjectData?.address||'');
  const [email, setEmail] = useState(initialSubjectData?.email||'');
  const [phone, setPhone] = useState(initialSubjectData?.phone||'');
  const [editingSubject,setEditingSubject]=useState<Partial<Subject>|null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const selectSubject = (subject:Subject) => {
    setSelectedCriteriaIds(prev=>[...prev.filter(id=>criteria.find(c=>c.id===id)?.category!=='CLIENTE'),...(subject.clientCriteriaIds||[])]);
    setConditionConfirmed(false);
    setSubjectUpdatedAt(subject.updatedAt);setSubjectId(subject.id);setSubjectName(subject.subjectName);setTaxId(subject.taxId);setSubjectType(subject.subjectType);setActivity(subject.activity);setIsPep(subject.pepStatus);setPepDetails(subject.pepDetails || '');setAddress(subject.address);setEmail(subject.email);setPhone(subject.phone);setValidationError('');
  };

  // Form State
  const [subjectType, setSubjectType] = useState<'PERSONA_FISICA' | 'PERSONA_JURIDICA' | 'AGENCIA'>(initialSubjectData?.subjectType||'PERSONA_FISICA');
  const [subjectName, setSubjectName] = useState(initialSubjectData?.subjectName||'');
  const [taxId, setTaxId] = useState(initialSubjectData?.taxId||'');
  const [isPep, setIsPep] = useState(initialSubjectData?.pepStatus||false);
  const [pepDetails, setPepDetails] = useState(initialSubjectData?.pepDetails||'');
  const [activity, setActivity] = useState(initialSubjectData?.activity||'');
  const [operationType, setOperationType] = useState(existingRecord?.operationType||operationTypes.find(t=>t.active)?.code||'');
  const [amountARS, setAmountARS] = useState<number>(existingRecord?.amountARS||0);
  const [department, setDepartment] = useState(existingRecord?.locationDepartment==='Sin informar'?'':existingRecord?.locationDepartment||'');
  const [channelName, setChannelName] = useState(existingRecord?.channelName||'');
  const [notes, setNotes] = useState(existingRecord?.notes||'');

  // Selected criterion IDs
  const [selectedCriteriaIds, setSelectedCriteriaIds] = useState<string[]>([...(initialSubjectData?.clientCriteriaIds||[]),...(operationTypes.find(t=>t.active)?.productCriterionId?[operationTypes.find(t=>t.active)!.productCriterionId!]:[])]);
  const [validationError, setValidationError] = useState('');

  const [savedRecord, setSavedRecord] = useState<EvaluationRecord | null>(null);

  const nextOperationForSubject=()=>{
    if(!savedRecord)return;
    setRequestId(crypto.randomUUID());
    setSubjectId(savedRecord.subjectId || '');
    setAmountARS(0);setDepartment('');setChannelName('');setNotes('');setSelectedCriteriaIds(prev=>prev.filter(id=>criteria.find(c=>c.id===id)?.category==='CLIENTE'));
    setOperationDate(currentLocalDate());setConditionConfirmed(false);setSavedRecord(null);setValidationError('');
  };

  const setOperationCriterion=(category:RiskCriterion['category'],value:string)=>setSelectedCriteriaIds(previous=>[...previous.filter(id=>criteria.find(c=>c.id===id)?.category!==category),...(value?[value]:[])]);
  const selectedType=operationTypes.find(t=>t.code===operationType&&t.active);
  const complete=!!subjectId&&['CLIENTE','PRODUCTO','CANAL','GEOGRAFIA'].every(category=>criteria.some(c=>c.active&&!c.deletedAt&&c.category===category&&selectedCriteriaIds.includes(c.id)));
  // Scoring Calculation Engine
  const { weightedScore, rawScore, riskLevel, dueDiligence, alerts, requiresDJOF, requiresDocumentation,evaluationScope,categoryBreakdown } = useMemo(() => {
    return calculateRisk(criteria, factorWeights, selectedCriteriaIds, isPep, amountARS,thresholds,{subjectType,operationType:selectedType,records:records.filter(r=>r.subjectId===subjectId)});
  }, [criteria, factorWeights, selectedCriteriaIds, isPep, amountARS,thresholds,operationDate,subjectType,records,subjectId,selectedType]);

  const handleSave = async () => {
    if (savedRecord || isSaving) return;
    if(!selectedType){setValidationError('Elegí un tipo de operación activo.');return;}
    if(!subjectId){setValidationError('Seleccioná un sujeto registrado o creá su ficha con «Nuevo sujeto».');return;}
    if(!department.trim() || !channelName.trim() || !Number.isFinite(amountARS) || amountARS<=0){setValidationError('Completá departamento, sala y un monto mayor a cero.');return;}
    if(!selectedCriteriaIds.some(id=>criteria.find(c=>c.id===id)?.category==='CLIENTE')){setValidationError('Completá los factores personales desde «Editar ficha del sujeto».');return;}
    if(['PRODUCTO','CANAL','GEOGRAFIA'].some(category=>!criteria.some(c=>c.active&&c.category===category&&selectedCriteriaIds.includes(c.id)))){setValidationError('Seleccioná un producto, un canal y una zona geográfica.');return;}
    if(!conditionConfirmed){setValidationError('Confirmá la condición del sujeto para esta operación.');return;}
    if(isPep && !pepDetails.trim()){setValidationError('Indicá el cargo o condición PEP evaluada.');return;}
    if(!operationDate || !Number.isFinite(new Date(operationDate).getTime())){setValidationError('Indicá la fecha y hora de la operación.');return;}
    let operationAt:string;try{operationAt=parseImportDate(operationDate);}catch(e){setValidationError((e as Error).message);return;}
    setValidationError('');
    const newRecordId = requestId;
    const dossierNo = existingRecord?.dossierNumber||`EXP-PLA-${new Date().getFullYear()}-${newRecordId.slice(0,8).toUpperCase()}`;

    const newRecord: EvaluationRecord = {
      subjectUpdatedAt,
      operationAt,
      activityAtOperation:activity,
      conditionConfirmed,
      id: newRecordId,
      dossierNumber: dossierNo,
      timestamp: new Date().toISOString(),
      evaluator: 'Usuario autenticado',
      evaluatorRole: 'Oficial de Cumplimiento PLA/FT',
      subjectType,
      subjectId: subjectId || undefined,
      address:address.trim(),email:email.trim(),phone:phone.trim(),
      subjectName,
      taxId,
      pepStatus: isPep,
      pepDetails: isPep ? pepDetails : undefined,
      activityOcupation: activity,
      selectedCriteriaIds,
      operationType,
      operationTypeName:selectedType.name,
      evaluationScope,
      amountARS,
      locationDepartment: department,
      channelName,
      rawScore,
      weightedScore,
      riskLevel,
      dueDiligenceLevel: dueDiligence,
      status:'PENDIENTE',
      notes: notes || `Evaluación de ${operationType.replace('_', ' ')} por $${amountARS.toLocaleString('es-AR')}.`,
      requiresDJOF,
      requiresDocumentation,
      alerts,
    };

    setIsSaving(true);
    try { const saved = await onSaveEvaluation(newRecord); setSavedRecord(saved); }
    catch(e){setValidationError((e as Error).message);}
    finally{setIsSaving(false);}
  };

  const currentThresholdStatus={text:selectedType?.uifScope==='SIEMPRE'?'Identificación inicial':selectedType?.uifScope==='NO_APLICA'?'Sin piso monetario':evaluationScope.meetsFloor?'Alcanza piso UIF':'Debajo del piso UIF',color:requiresDocumentation?'text-amber-800 bg-amber-50 border-amber-200':'text-slate-700 bg-slate-100 border-slate-200'};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/30 overflow-y-auto">
      {canEditSubject&&editingSubject&&<SubjectEditor criteria={criteria} initial={editingSubject} onClose={()=>setEditingSubject(null)} onSave={async data=>{const saved=await onSaveSubject(data);selectSubject(saved);setEditingSubject(null)}}/>}
      <div role="dialog" aria-modal={!editingSubject} aria-hidden={!!editingSubject} inert={!!editingSubject} aria-label={existingRecord?'Completar evaluación histórica':'Nuevo expediente'} className="w-full max-w-5xl bg-white rounded-2xl sm:rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[92vh] my-auto">
        
        {/* Sticky Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {existingRecord?'Completar evaluación histórica':'Nuevo expediente'}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                Escribí el nombre, seleccioná la persona y completá la operación.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {!savedRecord&&existingRecord&&<p className="surface p-3 text-xs text-slate-600">Se completará {existingRecord.dossierNumber} con los parámetros y el piso configurados actualmente. La fecha, el importe, la sala y los datos del archivo de origen se conservan.</p>}
          {savedRecord ? (
            /* Success confirmation card */
            <div className="p-6 sm:p-8 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center space-y-4 my-auto">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-emerald-950">
                  Expediente {savedRecord.dossierNumber} Guardado con Éxito
                </h3>
                <p className="text-sm text-emerald-800 mt-1 max-w-lg mx-auto">
                  La operación de <span className="font-bold">{savedRecord.subjectName}</span> por <span className="font-mono font-bold">${savedRecord.amountARS.toLocaleString('es-AR')}</span> fue guardada en la base de datos con riesgo <span className="font-bold">{savedRecord.riskLevel} ({savedRecord.weightedScore} pts)</span>.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                {onViewDossier && (
                  <button
                    type="button"
                    onClick={() => {
                      onViewDossier(savedRecord);
                      onClose();
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Ver ficha de evaluación</span>
                  </button>
                )}
                {!existingRecord&&<button
                  type="button"
                  onClick={() => {
                    nextOperationForSubject();
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                >
                  Otra operación para este sujeto
                </button>}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 text-slate-500 hover:text-slate-800 text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  Finalizar y Cerrar
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Form Fields */}
              <div className="lg:col-span-7 space-y-5">
                
                {/* 1. Identification and Amount */}
                <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                      1
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                      Datos de esta operación
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <SubjectNameField value={subjectName} linked={!!subjectId} onSelect={selectSubject} onChange={name=>{
                      setSubjectName(name);
                      if(subjectId){setSubjectId('');setSubjectType('PERSONA_FISICA');setTaxId('');setAddress('');setEmail('');setPhone('');setActivity('');setIsPep(false);setPepDetails('');setSelectedCriteriaIds([]);setConditionConfirmed(false);}
                    }}/>
                    {subjectId&&<div className="sm:col-span-2 text-xs text-slate-500"><span className="font-medium text-teal-700">Ficha vinculada · {taxId}</span><details className="mt-2"><summary>Ver datos personales</summary><div className="mt-2 space-y-1"><p>{address||'Dirección pendiente'}</p><p>{email||'Correo pendiente'}</p><p>{phone||'Teléfono pendiente'}</p></div></details></div>}
                    {canEditSubject&&<div className="sm:col-span-2 flex flex-wrap gap-2"><button type="button" className="button-secondary" onClick={()=>setEditingSubject({subjectName:subjectId?'':subjectName})}><Plus size={15}/>Nuevo sujeto</button>{subjectId&&<button type="button" className="button-secondary" onClick={()=>setEditingSubject({id:subjectId,updatedAt:subjectUpdatedAt,subjectName,taxId,subjectType,address,email,phone,activity,pepStatus:isPep,pepDetails,clientCriteriaIds:selectedCriteriaIds.filter(id=>criteria.find(c=>c.id===id)?.category==='CLIENTE')})}>Editar ficha</button>}</div>}
                    <label className="field-label sm:col-span-2">Fecha y hora de la operación (Argentina)<input aria-label="Fecha y hora de la operación" type="datetime-local" value={operationDate} readOnly={!!existingRecord} onChange={e=>setOperationDate(e.target.value)}/></label>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Operación</label>
                      <select
                        value={operationType}
                        onChange={e=>{const type=operationTypes.find(t=>t.code===e.target.value);setOperationType(e.target.value);setOperationCriterion('PRODUCTO',type?.productCriterionId||'');}}
                        className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:border-teal-500"
                      >
                        <option value="">Seleccionar tipo de operación</option>
                        {operationTypes.filter(t=>t.active).map(t=><option key={t.code} value={t.code}>{t.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Monto de la Operación ($ ARS)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={amountARS}
                          readOnly={!!existingRecord}
                          onChange={(e) => setAmountARS(Number(e.target.value))}
                          className="w-full py-2 pl-8 pr-3 bg-white border border-slate-300 rounded-xl font-mono text-sm font-bold focus:outline-hidden focus:border-teal-500"
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[11px]">
                        <span className="font-semibold text-slate-500">$ {amountARS.toLocaleString('es-AR')}</span>
                        <span className={`px-1.5 py-0.2 rounded font-bold border ${currentThresholdStatus.color}`}>
                          {currentThresholdStatus.text}
                        </span>
                      </div>
                    </div>
                  </div>

                  {subjectId&&<div className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg p-3 space-y-1"><p>Tipo: {subjectType==='PERSONA_FISICA'?'Persona física':subjectType==='PERSONA_JURIDICA'?'Persona jurídica':'Agencia'}</p><p>Actividad: {activity}</p><p>Condición PEP: {isPep?`Sí · ${pepDetails}`:'No'}</p><p>Factores personales: {selectedCriteriaIds.filter(id=>criteria.find(c=>c.id===id)?.category==='CLIENTE').map(id=>criteria.find(c=>c.id===id)?.name).join(' · ')||'Pendientes en la ficha del sujeto'}</p></div>}
                  <label className="flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" checked={conditionConfirmed} onChange={e=>setConditionConfirmed(e.target.checked)} className="mt-0.5"/>Revisé la ficha del sujeto que se utilizará en este expediente.</label>
                  {/* Department & Channel */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Departamento (Entre Ríos)</label>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:border-teal-500"
                      >
                        <option value="">Seleccionar departamento</option>
                        <option value="Paraná">Paraná (Capital)</option>
                        <option value="Concordia">Concordia (Frontera)</option>
                        <option value="Gualeguaychú">Gualeguaychú (Frontera)</option>
                        <option value="Colón">Colón (Frontera)</option>
                        <option value="Uruguay">Concepción del Uruguay</option>
                        <option value="Victoria">Victoria</option>
                        <option value="Federación">Federación</option>
                        <option value="La Paz">La Paz</option>
                        <option value="Villaguay">Villaguay</option>
                        <option value="Gualeguay">Gualeguay</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Sala de Juego / Canal</label>
                      <input
                        type="text"
                        value={channelName}
                        readOnly={!!existingRecord}
                        onChange={(e) => setChannelName(e.target.value)}
                        placeholder="Ej. Casino Concordia, Agencia 104..."
                        className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Factores de Riesgo / Matriz Selection */}
                <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                        2
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        Factores de la operación
                      </h4>
                    </div>
                    <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {selectedCriteriaIds.length} seleccionados
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">Los parámetros del sujeto se toman de su ficha. Completá solamente las condiciones de esta operación.</p>
                  <div className="grid sm:grid-cols-3 gap-3">{([['PRODUCTO','Producto / juego'],['CANAL','Canal de la operación'],['GEOGRAFIA','Zona geográfica']] as const).map(([category,label])=><label className="field-label" key={category}>{label}<select value={selectedCriteriaIds.find(id=>criteria.some(c=>c.id===id&&c.category===category))||''} onChange={e=>setOperationCriterion(category,e.target.value)}><option value="">Seleccionar</option>{criteria.filter(c=>c.active&&!c.deletedAt&&c.category===category).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>)}</div>

                  {/* Observaciones */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Observaciones del Evaluador / Justificación
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Observaciones iniciales y referencias de documentación disponible…"
                      className="w-full p-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:border-teal-500"
                    />
                  </div>
                </div>

              </div>

              {/* Right Column: Scoring Verdict & Save Action */}
              <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-0">
                
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Evaluación inicial de riesgo
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Res. UIF 194/2023
                    </span>
                  </div>

                  {/* Score & Risk Badge */}
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-4xl font-black font-mono tabular-nums text-slate-900 tracking-tight">
                        {complete?weightedScore:'—'}
                        <span className="text-sm text-slate-400 font-normal"> /100</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Puntaje Total Ponderado
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 rounded-xl text-xs font-black tracking-wide ${
                        !complete ? 'bg-slate-100 text-slate-600' : riskLevel === 'CRITICO' ? 'bg-rose-600 text-white' :
                        riskLevel === 'ALTO' ? 'bg-orange-500 text-white' :
                        riskLevel === 'MEDIO' ? 'bg-amber-400 text-slate-900' :
                        'bg-emerald-600 text-white'
                      }`}>
                        {complete?`RIESGO ${riskLevel}`:'EVALUACIÓN PENDIENTE'}
                      </span>
                      <div className="text-[11px] font-bold text-slate-700 mt-1">
                        Diligencia: {complete?dueDiligence:'Completar datos'}
                      </div>
                    </div>
                  </div>

                  {/* Visual Gauge */}
                  <div className="space-y-1">
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                      <div className="bg-emerald-500 h-full" style={{ width: '40%' }} />
                      <div className="bg-amber-400 h-full" style={{ width: '35%' }} />
                      <div className="bg-orange-500 h-full" style={{ width: '10%' }} />
                      <div className="bg-rose-600 h-full" style={{ width: '15%' }} />
                    </div>
                  </div>

                  <div className="surface p-3 text-xs text-slate-600"><span className="font-medium">Piso UIF: </span>{thresholds[0]?`$ ${thresholds[0].amountARS.toLocaleString('es-AR')} por operación`:'Pendiente de configurar'}</div>
                  <p className="text-xs text-slate-600">{evaluationScope.reason}</p>
                  <details className="surface p-3 text-xs text-slate-600"><summary>Cómo se obtiene el nivel de riesgo</summary>{categoryBreakdown.map(f=><p key={f.category} className="mt-2">{f.name}: {f.criteria.join(' · ')||'Pendiente'} · peso {f.weight}%</p>)}<p className="mt-3">El importe define el alcance monetario. El riesgo combina los parámetros del sujeto y de la operación; no determina por sí solo una sospecha ni un ROS.</p></details>
                  {/* Medidas Exigibles */}
                  <div className="space-y-2 pt-1 text-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Resultado de la evaluación
                    </div>

                    <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      requiresDocumentation ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      <span className="font-semibold">Legajo e Identificación:</span>
                      <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-white border border-current">
                        {!complete?'PENDIENTE':requiresDocumentation ? 'REQUERIDO' : 'SIMPLIFICADO'}
                      </span>
                    </div>

                    <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      requiresDJOF ? 'bg-rose-50 border-rose-200 text-rose-950' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      <span className="font-semibold">Declaración de Fondos (DJOF):</span>
                      <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-white border border-current">
                        {!complete?'PENDIENTE':requiresDJOF ? 'REQUERIDA' : 'NO REQUERIDA'}
                      </span>
                    </div>

                    {alerts.length > 0 && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-rose-900">
                        <div className="font-bold flex items-center gap-1.5 text-[11px] text-rose-800">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Alertas</span>
                        </div>
                        {alerts.map((al, idx) => (
                          <div key={idx} className="text-[10px] pl-4">• {al}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {validationError && <p role="alert" className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3">{validationError}</p>}
                  {/* Primary Save Action */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving||!subjectId}
                      className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving?'Guardando en base de datos…':existingRecord?'Completar evaluación':'Guardar expediente'}</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-100 bg-white flex items-center justify-between shrink-0 text-xs text-slate-500">
          <div className="hidden sm:block">
            Expediente vinculado al sujeto registrado
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer ml-auto"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
