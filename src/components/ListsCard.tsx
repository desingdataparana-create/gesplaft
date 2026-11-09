import React,{useState} from 'react';
import {ListChecks,CheckCircle2,RotateCcw,Save} from 'lucide-react';
import {LIST_DEFS,DEFAULT_LISTS,cleanList,listOptions,type ListKey,type ListsMap} from '../data/lists';
interface Props{lists?:ListsMap;onSave:(lists:ListsMap)=>Promise<void>;ready:boolean}
const toText=(items:string[])=>items.join('\n'),toItems=(text:string)=>cleanList(text.split('\n'));
export function ListsCard({lists,onSave,ready}:Props){
 const [key,setKey]=useState<ListKey>(LIST_DEFS[0].key);
 const [drafts,setDrafts]=useState<Record<string,string>>(()=>Object.fromEntries(LIST_DEFS.map(d=>[d.key,toText(listOptions(lists,d.key))])));
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 const def=LIST_DEFS.find(d=>d.key===key)!,items=toItems(drafts[key]);
 const save=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');setSaved(false);try{
  // Solo se guardan las listas que difieren de las originales; las demás siguen con los valores de fábrica.
  const next:ListsMap={};for(const d of LIST_DEFS){const v=toItems(drafts[d.key]);if(v.length===0)throw new Error(`La lista «${d.label}» no puede quedar vacía.`);if(toText(v)!==toText(DEFAULT_LISTS[d.key]))next[d.key]=v}
  await onSave(next);setDrafts(Object.fromEntries(LIST_DEFS.map(d=>[d.key,toText(toItems(drafts[d.key]))])));setSaved(true);
 }catch(err){setError((err as Error).message)}finally{setBusy(false)}};
 return <form className="surface p-5 sm:p-6 space-y-4" onSubmit={save}>
  <div className="section-title"><span className="icon-tile violet"><ListChecks size={19}/></span><div><h2>Listas desplegables</h2><p>Opciones que aparecen al cargar sujetos y operaciones. Cambiarlas no modifica lo ya cargado.</p></div></div>
  <label className="field-label">Lista a editar<select aria-label="Lista a editar" value={key} onChange={e=>{setKey(e.target.value as ListKey);setSaved(false)}}>{LIST_DEFS.map(d=><option key={d.key} value={d.key}>{d.label}</option>)}</select></label>
  <label className="field-label">{def.label}: una opción por línea
   <textarea aria-label={def.label} rows={10} value={drafts[key]} onChange={e=>{setDrafts(p=>({...p,[key]:e.target.value}));setSaved(false)}} className="font-mono text-sm"/>
   <span className="text-[11px] font-normal text-slate-500">{items.length} opciones · Se usa en: {def.use}. {'select' in def&&def.select?'Es una lista cerrada: solo se puede elegir de ella.':'Se puede elegir de la lista o escribir otro valor.'}</span>
  </label>
  {error&&<p role="alert" className="p-3 rounded-lg bg-rose-50 text-rose-800 text-sm">{error}</p>}
  {saved&&<p role="status" className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 size={17}/>Las listas se guardaron.</p>}
  <footer className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
   <button type="button" className="button-secondary" disabled={busy} onClick={()=>{setDrafts(p=>({...p,[key]:toText(DEFAULT_LISTS[key])}));setSaved(false)}}><RotateCcw size={15}/>Restaurar esta lista</button>
   <button className="button-primary" disabled={!ready||busy}><Save size={15}/>{busy?'Guardando…':'Guardar listas'}</button>
  </footer>
 </form>;
}
