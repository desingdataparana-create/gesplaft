'use client';
import {sitePath,passwordAuth} from './utils/paths';

import {can,type AccessUser} from './access';
import {UsersView} from './components/UsersView';
import {DashboardView,type DashboardData} from './components/DashboardView';
import { SystemSettingsView, type ThemeMode } from './components/SystemSettingsView';
import { DEFAULT_ORGANIZATION } from './data/organization';
import type { OrganizationSettings } from './types';
import { request } from './utils/api';
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AlertsMonitoringView } from './components/AlertsMonitoringView';
import { NormativaMatrizView } from './components/NormativaMatrizView';
import { AddParameterModal } from './components/AddParameterModal';
import { CaseAnalysisModal } from './components/CaseAnalysisModal';
import { RiskDossierModal } from './components/RiskDossierModal';
import { ExportReportsModal } from './components/ExportReportsModal';
import { SubjectsView } from './components/SubjectsView';
import { RiskEvaluationModal } from './components/RiskEvaluationModal';

import { 
  INITIAL_FACTOR_WEIGHTS, 
  INITIAL_RISK_CRITERIA, 
  INITIAL_REGULATORY_THRESHOLDS, 
  INITIAL_EVALUATION_RECORDS 
} from './data/initialRiskData';

import { RiskCriterion, FactorWeight, RegulatoryThreshold, EvaluationRecord, Subject } from './types';

