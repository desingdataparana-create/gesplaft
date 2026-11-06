import React,{useState} from 'react';
import {Download,ShieldCheck,CheckCircle2} from 'lucide-react';
import {sitePath} from '../utils/paths';
import {encryptBackup} from '../utils/backupCrypto';

type SavePicker=(o:{suggestedName:string;types:{description:string;accept:Record<string,string[]>}[]})=>Promise<{createWritable:()=>Promise<{write:(d:Blob)=>Promise<void>;close:()=>Promise<void>}>}>;

export function BackupCard(){
 const [password,setPassword]=useState(''),[repeat,setRepeat]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState('');
 const download=async(e:React.FormEvent)=>{e.preventDefault();setError('');setDone('');
  if(password&&password.length<8)return setError('La contraseña debe tener al menos 8 caracteres.');
  if(password!==repeat)return setError('Las contraseñas no coinciden.');
  setBusy(true);
  try{
   const name=`gesplaft-respaldo-${new Date().toISOString().slice(0,10)}${password?'.cifrado':''}.json`;
   // Si el navegador lo permite, el usuario elige la carpeta y el nombre. Se pide antes de descargar para conservar el permiso del clic.
   const picker=(window as unknown as {showSaveFilePicker?:SavePicker}).showSaveFilePicker;
   let handle:Awaited<ReturnType<SavePicker>>|null=null;
   if(picker){try{handle=await picker({suggestedName:name,types:[{description:'Respaldo de GesPLAFT',accept:{'application/json':['.json']}}]})}catch(err){if((err as Error).name==='AbortError')return;handle=null}}
   const r=await fetch(sitePath('/api/backup'),{cache:'no-store'});
   if(!r.ok){const d=await r.json().catch(()=>({})) as {error?:string};throw new Error(d.error||'No se pudo generar el respaldo.')}
   const text=await r.text(),blob=new Blob([password?await encryptBackup(text,password):text],{type:'application/json'});
   if(handle){const w=await handle.createWritable();await w.write(blob);await w.close()}
   else{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)}
   setDone(handle?'El respaldo se guardó en el lugar que elegiste.':'El respaldo se descargó. Revisá tu carpeta de descargas y guardalo en un lugar seguro.');setPassword('');setRepeat('');
  }catch(err){setError((err as Error).message)}finally{setBusy(false)}};
 return <form className="surface p-5 sm:p-6 space-y-4" onSubmit={download}>
  <div className="section-title"><span className="icon-tile blue"><ShieldCheck size={19}/></span><div><h2>Respaldo de los datos</h2><p>Descargá una copia de sujetos, expedientes, parámetros y usuarios, y guardala donde prefieras.</p></div></div>
  <div className="grid sm:grid-cols-2 gap-4">
   <label className="field-label">Contraseña del archivo (recomendado)<input type="password" autoComplete="new-password" maxLength={200} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 8 caracteres"/></label>
   <label className="field-label">Repetir contraseña<input type="password" autoComplete="new-password" maxLength={200} value={repeat} onChange={e=>setRepeat(e.target.value)} disabled={!password}/></label>
  </div>
  <p className="text-xs text-slate-500">El respaldo contiene datos personales de sujetos y operaciones. Con contraseña, el archivo se cifra en tu navegador y solo se abre con ella; <strong>si la perdés, no se puede recuperar</strong>. Las contraseñas de acceso al sistema nunca se incluyen.</p>
  {error&&<p role="alert" className="p-3 rounded-lg bg-rose-50 text-rose-800 text-sm">{error}</p>}
  {done&&<p role="status" className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 size={17}/>{done}</p>}
  <footer className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100"><p className="text-xs text-slate-500">Cada descarga queda registrada en la auditoría.</p><button className="button-primary" disabled={busy}><Download size={15}/>{busy?'Preparando…':'Descargar respaldo'}</button></footer>
 </form>;
}
