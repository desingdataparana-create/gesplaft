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
 <header className="workspace-header">
  <div className="masthead"><div className="masthead-inner">
   <div className="workspace-brand">{p.organization.logo?<img className="workspace-logo" src={p.organization.logo} alt={`Logo de ${p.organization.shortName}`}/>:<span className="workspace-emblem"><ShieldCheck size={26}/></span>}<div className="min-w-0"><p className="workspace-name">{p.organization.shortName}<span className="workspace-divider">/</span><span className="workspace-area">{p.organization.area}</span></p><p className="workspace-legal">{p.organization.legalName}</p></div></div>
   <div className="workspace-actions"><span className="private-label" title={p.user?.email}><LockKeyhole size={12}/>{p.user?ROLE_NAMES[p.user.role]:'Acceso privado'}</span><a className="workspace-theme" href={sitePath('/signout-with-chatgpt?return_to=%2F')} target="_top" title="Cerrar sesión">Salir</a><button type="button" className="workspace-theme" onClick={p.onToggleTheme} aria-label="Cambiar entre modo claro y oscuro" title="Cambiar tema"><Sun className="theme-sun" size={18}/><Moon className="theme-moon" size={18}/></button>{can(p.user,'expedientes',true)&&<button disabled={!p.ready} onClick={p.onOpenNewEvaluationModal} className="workspace-create"><Plus size={17}/><span>Nueva evaluación</span></button>}</div>
  </div></div>
  <div className="workspace-nav-row"><div className="workspace-nav-inner"><nav aria-label="Navegación principal" className="workspace-nav">{items.map(({id,label,icon:Icon,active,onSelect})=><button key={id} aria-current={active?'page':undefined} onClick={()=>{onSelect();p.setIsMobileMenuOpen(false)}} className={`workspace-nav-item ${active?'active':''}`}><Icon size={16}/><span>{label}</span>{id==='casos'&&p.activeAlertsCount>0&&<span className="workspace-alerts">{p.activeAlertsCount}</span>}</button>)}</nav><div className="workspace-tools"><span role="status" className={`workspace-connection ${p.status==='error'?'error':p.status==='loading'||p.status==='saving'?'pending':''}`}><i/>{status}</span></div></div></div>
 </header>
 </>;
}
