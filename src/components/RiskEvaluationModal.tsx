import { SubjectEditor } from './SubjectsView';
import { ListInput, ListSelect } from '../lists';
import { SubjectNameField } from './SubjectNameField';
import { calculateRisk } from '../utils/calculateRisk';
import React, { useState, useMemo, useEffect } from 'react';
import { 
  RiskCriterion, 
  FactorWeight, 
  EvaluationRecord, 
  RiskLevel, Subject, SubjectDetails, PaymentMethod
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
  canEditSubject?: boolean;
  thresholds:import('../types').RegulatoryThreshold[];
  records:EvaluationRecord[];
  isOpen: boolean;
  onClose: () => void;
  criteria: RiskCriterion[];
  factorWeights: FactorWeight[];
  onSaveSubject: (subject:Partial<Subject>) => Promise<Subject>;
  onSaveEvaluation: (record: EvaluationRecord, review?:{decision:'JUSTIFICAR'|'SEGUIR'|'ROS';reasoning:string}) => Promise<EvaluationRecord>;
  canAnalyze?: boolean;
  onViewDossier?: (record: EvaluationRecord) => void;
  initialSubjectData?: Partial<Subject> | null;
}

export const RiskEvaluationModal: React.FC<RiskEvaluationModalProps> = ({
  thresholds,records,
  canEditSubject=true,canAnalyze=false,
  isOpen,
  onClose,
  criteria,
  factorWeights,
  onSaveSubject,
  onSaveEvaluation,
  onViewDossier,
  initialSubjectData,
}) => {
  const [criterionCategory,setCriterionCategory]=useState<RiskCriterion['category']>('PRODUCTO');
  const [operationDate,setOperationDate]=useState('');
  const currentLocalDate=()=>{const now=new Date();return new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16)};
  const [requestId,setRequestId]=useState('');
  const [subjectUpdatedAt,setSubjectUpdatedAt]=useState<string|undefined>();
  const [subjectId, setSubjectId] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [editingSubject,setEditingSubject]=useState<Partial<Subject>|null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const selectSubject = (subject:Subject) => {
    setSelectedCriteriaIds(prev=>[...prev.filter(id=>criteria.find(c=>c.id===id)?.category!=='CLIENTE'),...(subject.clientCriteriaIds||[])]);
    
    setSubjectDetails(subject.details);setSubjectUpdatedAt(subject.updatedAt);setSubjectId(subject.id);setSubjectName(subject.subjectName);setTaxId(subject.taxId);setSubjectType(subject.subjectType);setActivity(subject.activity);setIsPep(subject.pepStatus);setPepDetails(subject.pepDetails || '');setAddress(subject.address);setEmail(subject.email);setPhone(subject.phone);setValidationError('');
  };

  // Form State
  const [subjectType, setSubjectType] = useState<'PERSONA_FISICA' | 'PERSONA_JURIDICA' | 'AGENCIA'>('PERSONA_FISICA');
  const [subjectName, setSubjectName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [isPep, setIsPep] = useState(false);
  const [pepDetails, setPepDetails] = useState('');
  const [activity, setActivity] = useState('');
  const [operationType, setOperationType] = useState<'COBRO_PREMIO' | 'APUESTA_PRESENCIAL' | 'APUESTA_ONLINE' | 'CAMBIO_FICHAS' | 'ALTA_AGENCIA'>('COBRO_PREMIO');
  const [amountARS, setAmountARS] = useState<number>(0);
  const [department, setDepartment] = useState('');
  const [channelName, setChannelName] = useState('');
  const [subjectDetails,setSubjectDetails]=useState<SubjectDetails|undefined>();
  const noOp={game:'',modality:'',drawName:'',drawDate:'',agencyNumber:'',paymentMethod:'EFECTIVO' as PaymentMethod,issuingBank:'',chequeNumber:'',cbu:''};
  const [op,setOp]=useState(noOp);
  const [decision,setDecision]=useState<'JUSTIFICAR'|'SEGUIR'|'ROS'>('SEGUIR');
  const [analysisText,setAnalysisText]=useState('');
  const setOpField=(k:keyof typeof noOp,v:string)=>setOp(prev=>({...prev,[k]:v}));
  const [notes, setNotes] = useState('');

  // Selected criterion IDs
  const [selectedCriteriaIds, setSelectedCriteriaIds] = useState<string[]>([]);
  const [validationError, setValidationError] = useState('');

  const [savedRecord, setSavedRecord] = useState<EvaluationRecord | null>(null);
  // Asistente de 3 pasos: 1 Sujeto, 2 Operación, 3 Resultado.
  const [step,setStep]=useState<1|2|3|4>(1);
  const hid=(visibleIn:1|2|3|4)=>step===visibleIn?'':'hidden';

  const resetForm = () => {
    setRequestId(crypto.randomUUID());setSubjectUpdatedAt(initialSubjectData?.updatedAt);
    setEditingSubject(null);
    setCriterionCategory('PRODUCTO');setOperationDate(currentLocalDate());
    setSubjectId(initialSubjectData?.id || '');
    setAddress(initialSubjectData?.address || '');setEmail(initialSubjectData?.email || '');setPhone(initialSubjectData?.phone || '');

    setSubjectType(initialSubjectData?.subjectType || 'PERSONA_FISICA');
    setSubjectName(initialSubjectData?.subjectName || '');
    setTaxId(initialSubjectData?.taxId || '');
    setIsPep(initialSubjectData?.pepStatus || false);
    setPepDetails(initialSubjectData?.pepDetails || '');
    setActivity(initialSubjectData?.activity || '');
    setOperationType('COBRO_PREMIO'); setAmountARS(0); setDepartment('');setOp(noOp);setDecision('SEGUIR');setAnalysisText('');
    setChannelName(''); setNotes(''); setSelectedCriteriaIds(initialSubjectData?.clientCriteriaIds || []);
    setSavedRecord(null); setValidationError('');setStep(initialSubjectData?.id?2:1);
  };
  useEffect(() => { if (isOpen) resetForm(); }, [initialSubjectData, isOpen]);

  const nextOperationForSubject=()=>{
    if(!savedRecord)return;
    setRequestId(crypto.randomUUID());
    setSubjectId(savedRecord.subjectId || '');
    setAmountARS(0);setOp(noOp);setDecision('SEGUIR');setAnalysisText('');setDepartment('');setChannelName('');setNotes('');setSelectedCriteriaIds(prev=>prev.filter(id=>criteria.find(c=>c.id===id)?.category==='CLIENTE'));
    setCriterionCategory('PRODUCTO');setOperationDate(currentLocalDate());setSavedRecord(null);setValidationError('');setStep(2);
  };

  // Toggle criterion selection
  const handleToggleCriterion = (id: string) => {
    setSelectedCriteriaIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Scoring Calculation Engine
  const { weightedScore, rawScore, riskLevel, dueDiligence, alerts, requiresDJOF, requiresDocumentation } = useMemo(() => {
    return calculateRisk(criteria, factorWeights, selectedCriteriaIds, isPep, amountARS,thresholds,{operationAt:operationDate&&Number.isFinite(Date.parse(operationDate))?new Date(operationDate).toISOString():undefined,subjectType,records:records.filter(r=>r.subjectId===subjectId)});
  }, [criteria, factorWeights, selectedCriteriaIds, isPep, amountARS,thresholds,operationDate,subjectType,records,subjectId]);

  const paymentError=():string=>op.paymentMethod==='TRANSFERENCIA'&&(!op.issuingBank.trim()||!/^\d{22}$/.test(op.cbu.replace(/\s/g,'')))?'Para una transferencia indicá el banco emisor y el CBU de 22 dígitos.':'';
  const validateStep=(s:1|2|3):string=>{
    if(s===1){
      if(!subjectId)return 'Seleccioná un sujeto registrado o creá su ficha con «Nuevo sujeto».';
      if(!selectedCriteriaIds.some(id=>criteria.find(c=>c.id===id)?.category==='CLIENTE'))return 'Completá los factores personales desde «Editar ficha del sujeto».';
      if(isPep && !pepDetails.trim())return 'Indicá el cargo o condición PEP evaluada.';
      return '';
    }
    if(!operationDate || !Number.isFinite(new Date(operationDate).getTime()))return 'Indicá la fecha y hora de la operación.';
    if(!department.trim() || !channelName.trim() || !Number.isFinite(amountARS) || amountARS<=0)return 'Completá departamento, sala y un monto mayor a cero.';
    if(paymentError())return paymentError();
    if(s===2)return '';
    const has=(category:RiskCriterion['category'])=>selectedCriteriaIds.some(id=>criteria.find(c=>c.id===id)?.category===category);
    if(!has('PRODUCTO')||!has('CANAL')||!has('GEOGRAFIA'))return 'Elegí al menos un criterio de producto o servicio, uno de canal y uno de geografía.';
    return '';
  };
  const goNext=()=>{if(step===4)return;const msg=validateStep(step);setValidationError(msg);if(!msg)setStep((step+1) as 2|3|4);};
  const goBack=()=>{setValidationError('');if(step>1)setStep((step-1) as 1|2|3);};
  const stepTitles=['Sujeto','Operación','Señales','Resultado'] as const;
  const handleSave = async () => {
    if (savedRecord || isSaving) return;
    if(!subjectId){setValidationError('Seleccioná un sujeto registrado o creá su ficha con «Nuevo sujeto».');return;}
    if(!department.trim() || !channelName.trim() || !Number.isFinite(amountARS) || amountARS<=0){setValidationError('Completá departamento, sala y un monto mayor a cero.');return;}
    if(paymentError()){setValidationError(paymentError());return;}
    const text=analysisText.trim(),needs=decision==='SEGUIR'?10:30;
    if(canAnalyze&&(decision!=='SEGUIR'&&text.length<needs||text&&text.length<needs)){setValidationError(decision==='SEGUIR'?'Si escribís un análisis, que tenga al menos 10 caracteres.':'Explicá el análisis fundamentado (al menos 30 caracteres) para justificar o reportar.');return;}
    if(!selectedCriteriaIds.some(id=>criteria.find(c=>c.id===id)?.category==='CLIENTE')){setValidationError('Completá los factores personales desde «Editar ficha del sujeto».');return;}
    if(isPep && !pepDetails.trim()){setValidationError('Indicá el cargo o condición PEP evaluada.');return;}
    if(!operationDate || !Number.isFinite(new Date(operationDate).getTime())){setValidationError('Indicá la fecha y hora de la operación.');return;}
    setValidationError('');
    const newRecordId = requestId;
    const dossierNo = `EXP-PLA-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newRecord: EvaluationRecord = {
      subjectUpdatedAt,
      operationAt:new Date(operationDate).toISOString(),
      activityAtOperation:activity,
      conditionConfirmed:true,
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
      ...op,
      cbu:op.cbu.replace(/\s/g,''),
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
    try { const saved = await onSaveEvaluation(newRecord,canAnalyze&&analysisText.trim()?{decision,reasoning:analysisText.trim()}:undefined); setSavedRecord(saved); }
    catch(e){setValidationError((e as Error).message);}
    finally{setIsSaving(false);}
  };

  const currentThresholdStatus={text:requiresDJOF?'Requiere DJOF':requiresDocumentation?'Requiere documentación':'Verificar umbrales configurados',color:requiresDocumentation?'text-amber-800 bg-amber-50 border-amber-200':'text-slate-700 bg-slate-100 border-slate-200'};

  if (!isOpen) return null;

  return (
    <div className="w-full">
      {canEditSubject&&editingSubject&&<SubjectEditor criteria={criteria} initial={editingSubject} onClose={()=>setEditingSubject(null)} onSave={async data=>{const saved=await onSaveSubject(data);selectSubject(saved);setEditingSubject(null)}}/>}
      <div role="region" aria-hidden={!!editingSubject} inert={!!editingSubject} aria-label="Nueva evaluación" className="w-full max-w-3xl mx-auto flex flex-col gap-5">
        
        <h1 className="text-3xl font-bold text-slate-900">Nueva evaluación</h1>

        {/* Scrollable Modal Content */}
        <div className="space-y-5">
          {!savedRecord&&<ol aria-label="Pasos de la evaluación" className="flex flex-wrap gap-x-6 gap-y-2">{stepTitles.map((t,i)=>{const n=i+1,done=n<step,current=n===step;return <li key={t} aria-current={current?'step':undefined} className={`flex items-center gap-2 text-sm ${current?'font-bold text-slate-900':done?'font-medium text-teal-800':'font-medium text-slate-600'}`}><span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${current?'bg-teal-700 text-white':done?'bg-teal-100 text-teal-800':'border-2 border-slate-400 text-slate-700'}`}>{done?<Check className="w-4 h-4"/>:n}</span>{t}</li>;})}</ol>}
          {!savedRecord&&step<4&&validationError&&<p role="alert" className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3">{validationError}</p>}
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
                <button
                  type="button"
                  onClick={() => {
                    nextOperationForSubject();
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                >
                  Otra operación para este sujeto
                </button>
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
            <div className="grid grid-cols-1 gap-5">
              
              {/* Left Column: Form Fields */}
              <div className={`lg:col-span-12 space-y-5 ${step===4?'hidden':''}`}>
                
                {/* 1. Identification and Amount */}
                <div className={`bg-white p-5 sm:p-7 rounded-xl border border-slate-200 space-y-5 ${step===3?'hidden':''}`}>
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                      {step}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                      {step===1?'¿De quién es la operación?':'Datos de esta operación'}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={`sm:col-span-2 ${hid(1)}`}><SubjectNameField value={subjectName} linked={!!subjectId} onSelect={selectSubject} onChange={name=>{
                      setSubjectName(name);
                      if(subjectId){setSubjectId('');setSubjectType('PERSONA_FISICA');setTaxId('');setAddress('');setEmail('');setPhone('');setActivity('');setIsPep(false);setPepDetails('');setSubjectDetails(undefined);setSelectedCriteriaIds([]);}
                    }}/></div>
                    {subjectId&&<div className={`sm:col-span-2 rounded-xl border border-teal-200 bg-teal-50/60 p-3 text-sm text-slate-700 ${hid(1)}`}><p className="font-semibold text-teal-900">Sujeto encontrado: {subjectName}</p><p className="mt-1 text-xs text-slate-600">{subjectDetails?.documentType||'Documento'} {taxId}{subjectDetails?.cuit?` · CUIT ${subjectDetails.cuit}`:''} · {address||'Domicilio pendiente'}</p><p className="text-xs text-slate-600">{[phone,email,activity].filter(Boolean).join(' · ')||'Contacto pendiente'}{isPep?` · PEP: ${pepDetails}`:''}</p><p className="text-xs text-slate-600">Factores personales: {selectedCriteriaIds.filter(id=>criteria.find(c=>c.id===id)?.category==='CLIENTE').map(id=>criteria.find(c=>c.id===id)?.name).join(' · ')||'pendientes en la ficha del sujeto'}</p></div>}
                    {canEditSubject&&<div className={`sm:col-span-2 flex gap-3 ${hid(1)}`}><button type="button" className="text-xs font-medium text-teal-700" onClick={()=>setEditingSubject(subjectId?{id:subjectId,updatedAt:subjectUpdatedAt,subjectName,taxId,subjectType,address,email,phone,activity,pepStatus:isPep,pepDetails,details:subjectDetails,clientCriteriaIds:selectedCriteriaIds.filter(id=>criteria.find(c=>c.id===id)?.category==='CLIENTE')}:{subjectName})}>{subjectId?'Editar ficha del sujeto':'El sujeto no existe: crear uno nuevo'}</button></div>}
                    <div className={hid(2)}><label className="block text-xs font-bold text-slate-700 mb-1">Fecha y hora de la operación<input aria-label="Fecha y hora de la operación" type="datetime-local" value={operationDate} onChange={e=>setOperationDate(e.target.value)} className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:border-teal-500 mt-1"/></label></div>
                    <div className={hid(2)}><label className="block text-xs font-bold text-slate-700 mb-1">Importe en pesos ($)<input type="number" min="0" step="0.01" value={amountARS||''} onChange={e=>setAmountARS(Number(e.target.value))} className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:border-teal-500 font-mono mt-1"/></label><p className="mt-1 text-[11px]"><span className={`px-1.5 py-0.5 rounded font-bold border ${currentThresholdStatus.color}`}>{currentThresholdStatus.text}</span></p></div>
                    <div className={hid(2)}><label className="block text-xs font-bold text-slate-700 mb-1">Tipo de operación<select value={operationType} onChange={e=>setOperationType(e.target.value as any)} className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:border-teal-500 mt-1"><option value="COBRO_PREMIO">Cobro de premio</option><option value="APUESTA_PRESENCIAL">Apuesta presencial</option><option value="APUESTA_ONLINE">Apuesta en plataforma online</option><option value="CAMBIO_FICHAS">Canje de fichas</option><option value="ALTA_AGENCIA">Alta de agencia</option></select></label></div>
                    <div className={`${hid(2)}`}><label className="block text-xs font-bold text-slate-700 mb-1">Juego<ListInput listKey="games" value={op.game} maxLength={120} onChange={v=>setOpField("game",v)} className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:border-teal-500 mt-1"/></label></div>
                    <div className={`${hid(2)}`}><label className="block text-xs font-bold text-slate-700 mb-1">Modalidad<ListInput listKey="modalities" value={op.modality} maxLength={120} onChange={v=>setOpField("modality",v)} className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:border-teal-500 mt-1"/></label></div>
                    <div className={`${hid(2)}`}><label className="block text-xs font-bold text-slate-700 mb-1">Sorteo<ListInput listKey="draws" value={op.drawName} maxLength={120} onChange={v=>setOpField("drawName",v)} className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:border-teal-500 mt-1"/></label></div>
                    <div className={`${hid(2)}`}><label className="block text-xs font-bold text-slate-700 mb-1">Fecha del sorteo<input type="date" value={op.drawDate} onChange={e=>setOpField("drawDate",e.target.value)} className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:border-teal-500 mt-1"/></label></div>
                    <div className={`${hid(2)}`}><label className="block text-xs font-bold text-slate-700 mb-1">N° de agencia<input value={op.agencyNumber} maxLength={30} onChange={e=>setOpField("agencyNumber",e.target.value)} className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:border-teal-500 mt-1"/></label></div>
                    <div className={`${hid(2)}`}><label className="block text-xs font-bold text-slate-700 mb-1">Departamento<ListSelect listKey="departments" value={department} onChange={setDepartment} empty="Seleccionar" maxLength={200} className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:border-teal-500 mt-1"/></label></div>
                    <div className={`${hid(2)}`}><label className="block text-xs font-bold text-slate-700 mb-1">Sala de juego o canal<ListInput listKey="channels" value={channelName} maxLength={200} onChange={setChannelName} placeholder="Elegí o escribí la sala o agencia" className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:border-teal-500 mt-1"/></label></div>
                    <div className={`${hid(2)}`}><label className="block text-xs font-bold text-slate-700 mb-1">Forma de pago<select value={op.paymentMethod} onChange={e=>setOpField("paymentMethod",e.target.value)} className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:border-teal-500 mt-1"><option value="EFECTIVO">Efectivo</option><option value="TRANSFERENCIA">Transferencia</option><option value="OTRO">Otro</option></select></label></div>
                    {op.paymentMethod==='TRANSFERENCIA'&&<><div className={`${hid(2)}`}><label className="block text-xs font-bold text-slate-700 mb-1">Banco emisor *<ListInput listKey="banks" value={op.issuingBank} maxLength={120} onChange={v=>setOpField("issuingBank",v)} className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:border-teal-500 mt-1"/></label></div><div className={`${hid(2)}`}><label className="block text-xs font-bold text-slate-700 mb-1">CBU * (22 dígitos)<input inputMode="numeric" value={op.cbu} maxLength={30} onChange={e=>setOpField("cbu",e.target.value)} className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:border-teal-500 font-mono mt-1"/></label></div></>}
                    {op.paymentMethod!=='EFECTIVO'&&<div className={`${hid(2)}`}><label className="block text-xs font-bold text-slate-700 mb-1">N° de cheque (opcional)<input value={op.chequeNumber} maxLength={40} onChange={e=>setOpField("chequeNumber",e.target.value)} className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:border-teal-500 mt-1"/></label></div>}
                  </div>
                </div>

                {/* 2. Factores de Riesgo / Matriz Selection */}
                <div className={`bg-white p-5 sm:p-7 rounded-xl border border-slate-200 space-y-3 ${hid(3)}`}>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        Señales de Alerta y Factores Detectados
                      </h4>
                    </div>
                    <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {selectedCriteriaIds.length} {selectedCriteriaIds.length===1?'seleccionado':'seleccionados'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400">Marcá los factores de esta operación en cada grupo (* obligatorios: al menos uno). Las condiciones personales provienen de la ficha del sujeto.</p>
                  {([['PRODUCTO','Producto o servicio',true],['CANAL','Canal',true],['GEOGRAFIA','Geografía',true],['OPERACIONAL','Señales adicionales',false]] as const).map(([category,label,required])=>{const group=criteria.filter(c=>c.active&&c.category===category),count=group.filter(c=>selectedCriteriaIds.includes(c.id)).length;return <section key={category} aria-label={label} className="space-y-2 pt-1">
                  <h5 className="flex items-center justify-between gap-2 text-xs font-bold text-slate-800"><span>{label}{required?' *':' (opcional)'}</span><span className={`font-semibold ${count?'text-teal-800':'text-slate-500'}`}>{count} {count===1?'seleccionado':'seleccionados'}</span></h5>
                  {group.length===0&&<p className="text-xs text-slate-500">No hay criterios activos en esta categoría.</p>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.map((item) => {
                      const isSelected = selectedCriteriaIds.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleToggleCriterion(item.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                            isSelected
                              ? 'bg-teal-50 border-teal-400 text-teal-950 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between text-[10px] mb-0.5">
                              <span className="font-mono text-slate-400">{item.code}</span>
                              <span className={`font-bold ${item.score >= 4 ? 'text-rose-600' : 'text-slate-500'}`}>
                                {item.score} pt
                              </span>
                            </div>
                            <div className="text-xs font-semibold leading-tight text-slate-900 line-clamp-2">
                              {item.name}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div></section>})}

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

              {/* Paso 3: resultado y decisión */}
              <div className={step===4?'bg-white border border-slate-200 rounded-xl p-5 sm:p-7 space-y-6':'hidden'}>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <span className={`px-5 py-2.5 rounded-full text-xl font-bold ${riskLevel==='CRITICO'?'bg-rose-900 text-white':riskLevel==='ALTO'?'bg-orange-100 text-orange-900':riskLevel==='MEDIO'?'bg-amber-100 text-amber-900':'bg-emerald-100 text-emerald-900'}`}>RIESGO {riskLevel}</span>
                  <span className="text-base text-slate-600">Puntaje {weightedScore} de 100 · {subjectName}</span>
                </div>
                <div className="space-y-2.5">
                  <p className="text-base text-slate-800"><strong>Por qué:</strong> {alerts[0]||`los factores elegidos dan un riesgo ${riskLevel.toLowerCase()} (diligencia ${({SIMPLIFICADA:'simplificada',ESTANDAR:'estándar',REFORZADA:'reforzada'} as Record<string,string>)[String(dueDiligence)]||String(dueDiligence).toLowerCase()}).`}</p>
                  {alerts.length>1&&<ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">{alerts.slice(1).map((al,idx)=><li key={idx}>{al}</li>)}</ul>}
                  <details className="text-sm"><summary className="cursor-pointer font-semibold text-teal-800">Ver el detalle del cálculo</summary><div className="mt-3 space-y-3">
                    {/* Visual Gauge */}
                  <div className="space-y-1">
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                      <div className="bg-emerald-500 h-full" style={{ width: '40%' }} />
                      <div className="bg-amber-400 h-full" style={{ width: '35%' }} />
                      <div className="bg-orange-500 h-full" style={{ width: '10%' }} />
                      <div className="bg-rose-600 h-full" style={{ width: '15%' }} />
                    </div>
                  </div>

                  {/* Medidas Exigibles */}
                  <div className="space-y-2 pt-1 text-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Exigencias Normativas para este Caso
                    </div>

                    <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      requiresDocumentation ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      <span className="font-semibold">Legajo e Identificación:</span>
                      <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-white border border-current">
                        {requiresDocumentation ? 'OBLIGATORIO' : 'SIMPLIFICADO'}
                      </span>
                    </div>

                    <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      requiresDJOF ? 'bg-rose-50 border-rose-200 text-rose-950' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      <span className="font-semibold">Declaración de Fondos (DJOF):</span>
                      <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-white border border-current">
                        {requiresDJOF ? 'EXIGIBLE' : 'NO APLICA'}
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
                  </div></details>
                </div>
                {canAnalyze&&<div className="border-t border-slate-200 pt-5 space-y-4">
                  <label className="flex flex-col gap-1.5 text-base font-bold text-slate-900">Análisis fundamentado{decision==='SEGUIR'?' (opcional)':' (obligatorio)'}
                    <textarea rows={4} value={analysisText} onChange={e=>setAnalysisText(e.target.value)} placeholder="Explicá por qué la operación es consistente con el perfil del sujeto, o qué falta analizar." className="p-3 border border-slate-300 rounded-lg text-base font-normal"/>
                  </label>
                  <fieldset className="flex flex-wrap gap-2.5"><legend className="text-base font-bold text-slate-900 mb-2.5">Decisión</legend>
                    {([['JUSTIFICAR','Justificar'],['SEGUIR','Seguir en análisis'],['ROS','Reportar ROS']] as const).map(([v,l])=><label key={v} className={`flex items-center gap-2.5 px-4 py-3 rounded-lg text-base cursor-pointer ${decision===v?'border-2 border-teal-700 bg-teal-50':'border border-slate-300'}`}><input type="radio" name="decision" className="w-5 h-5 accent-teal-700" checked={decision===v} onChange={()=>setDecision(v)}/>{l}</label>)}
                  </fieldset>
                  <p className="text-sm text-slate-600">El puntaje no justifica la operación ni presenta un ROS automáticamente: la decisión es de la persona que analiza. {decision==='ROS'?'Queda marcada como sospechosa; la constancia de presentación se registra después desde el expediente.':decision==='SEGUIR'?'Si dejás el análisis vacío, el expediente queda pendiente de análisis.':'Justificar cierra el expediente.'}</p>
                </div>}
                {validationError && <p role="alert" className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg p-3">{validationError}</p>}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <button type="button" onClick={goBack} className="px-1 py-3 text-teal-800 font-semibold text-base cursor-pointer">Atrás</button>
                  <button type="button" onClick={handleSave} disabled={isSaving||!subjectId} className="px-7 py-3.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-base cursor-pointer disabled:opacity-60">{isSaving?'Guardando…':'Guardar expediente'}</button>
                </div>
              </div>

            </div>
          )}
        </div>

        {!savedRecord&&step<4&&<div className="flex items-center justify-between gap-3 flex-wrap">
          <button type="button" onClick={step===1?onClose:goBack} className="px-1 py-3 text-teal-800 font-semibold text-base cursor-pointer">{step===1?'Cancelar':'Atrás'}</button>
          <button type="button" onClick={goNext} className="px-7 py-3.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-base cursor-pointer">{step<3?'Continuar':'Calcular riesgo'}</button>
        </div>}

      </div>
    </div>
  );
};
