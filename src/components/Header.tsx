import {sitePath,passwordAuth} from '../utils/paths';
import type {OrganizationSettings} from '../types';
import type {ThemeMode} from './SystemSettingsView';
import React from 'react';
import {can,ROLE_NAMES,type AccessUser} from '../access';
import {allowedTab,groupOf} from './SectionTabs';
import {FileText,Users,SlidersHorizontal,Download,Plus,ShieldCheck,Settings,Moon,Sun,LockKeyhole} from 'lucide-react';
interface HeaderProps {
 user:AccessUser|null;
 organization:OrganizationSettings;theme:ThemeMode;onToggleTheme:()=>void;
 currentTab:string;setCurrentTab:(tab:string)=>void;activeAlertsCount:number;totalCriteriaCount:number;
 isMobileMenuOpen:boolean;setIsMobileMenuOpen:(open:boolean)=>void;
 onOpenExportModal?:()=>void;onOpenQuickSearchModal?:()=>void;onOpenNewEvaluationModal?:()=>void;
 status?:'loading'|'saving'|'connected'|'error';ready?:boolean;
}
export function Header(p:HeaderProps){
 // Navegación en 4 ítems: Inicio, Casos, Informes y Configuración. Las subsecciones viven dentro de cada uno.
 const firstAllowed=(ids:string[])=>ids.find(id=>allowedTab(p.user,id));
 const casosTarget=firstAllowed(['monitoreo','sujetos']),configTarget=firstAllowed(['normativa','ajustes','usuarios']);
 const items:{id:string;label:string;icon:typeof FileText;active:boolean;onSelect:()=>void}[]=[
  ...(can(p.user,'dashboard')?[{id:'inicio',label:'Inicio',icon:ShieldCheck,active:p.currentTab==='dashboard',onSelect:()=>p.setCurrentTab('dashboard')}]:[]),
  ...(casosTarget?[{id:'casos',label:'Casos',icon:FileText,active:groupOf(p.currentTab)==='casos',onSelect:()=>p.setCurrentTab(groupOf(p.currentTab)==='casos'?p.currentTab:casosTarget)}]:[]),
  ...(can(p.user,'expedientes')&&p.onOpenExportModal?[{id:'informes',label:'Informes',icon:Download,active:false,onSelect:()=>p.onOpenExportModal?.()}]:[]),
  ...(configTarget?[{id:'configuracion',label:'Configuración',icon:SlidersHorizontal,active:groupOf(p.currentTab)==='config',onSelect:()=>p.setCurrentTab(groupOf(p.currentTab)==='config'?p.currentTab:configTarget)}]:[]),
 ];
 const status=p.status==='loading'?'Conectando':p.status==='saving'?'Guardando':p.status==='error'?'Sin conexión':'Conectado';
 return <>
 <a className="skip-link" href="#contenido">Ir al contenido</a>
 <header className="bg-[#143b46] text-white">
  <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-2.5 flex items-center gap-x-6 gap-y-2 flex-wrap">
   <div className="flex items-center gap-2.5 min-w-0">{p.organization.logo?<img className="h-8 w-8 object-contain rounded bg-white/90 p-0.5" src={p.organization.logo} alt={`Logo de ${p.organization.shortName}`}/>:<ShieldCheck size={26} aria-hidden="true"/>}<p className="font-bold text-lg truncate" title={p.organization.legalName}>{p.organization.shortName}<span className="hidden lg:inline font-normal text-sm text-[#dbeaec] ml-2">{p.organization.area}</span></p></div>
   <nav aria-label="Navegación principal" className="flex gap-1 flex-1 flex-wrap">{items.map(({id,label,active,onSelect})=><button key={id} aria-current={active?'page':undefined} onClick={()=>{onSelect();p.setIsMobileMenuOpen(false)}} className={`px-4 py-2.5 rounded-lg text-[15px] cursor-pointer flex items-center gap-2 ${active?'bg-white text-[#143b46] font-semibold':'text-[#dbeaec] font-medium hover:bg-white/10'}`}><span>{label}</span>{id==='casos'&&p.activeAlertsCount>0&&<span className="min-w-5 h-5 px-1.5 rounded-full bg-[#ffd27a] text-[#143b46] text-xs font-bold flex items-center justify-center" aria-label={`${p.activeAlertsCount} alertas abiertas`}>{p.activeAlertsCount}</span>}</button>)}</nav>
   <div className="flex items-center gap-3 flex-wrap">{p.status&&p.status!=='connected'&&<span role="status" className="text-xs text-[#ffd27a]">{status}</span>}<span className="text-sm text-[#dbeaec]" title={p.user?.email}>{p.user?ROLE_NAMES[p.user.role]:'Acceso privado'}</span><a className="workspace-theme" href={sitePath('/signout-with-chatgpt?return_to=%2F')} target="_top" title="Cerrar sesión">Salir</a><button type="button" className="workspace-theme" onClick={p.onToggleTheme} aria-label="Cambiar entre modo claro y oscuro" title="Cambiar tema"><Sun className="theme-sun" size={18}/><Moon className="theme-moon" size={18}/></button>{can(p.user,'expedientes',true)&&<button disabled={!p.ready} onClick={p.onOpenNewEvaluationModal} className="workspace-create"><Plus size={17}/><span>Nueva evaluación</span></button>}</div>
  </div>
 </header>
 </>;
}
