import React,{createContext,useContext,useId} from 'react';
import {listOptions,type ListKey,type ListsMap} from './data/lists';
const ListsContext=createContext<ListsMap|undefined>(undefined);
export const ListsProvider=ListsContext.Provider;
export const useListOptions=(key:ListKey)=>listOptions(useContext(ListsContext),key);
type InputProps=Omit<React.InputHTMLAttributes<HTMLInputElement>,'onChange'|'list'>;
// Campo de texto con sugerencias de la lista configurada: se elige o se escribe otro valor.
export function ListInput({listKey,value,onChange,...rest}:InputProps&{listKey:ListKey;value:string;onChange:(v:string)=>void}){
 const id=useId(),options=useListOptions(listKey);
 return <><input {...rest} list={id} value={value} onChange={e=>onChange(e.target.value)} autoComplete="off"/><datalist id={id}>{options.map(o=><option key={o} value={o}/>)}</datalist></>;
}
// Opciones de un desplegable cerrado; conserva el valor actual aunque ya no esté en la lista.
export function ListOptions({listKey,current}:{listKey:ListKey;current?:string}){
 const options=useListOptions(listKey);
 return <>{current&&!options.includes(current)&&<option value={current}>{current}</option>}{options.map(o=><option key={o} value={o}>{o}</option>)}</>;
}