export default function App() {
  const [user,setUser]=useState<AccessUser|null>(null);
  const [dashboard,setDashboard]=useState<DashboardData|null>(null);
  const allow=(module:Parameters<typeof can>[1],write=false)=>can(user,module,write);
  const [organization,setOrganization]=useState<OrganizationSettings>(DEFAULT_ORGANIZATION);
  useEffect(()=>{document.title=`${organization.shortName} · ${organization.area}`},[organization.shortName,organization.area]);
  const [theme,setTheme]=useState<ThemeMode>('system');
  const [themeLoaded,setThemeLoaded]=useState(false);
  useEffect(()=>{try{const value=localStorage.getItem('iafas_theme');if(value==='light'||value==='dark'||value==='system')setTheme(value)}catch{}setThemeLoaded(true)},[]);
  useEffect(()=>{if(!themeLoaded)return;const media=window.matchMedia('(prefers-color-scheme: dark)');const apply=()=>{document.documentElement.dataset.theme=theme==='system'?(media.matches?'dark':'light'):theme};apply();media.addEventListener('change',apply);try{localStorage.setItem('iafas_theme',theme)}catch{}return()=>media.removeEventListener('change',apply)},[theme,themeLoaded]);
  const [criteria, setCriteria] = useState<RiskCriterion[]>(INITIAL_RISK_CRITERIA);
  const [factorWeights, setFactorWeights] = useState<FactorWeight[]>(INITIAL_FACTOR_WEIGHTS);
  const [thresholds, setThresholds] = useState<RegulatoryThreshold[]>(INITIAL_REGULATORY_THRESHOLDS);
  const [records, setRecords] = useState<EvaluationRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [legacyRecords, setLegacyRecords] = useState<EvaluationRecord[]>([]);
  const loadState = async () => {
    const data = await request<{criteria:RiskCriterion[];factorWeights:FactorWeight[];thresholds:RegulatoryThreshold[];records:EvaluationRecord[];subjects:Subject[];organization:OrganizationSettings;user:AccessUser;dashboard:DashboardData|null}>();
    setUser(data.user);setDashboard(data.dashboard);setOrganization(data.organization||DEFAULT_ORGANIZATION);setCriteria(data.criteria); setFactorWeights(data.factorWeights); setThresholds(data.thresholds); setRecords(data.records); setSubjects(data.subjects);setLoaded(true);
    setLegacyRecords(prev=>prev.filter(r=>!data.records.some(saved=>saved.id===r.id)));
  };
  useEffect(() => {
    loadState().catch(e=>setServerError(e.message)).finally(()=>setLoading(false));
    try { const previous = JSON.parse(localStorage.getItem('iafas_eval_records') || '[]'); if(Array.isArray(previous))setLegacyRecords(previous); } catch { /* Legacy bytes are left intact. */ }
  }, []);
  const saveConfig = async (patch:Partial<{criteria:RiskCriterion[];factorWeights:FactorWeight[];thresholds:RegulatoryThreshold[]}>) => {
    setSaving(true); setServerError('');
    try { const config = await request<{criteria:RiskCriterion[];factorWeights:FactorWeight[];thresholds:RegulatoryThreshold[]}>('saveSettings',{criteria,factorWeights,thresholds,...patch});setCriteria(config.criteria);setFactorWeights(config.factorWeights);setThresholds(config.thresholds); }
    catch(e){setServerError((e as Error).message);throw e;} finally{setSaving(false);}
  };
  const importRecords = async (items:EvaluationRecord[]) => {
    setSaving(true);setServerError('');
    try {
      if(items===legacyRecords && records.length===0){
        const oldConfig={criteria:JSON.parse(localStorage.getItem('iafas_risk_criteria') || 'null') || criteria,factorWeights:JSON.parse(localStorage.getItem('iafas_factor_weights') || 'null') || factorWeights,thresholds:JSON.parse(localStorage.getItem('iafas_thresholds') || 'null') || thresholds};
        await request('saveSettings',oldConfig);
      }
      await request('importLocal',{records:items}); await loadState();setLegacyRecords([]); }
    catch(e){setServerError((e as Error).message);}finally{setSaving(false);}
  };

  // Main sections: records and risk configuration.
  const [currentTab, setCurrentTab] = useState<string>('monitoreo');

  // Modal states for Consultas and Cargas
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<RiskCriterion | null>(null);
  const [selectedAnalysis,setSelectedAnalysis]=useState<EvaluationRecord|null>(null);
  const [selectedDossier, setSelectedDossier] = useState<EvaluationRecord | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportInitialType, setExportInitialType] = useState<'EXPEDIENTES' | 'PARAMETROS' | 'UMBRALES' | 'ESTADISTICAS'>('EXPEDIENTES');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Responsive Popup Modals: Consulta Rápida and Carga de Operación
  const [isNewEvaluationModalOpen, setIsNewEvaluationModalOpen] = useState(false);
  const [initialEvaluationSubject, setInitialEvaluationSubject] = useState<Partial<Subject> | null>(null);

  useEffect(() => {
    const closeModal = selectedAnalysis ? ()=>setSelectedAnalysis(null) : isAddModalOpen ? () => setIsAddModalOpen(false)
      : isNewEvaluationModalOpen ? handleCloseNewEvaluationModal
      : selectedDossier ? () => setSelectedDossier(null)
      : isExportModalOpen ? () => setIsExportModalOpen(false) : null;
    if (!closeModal) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const getDialog = () => document.querySelector<HTMLElement>('[role="dialog"]') || document.querySelector<HTMLElement>('.fixed.inset-0.z-50 > div');
    const focusables = () => Array.from(getDialog()?.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex="0"]') || []).filter(el => !el.hasAttribute('disabled') && el.getClientRects().length > 0);
    const timer = window.setTimeout(() => focusables()[0]?.focus(), 0);
    const onKey = (event: KeyboardEvent) => {
      if(document.querySelector('[data-subject-editor]'))return;
      if (event.key === 'Escape') { event.preventDefault(); closeModal(); }
      if (event.key === 'Tab') {
        const elements = focusables();
        const first = elements[0], last = elements.at(-1);
        if (event.shiftKey && (document.activeElement === first || !getDialog()?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !getDialog()?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(timer); document.body.style.overflow = overflow; document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [isAddModalOpen, isNewEvaluationModalOpen, selectedDossier, isExportModalOpen, selectedAnalysis]);

  const handleOpenExportModal = (initialType: 'EXPEDIENTES' | 'PARAMETROS' | 'UMBRALES' | 'ESTADISTICAS' = 'EXPEDIENTES') => {
    setExportInitialType(initialType);
    setIsExportModalOpen(true);
  };

  const handleOpenNewEvaluationModal = (subjectData?: typeof initialEvaluationSubject) => {
    setInitialEvaluationSubject(subjectData || null);
    setCurrentTab('monitoreo');
    window.location.hash = '/evaluacion/';
    setIsNewEvaluationModalOpen(true);
  };

  const handleCloseNewEvaluationModal = () => {
    setIsNewEvaluationModalOpen(false);
    setInitialEvaluationSubject(null);
    setCurrentTab('monitoreo');
    if (/evaluacion|simulador/.test(window.location.hash)) {
      window.history.replaceState(null, '', '#/expedientes/');
    }
  };

  // Sync route with URL hash on mount & change
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if(hash.includes('dashboard')||!hash){setCurrentTab('dashboard');setIsNewEvaluationModalOpen(false);
      } else if(hash.includes('usuarios')){setCurrentTab('usuarios');setIsNewEvaluationModalOpen(false);
      } else if (hash.includes('simulador') || hash.includes('evaluacion')) {
        setCurrentTab('monitoreo');
        setIsNewEvaluationModalOpen(true);
        if(hash.includes('dashboard')||!hash){setCurrentTab('dashboard');setIsNewEvaluationModalOpen(false);
      } else if(hash.includes('usuarios')){setCurrentTab('usuarios');setIsNewEvaluationModalOpen(false);
      } else if (hash.includes('simulador')) window.history.replaceState(null, '', '#/evaluacion/');
      } else if (hash.includes('ajustes')) {
        setCurrentTab('ajustes');setIsNewEvaluationModalOpen(false);
      } else if (hash.includes('sujetos')) {
        setCurrentTab('sujetos');setIsNewEvaluationModalOpen(false);
      } else if (hash.includes('normativa') || hash.includes('parametros') || hash.includes('matriz') || hash.includes('umbrales')) {
        setCurrentTab('normativa');
        setIsNewEvaluationModalOpen(false);
      } else {
        setCurrentTab('monitoreo');
        setIsNewEvaluationModalOpen(false);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update hash when tab changes
  const handleTabChange = (tab: string) => {
    if(tab==='dashboard')void loadState().catch(e=>setServerError(e.message));
    setCurrentTab(tab);
    if(tab==='dashboard'||tab==='usuarios'){window.location.hash=`/${tab}/`;
    }else if(tab==='ajustes'){window.location.hash='/ajustes/';
    } else if (tab === 'sujetos') {
      window.location.hash = '/sujetos/';
    } else if (tab === 'normativa') {
      window.location.hash = '/normativa/';
    } else {
      window.location.hash = '/expedientes/';
    }
  };

  const handleSaveCriterion = async (criterion:RiskCriterion) => {
    const next = criteria.some(c=>c.id===criterion.id) ? criteria.map(c=>c.id===criterion.id?criterion:c) : [criterion,...criteria];
    await saveConfig({criteria:next});setEditingCriterion(null);
  };

  const handleEditCriterion = (criterion: RiskCriterion) => {
    setEditingCriterion(criterion);
    setIsAddModalOpen(true);
  };

  const handleResetDefaults = () => {
    if(window.confirm('¿Restablecer criterios, ponderaciones y umbrales a los valores de ejemplo?'))void saveConfig({criteria:INITIAL_RISK_CRITERIA,factorWeights:INITIAL_FACTOR_WEIGHTS,thresholds:INITIAL_REGULATORY_THRESHOLDS}).catch(()=>{});
  };
  const handleSaveEvaluation = async (record:EvaluationRecord):Promise<EvaluationRecord> => {
    const payload={subjectId:record.subjectId,requestId:record.id,record};
    const data=await request<{record:EvaluationRecord;subject:Subject}>('saveEvaluation',payload);
    setRecords(prev=>[data.record,...prev.filter(r=>r.id!==data.record.id)]);setSubjects(prev=>[data.subject,...prev.filter(s=>s.id!==data.subject.id)]);return data.record;
  };
  const handleUpdateRecordStatus = async (id:string,status:EvaluationRecord['status']) => {
    setSaving(true);setServerError('');
    try {const data=await request<{record:EvaluationRecord}>('updateStatus',{id,status});setRecords(prev=>prev.map(r=>r.id===id?data.record:r));}
    catch(e){setServerError((e as Error).message);}finally{setSaving(false);}
  };

  const handleSaveSubject = async (subject:Partial<Subject>):Promise<Subject> => {
    const data=await request<{subject:Subject}>('saveSubject',subject);
    setSubjects(prev=>[data.subject,...prev.filter(s=>s.id!==data.subject.id)]);
    return data.subject;
  };

  // Active alerts count for header
  const activeAlertsCount = records.filter(
    (r) => !['JUSTIFICADO','REPORTE_ROS'].includes(r.status) && (r.status==='ALERTA_EMITIDA'||r.riskLevel==='CRITICO'||r.riskLevel==='ALTO'||r.analysis?.classification==='INUSUAL'||r.analysis?.classification==='SOSPECHOSA'||r.profileAssessment?.comparison==='DESVIACION')
  ).length;

  const tabModules:Record<string,Parameters<typeof can>[1]>={dashboard:'dashboard',monitoreo:'expedientes',sujetos:'sujetos',normativa:'riesgo',ajustes:'ajustes'};
  const permitted=currentTab==='usuarios'?user?.role==='SUPERADMIN':allow(tabModules[currentTab]||'expedientes');
  useEffect(()=>{if(!loaded||permitted)return;const next=Object.keys(tabModules).find(t=>allow(tabModules[t]));if(next)handleTabChange(next);},[loaded,user,currentTab]);
  if(!loading&&!user)return <div className="login-shell"><section className="surface p-8 max-w-md"><span className="workspace-kicker">IAFAS · PLA/FT</span><h1 className="text-2xl font-semibold my-4">Acceso al sistema</h1><p className="text-sm mb-6">{serverError||'Iniciá sesión con una cuenta habilitada por el superadministrador.'}</p><a className="button-primary" target="_top" href={sitePath('/signin-with-chatgpt?return_to=%2F')}>{passwordAuth()?'Iniciar sesión':'Iniciar sesión con ChatGPT'}</a><a className="block mt-5 text-sm underline" target="_top" href={sitePath('/signout-with-chatgpt?return_to=%2F')}>Cambiar cuenta</a></section></div>;
  return (
    <div className="app-shell minimal-ui workspace-ui min-h-screen bg-[#FAFBFC] text-slate-800 flex flex-col font-sans antialiased selection:bg-sky-500 selection:text-white">
      
      {/* Top Header Bar */}
      <Header
        user={user}
        organization={organization}
        theme={theme}
        onToggleTheme={()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark')}
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          handleTabChange(tab);
          setIsMobileMenuOpen(false);
        }}
        activeAlertsCount={activeAlertsCount}
        totalCriteriaCount={criteria.length}
        ready={loaded && !loading}
        status={serverError?'error':loading?'loading':saving?'saving':'connected'}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        onOpenExportModal={() => handleOpenExportModal('EXPEDIENTES')}
        onOpenNewEvaluationModal={() => handleOpenNewEvaluationModal()}
      />

      {serverError && <div role="alert" className="m-4 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">{serverError}{serverError.includes('Iniciá sesión') && <a className="underline ml-3" href={sitePath('/signin-with-chatgpt?return_to=%2F')} target="_top">Iniciar sesión</a>}<button className="underline ml-3" onClick={()=>{setLoading(true);loadState().then(()=>setServerError('')).catch(e=>setServerError(e.message)).finally(()=>setLoading(false))}}>Reintentar conexión</button></div>}
      {currentTab==='monitoreo' && user?.role==='SUPERADMIN' && loaded && legacyRecords.length>0 && <div className="m-4 p-4 bg-white border border-slate-200 rounded-xl text-sm flex flex-wrap items-center justify-between gap-3"><span>Hay {legacyRecords.length} evaluaciones de la versión anterior en este navegador.</span><button disabled={saving} onClick={()=>importRecords(legacyRecords)} className="font-semibold text-teal-800 underline">Importar a la base de datos</button></div>}
      {loading && <p className="p-8 text-slate-500" role="status">Cargando datos…</p>}
      {/* Main Content View with Clean Layout */}
      <main data-section={currentTab} id="contenido" className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {loaded&&!loading&&currentTab==='dashboard'&&dashboard&&<DashboardView data={dashboard} onNavigate={handleTabChange} canOpen={allow('expedientes')}/>}
        {loaded&&!loading&&currentTab==='usuarios'&&user?.role==='SUPERADMIN'&&<UsersView/>}
        {loaded&&!loading&&!permitted&&<p>No tenés módulos asignados. Consultá al superadministrador.</p>}
        {loaded && !loading && allow('expedientes') && currentTab === 'monitoreo' && (
          <AlertsMonitoringView
            organization={organization}
            records={records}
            onUpdateRecordStatus={handleUpdateRecordStatus}
            onViewDossier={setSelectedDossier}
            onAnalyze={allow('analisis',true)?setSelectedAnalysis:undefined}
            onOpenExportModal={handleOpenExportModal}
          />
        )}

        {currentTab==='ajustes'&&allow('ajustes')&&<fieldset disabled={!allow('ajustes',true)}><SystemSettingsView key={loaded?'loaded':'initial'} organization={organization} theme={theme} onThemeChange={setTheme} ready={loaded&&!loading} onSave={async data=>{const result=await request<{organization:OrganizationSettings}>('saveOrganization',data);setOrganization(result.organization)}}/></fieldset>}
        {loaded && !loading && currentTab==='sujetos' && allow('sujetos') && <SubjectsView canEdit={allow('sujetos',true)} canEvaluate={allow('expedientes',true)} criteria={criteria} subjects={subjects} records={records} onSave={handleSaveSubject} onEvaluate={handleOpenNewEvaluationModal} onViewDossier={setSelectedDossier}/>}

        {loaded && !loading && allow('riesgo') && (currentTab === 'normativa' || currentTab === 'parametros' || currentTab === 'matriz' || currentTab === 'umbrales') && (
          <fieldset disabled={!allow('riesgo',true)}><NormativaMatrizView
            thresholds={thresholds}
            onUpdateThresholds={next=>saveConfig({thresholds:next})}
            criteria={criteria}
            factorWeights={factorWeights}
            onUpdateCriteria={next=>{void saveConfig({criteria:next}).catch(()=>{})}}
            onUpdateWeights={next=>{void saveConfig({factorWeights:next}).catch(()=>{})}}
            onOpenAddModal={() => {
              setEditingCriterion(null);
              setIsAddModalOpen(true);
            }}
            onEditCriterion={handleEditCriterion}
            onResetDefaults={handleResetDefaults}
            onOpenExportModal={handleOpenExportModal}
          /></fieldset>
        )}
        {loaded && !loading && currentTab==='monitoreo' && user?.role==='SUPERADMIN' && records.length===0 && <details className="text-xs text-slate-400 max-w-7xl mx-auto w-full"><summary>Opciones de prueba</summary><button disabled={saving} onClick={()=>importRecords(INITIAL_EVALUATION_RECORDS)} className="text-teal-700 underline mt-3">Cargar ejemplos de prueba</button></details>}
      </main>

      {/* Sleek Minimal Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">{organization.shortName}</span>
          <span>·</span>
          <span>{organization.area}</span>
        </div>
        <div className="text-slate-400 text-[11px]">
          Vista previa privada
        </div>
      </footer>

      {/* ======================================================== */}
      {/* RESPONSIVE POPUP MODALS: CONSULTAS & CARGAS              */}
      {/* ======================================================== */}

      {/* 2. Modal Emergente de Carga de Operación / Nueva Evaluación */}
      <RiskEvaluationModal
        thresholds={thresholds}
        records={records}
        canEditSubject={allow('sujetos',true)}
        isOpen={isNewEvaluationModalOpen && !loading && !serverError && allow('expedientes',true)}
        onClose={handleCloseNewEvaluationModal}
        criteria={criteria}
        factorWeights={factorWeights}
        onSaveSubject={handleSaveSubject}
        onSaveEvaluation={handleSaveEvaluation}
        onViewDossier={(rec) => {
          handleCloseNewEvaluationModal();
          setSelectedDossier(rec);
        }}
        initialSubjectData={initialEvaluationSubject}
      />

      {selectedAnalysis&&allow('analisis',true)&&<CaseAnalysisModal key={`${selectedAnalysis.id}-${selectedAnalysis.analysisVersion||0}`} record={selectedAnalysis} onClose={()=>setSelectedAnalysis(null)} onSaved={record=>setRecords(prev=>prev.map(r=>r.id===record.id?record:r))}/>}
      {/* 3. Modal Emergente de Consulta: Ficha Oficial de Riesgo / Expediente */}
      <RiskDossierModal
        organization={organization}
        record={selectedDossier}
        criteria={criteria}
        onAnalyze={allow('analisis',true)?record=>{setSelectedDossier(null);setSelectedAnalysis(record)}:undefined}
        onClose={() => setSelectedDossier(null)}
      />

      {/* 4. Modal Emergente de Carga: Alta / Edición de Parámetro de Matriz */}
      <AddParameterModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingCriterion(null);
        }}
        onSave={handleSaveCriterion}
        editingCriterion={editingCriterion}
      />

      {/* 5. Modal Emergente de Consulta / Descarga: Centro de Exportación */}
      <ExportReportsModal
        organization={organization}
        isOpen={isExportModalOpen && (allow('expedientes')||allow('riesgo'))}
        onClose={() => setIsExportModalOpen(false)}
        records={records}
        criteria={criteria}
        factorWeights={factorWeights}
        thresholds={thresholds}
        initialReportType={exportInitialType}
      />

    </div>
  );
}
