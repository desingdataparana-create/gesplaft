import {sitePath,passwordAuth} from './paths';
export async function request<T>(action?: string, payload?: unknown): Promise<T> {
  const response = await fetch(sitePath('/api/data'), action ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,payload})} : {cache:'no-store'});
  const data = await response.json().catch(()=>({error:'No se pudo leer la respuesta del servidor.'})) as {error?:string} & T;
  if(!response.ok) throw new Error(data.error || 'No se pudo guardar. Intentá nuevamente.');
  return data as T;
}
