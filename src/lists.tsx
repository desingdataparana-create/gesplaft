import React,{createContext,useContext,useId} from 'react';
import {listOptions,REQUIRED_LISTS,type ListKey,type ListsMap} from './data/lists';
// Listas configuradas y cuáles están desactivadas (sus campos no se muestran en los formularios).
const ListsContext=createContext<{lists?:ListsMap;disabled?:ListKey[]}>({});
export const ListsProvider=ListsContext.Provider;
export const useListOptions=(key:ListKey)=>listOptions(useContext(ListsContext).lists,key);
export const useListEnabled=(key:ListKey)=>REQUIRED_LISTS.includes(key)||!useContext(ListsContext).disabled?.includes(key);
// Muestra su contenido solo si la lista está activa (una lista desmarcada oculta sus campos).
export function IfList({listKey,children}:{listKey:ListKey;children:React.ReactNode}){return useListEnabled(listKey)?<>{children}</>:null;}
type InputProps=Omit<React.InputHTMLAttributes<HTMLInputElement>,'onChange'|'list'>;
// Campo de texto con sugerencias de la lista configurada: se elige o se escribe otro valor.
export function ListInput({listKey,value,onChange,...rest}:InputProps&{listKey:ListKey;value:string;onChange:(v:string)=>void}){
 const id=useId(),options=useListOptions(listKey),enabled=useListEnabled(listKey);
 if(!enabled)return <input {...rest} value={value} onChange={e=>onChange(e.target.value)}/>;
 return <><input {...rest} list={id} value={value} onChange={e=>onChange(e.target.value)} autoComplete="off"/><datalist id={id}>{options.map(o=><option key={o} value={o}/>)}</datalist></>;
}
// Opciones de un desplegable cerrado; conserva el valor actual aunque ya no esté en la lista.
export function ListOptions({listKey,current}:{listKey:ListKey;current?:string}){
 const options=useListOptions(listKey);
 return <>{current&&!options.includes(current)&&<option value={current}>{current}</option>}{options.map(o=><option key={o} value={o}>{o}</option>)}</>;
}
// Desplegable cerrado; si la lista está desactivada se muestra un campo de texto libre.
export function ListSelect({listKey,value,onChange,empty,className,maxLength=120}:{listKey:ListKey;value:string;onChange:(v:string)=>void;empty:string;className?:string;maxLength?:number}){
 const enabled=useListEnabled(listKey);
 if(!enabled)return <input className={className} value={value} maxLength={maxLength} onChange={e=>onChange(e.target.value)}/>;
 return <select className={className} value={value} onChange={e=>onChange(e.target.value)}><option value="">{empty}</option><ListOptions listKey={listKey} current={value}/></select>;
}
