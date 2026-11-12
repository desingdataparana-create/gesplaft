import React,{useEffect,useRef,useState} from 'react';
import {Plus,X,FilePlus2,FileText,Users,Download} from 'lucide-react';

export interface FloatingAction {id:string;label:string;icon:typeof Plus;onSelect:()=>void;primary?:boolean}

// Menú flotante de acceso rápido (abajo a la derecha). Reemplaza el botón "Nueva evaluación" del encabezado.
export function FloatingActions({actions,disabled,hidden}:{actions:FloatingAction[];disabled?:boolean;hidden?:boolean}){
 const [open,setOpen]=useState(false);
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!open)return;
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};
  const onClick=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false)};
  document.addEventListener('keydown',onKey);document.addEventListener('mousedown',onClick);
  return()=>{document.removeEventListener('keydown',onKey);document.removeEventListener('mousedown',onClick)};
 },[open]);
 useEffect(()=>{if(hidden)setOpen(false)},[hidden]);
 if(hidden||actions.length===0)return null;
 return <div ref={ref} className="fab-root print:hidden fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
  {open&&<ul id="fab-menu" aria-label="Accesos rápidos" className="flex flex-col items-end gap-2.5 m-0 p-0 list-none">
   {actions.map(({id,label,icon:Icon,onSelect,primary},i)=><li key={id} className="fab-item flex items-center gap-3" style={{animationDelay:`${(actions.length-1-i)*35}ms`}}>
    <span className="fab-label rounded-md bg-[#143b46] text-white text-sm font-medium px-3 py-1.5 shadow-lg whitespace-nowrap">{label}</span>
    <button type="button" disabled={disabled} aria-label={label} title={label} onClick={()=>{setOpen(false);onSelect()}}
     className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-105 disabled:opacity-60 ${primary?'bg-[#d9a75d] text-[#172d3f] hover:bg-[#eac087]':'bg-white text-[#143b46] border border-slate-200 hover:bg-slate-50'}`}>
     <Icon size={20} aria-hidden="true"/>
    </button>
   </li>)}
  </ul>}
  <button type="button" aria-expanded={open} aria-controls="fab-menu" aria-label={open?'Cerrar accesos rápidos':'Abrir accesos rápidos'} title={open?'Cerrar':'Accesos rápidos'}
   onClick={()=>setOpen(o=>!o)}
   className="fab-main w-14 h-14 rounded-full bg-[#d9a75d] text-[#172d3f] shadow-xl flex items-center justify-center cursor-pointer hover:bg-[#eac087] transition-transform">
   {open?<X size={26} aria-hidden="true"/>:<Plus size={28} aria-hidden="true"/>}
  </button>
 </div>;
}

export const FAB_ICONS={FilePlus2,FileText,Users,Download};
