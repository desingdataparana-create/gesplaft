import React from 'react';
import {can,type AccessUser} from '../access';
type Tab={id:string;label:string};
const GROUPS:Record<string,{label:string;tabs:Tab[]}>={
 casos:{label:'Tipo de caso',tabs:[{id:'monitoreo',label:'Expedientes'},{id:'sujetos',label:'Sujetos'}]},
 config:{label:'Secciones de configuración',tabs:[{id:'normativa',label:'Parámetros de riesgo'},{id:'umbrales',label:'Umbrales'},{id:'matriz',label:'Matriz'},{id:'ajustes',label:'Organización'},{id:'usuarios',label:'Usuarios y permisos'}]},
};
const MODULE:Record<string,Parameters<typeof can>[1]|'users'>={monitoreo:'expedientes',sujetos:'sujetos',normativa:'riesgo',umbrales:'riesgo',matriz:'riesgo',ajustes:'ajustes',usuarios:'users'};
export const groupOf=(tab:string)=>['monitoreo','sujetos'].includes(tab)?'casos':['normativa','parametros','matriz','umbrales','ajustes','usuarios'].includes(tab)?'config':null;
export const allowedTab=(user:AccessUser|null,id:string)=>MODULE[id]==='users'?user?.role==='SUPERADMIN':can(user,MODULE[id] as Parameters<typeof can>[1]);
export function SectionTabs({user,currentTab,onChange}:{user:AccessUser|null;currentTab:string;onChange:(tab:string)=>void}){
 const key=groupOf(currentTab);if(!key)return null;
 const group=GROUPS[key],tabs=group.tabs.filter(t=>allowedTab(user,t.id));if(tabs.length<2)return null;
 const active=currentTab==='parametros'?'normativa':currentTab;
 if(key==='casos')return <>
  <div className="flex flex-col gap-1"><h1 className="text-3xl font-bold text-slate-900">Casos</h1><p className="text-base text-slate-600">Expedientes y sujetos en un solo lugar.</p></div>
  <div role="tablist" aria-label={group.label} className="inline-flex self-start bg-[#e6eef0] rounded-[10px] p-1 gap-1">{tabs.map(t=><button key={t.id} role="tab" type="button" aria-selected={active===t.id} onClick={()=>onChange(t.id)} className={`px-5 py-2.5 rounded-lg text-[15px] cursor-pointer ${active===t.id?'bg-white text-teal-900 font-semibold shadow-xs':'text-[#35505a] font-medium hover:text-teal-900'}`}>{t.label}</button>)}</div>
 </>;
 return <>
  <div className="flex flex-col gap-1"><h1 className="text-3xl font-bold text-slate-900">Configuración</h1><p className="text-base text-slate-600">Cada persona ve solo las secciones para las que tiene permiso.</p></div>
  <div role="tablist" aria-label={group.label} className="flex flex-wrap gap-1 border-b border-slate-200">{tabs.map(t=><button key={t.id} role="tab" type="button" aria-selected={active===t.id} onClick={()=>onChange(t.id)} className={`px-4 py-3 text-[15px] cursor-pointer border-b-[3px] -mb-px ${active===t.id?'font-bold text-teal-900 border-teal-700':'font-medium text-slate-600 border-transparent hover:text-slate-900'}`}>{t.label}</button>)}</div>
 </>;
}
