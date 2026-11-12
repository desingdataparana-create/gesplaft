import React,{useState} from 'react';
import {ListChecks,CheckCircle2,RotateCcw,Save} from 'lucide-react';
import {LIST_DEFS,REQUIRED_LISTS,DEFAULT_LISTS,cleanList,listOptions,type ListKey,type ListsMap} from '../data/lists';
interface Props{lists?:ListsMap;disabled?:ListKey[];onSave:(lists:ListsMap,disabled:ListKey[])=>Promise<void>;ready:boolean}
const toText=(items:string[])=>items.join('\n'),toItems=(text:string)=>cleanList(text.split('\n'));
export function ListsCard({lists,disabled,onSave,ready}:Props){
 const [off,setOff]=useState<ListKey[]>(disabled||[]);
 const [key,setKey]=useState<ListKey>(LIST_DEFS[0].key);
 const [drafts,setDrafts]=useState<Record<string,string>>(()=>Object.fromEntries(LIST_DEFS.map(d=>[d.key,toText(listOptions(lists,d.key))])));
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 const def=LIST_DEFS.find(d=>d.key===key)!,items=toItems(drafts[key]);
 const save=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');setSaved(false);try{
  // Solo se guardan las listas que difieren de las originales; las demás siguen con los valores de fábrica.
  const next:ListsMap={};for(const d of LIST_DEFS){const v=toItems(drafts[d.key]);if(v.length===0&&!off.includes(d.key))throw new Error(`La lista «${d.label}» no puede quedar vacía.`);if(toText(v)!==toText(DEFAULT_LISTS[d.key]))next[d.key]=v}
  await onSave(next,off);setDrafts(Object.fromEntries(LIST_DEFS.map(d=>[d.key,toText(toItems(drafts[d.key]))])));setSaved(true);
 }catch(err){setError((err as Error).message)}finally{setBusy(false)}};
 return <form className="surface p-5 sm:p-6 space-y-4" onSubmit={save}>
  <div className="section-title"><span className="icon-tile violet"><ListChecks size={19}/></span><div><h2>Listas desplegables</h2><p>Opciones que aparecen al cargar sujetos y operaciones. Cambiarlas no modifica lo ya cargado.</p></div></div>
  <fieldset><legend className="text-sm font-semibold mb-1">Listas que se usan</legend><p className="text-xs text-slate-500 mb-3">Desmarcá una lista para quitar ese campo de los formularios. Las obligatorias no se pueden quitar.</p>
   <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">{LIST_DEFS.map(d=><label key={d.key} className="flex items-start gap-2 text-sm cursor-pointer"><input type="checkbox" className="mt-1" disabled={REQUIRED_LISTS.includes(d.key)} checked={!off.includes(d.key)} onChange={e=>{setOff(p=>e.target.checked?p.filter(k=>k!==d.key):[...p,d.key]);setSaved(false)}}/><span><span className="font-medium">{d.label}{REQUIRED_LISTS.includes(d.key)&&<span className="text-xs font-normal text-slate-500"> (obligatoria)</span>}</span><span className="block text-xs text-slate-500">{d.use}</span></span></label>)}</div>
  </fieldset>
  <label className="field-label">Lista a editar<select aria-label="Lista a editar" value={key} onChange={e=>{setKey(e.target.value as ListKey);setSaved(false)}}>{LIST_DEFS.map(d=><option key={d.key} value={d.key}>{d.label}</option>)}</select></label>
  <label className="field-label">{def.label}: una opción por línea
   <textarea aria-label={def.label} rows={10} value={drafts[key]} onChange={e=>{setDrafts(p=>({...p,[key]:e.target.value}));setSaved(false)}} className="font-mono text-sm"/>
   <span className="text-[11px] font-normal text-slate-500">{off.includes(key)&&<strong className="text-amber-700">Lista desactivada: el campo no aparece en los formularios. </strong>}{items.length} opciones · Se usa en: {def.use}. {off.includes(key)?'':'select' in def&&def.select?'Es una lista cerrada: solo se puede elegir de ella.':'Se puede elegir de la lista o escribir otro valor.'}</span>
  </label>
  {error&&<p role="alert" className="p-3 rounded-lg bg-rose-50 text-rose-800 text-sm">{error}</p>}
  {saved&&<p role="status" className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 size={17}/>Las listas se guardaron.</p>}
  <footer className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
   <button type="button" className="button-secondary" disabled={busy} onClick={()=>{setDrafts(p=>({...p,[key]:toText(DEFAULT_LISTS[key])}));setSaved(false)}}><RotateCcw size={15}/>Restaurar esta lista</button>
   <button className="button-primary" disabled={!ready||busy}><Save size={15}/>{busy?'Guardando…':'Guardar listas'}</button>
  </footer>
 </form>;
}
