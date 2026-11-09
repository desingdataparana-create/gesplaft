import {sitePath} from '../utils/paths';
import React,{useEffect,useId,useState} from 'react';
import type {Subject} from '../types';
interface Props{value:string;linked:boolean;onChange:(name:string)=>void;onSelect:(subject:Subject)=>void}
const TYPES:Record<Subject['subjectType'],string>={PERSONA_FISICA:'Persona física',PERSONA_JURIDICA:'Persona jurídica',AGENCIA:'Agencia'};
export function SubjectNameField({value,linked,onChange,onSelect}:Props){
 const id=useId();
 const [matches,setMatches]=useState<Subject[]>([]),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  setMatches([]);setDone(false);setError('');
  if(linked||value.trim().length<2){setBusy(false);return;}
  const controller=new AbortController();setBusy(true);
  const timer=setTimeout(async()=>{try{const response=await fetch(sitePath('/api/data?kind=subjects&q=')+encodeURIComponent(value.trim()),{cache:'no-store',signal:controller.signal});const data=await response.json() as {subjects:Subject[];error?:string};if(!response.ok)throw new Error(data.error||'No se pudo buscar.');if(!controller.signal.aborted){setMatches(data.subjects);setDone(true)}}catch(err){if(!controller.signal.aborted)setError((err as Error).message)}finally{if(!controller.signal.aborted)setBusy(false)}},250);
  return()=>{clearTimeout(timer);controller.abort()};
 },[value,linked]);
 const searching=!linked&&value.trim().length>=2;
 return <div className="space-y-3">
  <label htmlFor={id} className="flex flex-col gap-1.5 text-sm font-semibold text-slate-800">Buscar sujeto
   <input id={id} type="search" autoComplete="off" value={value} placeholder="Nombre o documento" onChange={e=>onChange(e.target.value)} className="w-full py-3 px-3 bg-white border border-slate-300 rounded-lg text-base font-normal text-slate-900 focus:border-teal-600"/>
   <span className="text-xs font-normal text-slate-500">{linked?'Sujeto registrado: la operación usa su ficha existente.':'Por nombre o documento. No distingue tildes ni mayúsculas.'}</span>
  </label>
  {searching&&<fieldset className="space-y-2 min-w-0"><legend className="text-sm font-semibold text-slate-800 mb-1">Resultados</legend>
   {busy&&<p role="status" className="text-sm text-slate-500">Buscando…</p>}
   {error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}
   {matches.map(s=><label key={s.id} className="flex items-center gap-3 p-3.5 border border-slate-300 rounded-lg cursor-pointer hover:bg-teal-50/60 has-[:checked]:border-2 has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50"><input type="radio" name={id+'-subject'} className="w-5 h-5 accent-teal-700 shrink-0" onChange={()=>onSelect(s)}/><span className="flex flex-col min-w-0"><strong className="text-base text-slate-900">{s.subjectName}</strong><span className="text-sm text-slate-600">Documento {s.taxId} · {TYPES[s.subjectType]}</span></span></label>)}
   {done&&!matches.length&&<p role="status" className="text-sm text-slate-600">No encontramos coincidencias. Usá «El sujeto no existe: crear uno nuevo».</p>}
  </fieldset>}
 </div>;
}
