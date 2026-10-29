import {sitePath,passwordAuth} from '../utils/paths';
import React,{useEffect,useId,useState} from 'react';
import type {Subject} from '../types';
interface Props{value:string;linked:boolean;onChange:(name:string)=>void;onSelect:(subject:Subject)=>void}
export function SubjectNameField({value,linked,onChange,onSelect}:Props){
 const listId=useId();
 const [matches,setMatches]=useState<Subject[]>([]),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState(''),[active,setActive]=useState(-1);
 useEffect(()=>{
  setMatches([]);setActive(-1);setDone(false);setError('');
  if(linked||value.trim().length<2){setBusy(false);setOpen(false);return;}
  const controller=new AbortController();setBusy(true);setOpen(true);
  const timer=setTimeout(async()=>{try{const response=await fetch(sitePath('/api/data?kind=subjects&q=')+encodeURIComponent(value.trim()),{cache:'no-store',signal:controller.signal});const data=await response.json() as {subjects:Subject[];error?:string};if(!response.ok)throw new Error(data.error||'No se pudo buscar.');if(!controller.signal.aborted){setMatches(data.subjects);setDone(true)}}catch(err){if(!controller.signal.aborted)setError((err as Error).message)}finally{if(!controller.signal.aborted)setBusy(false)}},250);
  return()=>{clearTimeout(timer);controller.abort()};
 },[value,linked]);
 const choose=(subject:Subject)=>{setOpen(false);setActive(-1);onSelect(subject)};
 return <div className="sm:col-span-2 relative">
  <label htmlFor={listId+'-input'} className="block text-xs font-medium text-slate-600 mb-1.5">Nombre completo / Razón social</label>
  <input id={listId+'-input'} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-activedescendant={open&&active>=0?`${listId}-${active}`:undefined} autoComplete="off" value={value} placeholder="Escribí el nombre de un sujeto registrado" onChange={e=>onChange(e.target.value)} onFocus={()=>{if(!linked&&value.trim().length>=2)setOpen(true)}} onBlur={()=>setOpen(false)} onKeyDown={e=>{
    if(e.key==='ArrowDown'&&matches.length){e.preventDefault();setOpen(true);setActive(i=>Math.min(i+1,matches.length-1))}
    else if(e.key==='ArrowUp'&&matches.length){e.preventDefault();setOpen(true);setActive(i=>Math.max(i-1,0))}
    else if(e.key==='Enter'&&open){e.preventDefault();if(active>=0&&matches[active])choose(matches[active])}
    else if(e.key==='Escape'&&open){e.stopPropagation();setOpen(false)}
   }} className="w-full py-2.5 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-teal-600"/>
  {open&&<div className="absolute left-0 right-0 top-full mt-1 surface shadow-lg z-20 max-h-64 overflow-y-auto">
    {busy&&<p role="status" className="p-3 text-xs text-slate-500">Buscando personas registradas…</p>}
    {error&&<p role="alert" className="p-3 text-xs text-rose-700">{error}</p>}
    <ul id={listId} role="listbox" aria-label="Personas registradas">{matches.map((s,i)=><li key={s.id} id={`${listId}-${i}`} role="option" aria-selected={active===i} onMouseDown={e=>e.preventDefault()} onMouseEnter={()=>setActive(i)} onClick={()=>choose(s)} className={`cursor-pointer p-3 border-b last:border-b-0 border-slate-100 text-sm ${active===i?'bg-teal-50':'hover:bg-slate-50'}`}><span className="block font-medium text-slate-800">{s.subjectName}</span><span className="block text-xs text-slate-500 mt-1">{s.taxId}{s.email?` · ${s.email}`:''}</span></li>)}</ul>
    {done&&!matches.length&&<p role="status" className="p-3 text-xs text-slate-500">No encontramos coincidencias. Usá «Nuevo sujeto» para registrar su ficha.</p>}
  </div>}
  <p className="text-[11px] text-slate-400 mt-1.5">{linked?'Sujeto registrado: la operación utilizará su ficha existente.':'Si la persona ya existe, seleccioná su nombre en las sugerencias.'}</p>
 </div>;
}
