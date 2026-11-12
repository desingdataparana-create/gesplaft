import React,{useEffect,useRef,useState} from 'react';
import {Palette,Save,RotateCcw,Upload,Trash2,CheckCircle2,Plus} from 'lucide-react';
import type {BrandTheme,OrganizationSettings} from '../types';
import {BRAND_PRESETS,HEX,applyBrand,normalizeBrand,readableOn,setFavicon} from '../brand';

interface Props{organization:OrganizationSettings;onSave:(data:OrganizationSettings)=>Promise<void>;ready:boolean}

const FIELDS:[keyof Omit<BrandTheme,'preset'|'logoStyle'>,string,string][]=[
 ['primary','Color principal','Botones, pestañas, enlaces y resaltados.'],
 ['header','Barra superior','Fondo de la barra de navegación.'],
 ['accent','Botón flotante','El botón «+» de accesos rápidos.'],
 ['login','Pantalla de ingreso','Fondo y botón de la pantalla de login.'],
];

// Colores de la interfaz para toda la organización. Los cambios se ven al instante y se guardan en la base de datos.
export function BrandingCard({organization,onSave,ready}:Props){
 const saved=normalizeBrand(organization.theme);
 const [theme,setTheme]=useState<BrandTheme>(saved),[icon,setIcon]=useState(organization.icon||'');
 const [drafts,setDrafts]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
 const dirty=JSON.stringify(theme)!==JSON.stringify(saved)||icon!==(organization.icon||'');
 // Vista previa en vivo; al salir sin guardar se vuelve a lo guardado.
 useEffect(()=>{applyBrand(theme);setFavicon(icon||undefined)},[theme,icon]);
 const latest=useRef(organization);
 useEffect(()=>{latest.current=organization},[organization]);
 useEffect(()=>()=>{applyBrand(latest.current.theme);setFavicon(latest.current.icon)},[]);
 const update=(patch:Partial<BrandTheme>)=>{setTheme(t=>({...t,...patch}));setDone(false);setError('')};
 const setColor=(key:keyof BrandTheme,value:string)=>{setDrafts(d=>({...d,[key]:value}));if(HEX.test(value))update({[key]:value.toLowerCase(),preset:'personalizado'} as Partial<BrandTheme>)};
 const uploadIcon=async(file?:File)=>{if(!file)return;setError('');try{
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2000000)throw new Error('Elegí un PNG, JPG o WebP de hasta 2 MB.');
  const url=URL.createObjectURL(file);try{const img=await new Promise<HTMLImageElement>((ok,ko)=>{const i=new window.Image();i.onload=()=>ok(i);i.onerror=()=>ko(new Error('No se pudo leer la imagen.'));i.src=url});
   const size=64,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const r=Math.min(size/img.width,size/img.height),w=img.width*r,h=img.height*r;canvas.getContext('2d')!.drawImage(img,(size-w)/2,(size-h)/2,w,h);setIcon(canvas.toDataURL('image/png'));setDone(false);
  }finally{URL.revokeObjectURL(url)}
 }catch(e){setError((e as Error).message)}};
 const save=async()=>{setBusy(true);setError('');setDone(false);try{await onSave({...organization,theme,icon});setDone(true)}catch(e){setError((e as Error).message)}finally{setBusy(false)}};
 const discard=()=>{setTheme(saved);setIcon(organization.icon||'');setDrafts({});setError('');setDone(false)};
 return <section className="surface p-5 sm:p-6 space-y-6">
  <div className="section-title"><span className="icon-tile blue"><Palette size={19}/></span><div><h2>Colores e identidad</h2><p>Se aplican a todos los usuarios de la organización. Los cambios se ven al instante; guardalos para que queden.</p></div></div>

  <div><h3 className="text-sm font-semibold mb-3">Paletas predefinidas</h3>
   <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{BRAND_PRESETS.map(p=><button key={p.id} type="button" className="brand-swatch" aria-pressed={theme.preset===p.id} onClick={()=>{setDrafts({});update({...p.theme,preset:p.id})}}>
    <span className="brand-swatch-colors" aria-hidden="true"><span style={{background:p.theme.header}}/><span style={{background:p.theme.primary}}/><span style={{background:p.theme.accent}}/></span><span className="font-medium">{p.name}</span>
   </button>)}</div>
  </div>

  <div><h3 className="text-sm font-semibold mb-3">Colores personalizados</h3>
   <div className="grid sm:grid-cols-2 gap-4">{FIELDS.map(([key,label,help])=><div key={key} className="brand-color">
    <input type="color" aria-label={label} value={theme[key]} onChange={e=>setColor(key,e.target.value)}/>
    <div className="min-w-0 flex-1"><label className="font-medium block" htmlFor={`brand-${key}`}>{label}</label><p className="text-xs text-slate-500">{help}</p></div>
    <input id={`brand-${key}`} type="text" maxLength={7} spellCheck={false} value={drafts[key]??theme[key]} onChange={e=>setColor(key,e.target.value.trim())} onBlur={()=>setDrafts(d=>{const n={...d};delete n[key];return n})} aria-invalid={drafts[key]!==undefined&&!HEX.test(drafts[key])}/>
   </div>)}</div>
  </div>

  <div className="grid sm:grid-cols-2 gap-6">
   <fieldset><legend className="text-sm font-semibold mb-3">Logo en la barra superior</legend>
    {([['square','Cuadrado, con el nombre al lado'],['wide','Horizontal, sin recuadro (el logo reemplaza al nombre)']] as const).map(([id,label])=><label key={id} className="flex items-center gap-2 text-sm mb-2 cursor-pointer"><input type="radio" name="logoStyle" checked={theme.logoStyle===id} onChange={()=>update({logoStyle:id})}/>{label}</label>)}
    <p className="text-xs text-slate-500">El logo se carga en Configuración → Organización.{!organization.logo&&' Todavía no hay un logo guardado.'}</p>
   </fieldset>
   <div><h3 className="text-sm font-semibold mb-3">Ícono de la pestaña del navegador</h3>
    <div className="flex items-center gap-3">{icon?<img src={icon} alt="Ícono actual" className="w-10 h-10 rounded border border-slate-200 bg-white p-1"/>:<span className="w-10 h-10 rounded border border-dashed border-slate-300"/>}
     <label className="button-secondary cursor-pointer"><Upload size={15}/>Cambiar ícono<input type="file" className="sr-only" accept="image/png,image/jpeg,image/webp" aria-label="Cargar ícono de la pestaña" onChange={e=>{void uploadIcon(e.target.files?.[0]);e.target.value=''}}/></label>
     {icon&&<button type="button" className="button-secondary" onClick={()=>{setIcon('');setDone(false)}}><Trash2 size={14}/>Quitar</button>}</div>
    <p className="text-xs text-slate-500 mt-2">Una imagen cuadrada se ve mejor. Se reduce a 64 × 64.</p>
   </div>
  </div>

  <div><h3 className="text-sm font-semibold mb-3">Vista previa</h3>
   <div className="brand-preview" aria-hidden="true">
    <div className="flex items-center gap-3 px-4 py-3" style={{background:theme.header,color:readableOn(theme.header)}}><strong>{organization.shortName}</strong><span className="text-sm opacity-90">Inicio · Casos · Informes</span></div>
    <div className="flex flex-wrap items-center gap-4 p-4 bg-white"><span className="px-3 py-2 rounded-md text-sm font-medium" style={{background:theme.primary,color:readableOn(theme.primary)}}>Botón principal</span><span className="text-sm font-semibold" style={{color:theme.primary}}>Enlace o pestaña activa</span><span className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:theme.accent,color:readableOn(theme.accent)}}><Plus size={20}/></span><span className="px-3 py-2 rounded-md text-sm" style={{background:theme.login,color:readableOn(theme.login)}}>Pantalla de ingreso</span></div>
   </div>
  </div>

  {error&&<p role="alert" className="p-3 rounded-lg bg-rose-50 text-rose-800 text-sm">{error}</p>}{done&&!dirty&&<p role="status" className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 size={17}/>Los colores se guardaron para toda la organización.</p>}
  <footer className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
   <button type="button" className="button-secondary" disabled={!dirty||busy} onClick={discard}><RotateCcw size={15}/>Descartar cambios</button>
   <button type="button" className="button-primary" disabled={!ready||!dirty||busy} onClick={()=>void save()}><Save size={15}/>{busy?'Guardando…':'Guardar colores'}</button>
  </footer>
 </section>;
}
