import type {BrandTheme} from './types';

// Paletas listas para elegir en Configuración → Apariencia. «IAFAS» reproduce los colores originales.
export const BRAND_PRESETS:{id:string;name:string;theme:Omit<BrandTheme,'preset'|'logoStyle'>}[]=[
 {id:'iafas',name:'IAFAS (original)',theme:{primary:'#176f78',header:'#143b46',accent:'#d9a75d',login:'#143b46'}},
 {id:'neo',name:'Neo Paraná',theme:{primary:'#de142e',header:'#de142e',accent:'#de142e',login:'#de142e'}},
 {id:'azul',name:'Azul institucional',theme:{primary:'#1d4ed8',header:'#1e3a8a',accent:'#f59e0b',login:'#1e3a8a'}},
 {id:'verde',name:'Verde',theme:{primary:'#15803d',header:'#14532d',accent:'#eab308',login:'#14532d'}},
 {id:'violeta',name:'Violeta',theme:{primary:'#6d28d9',header:'#3b0764',accent:'#f472b6',login:'#3b0764'}},
 {id:'grafito',name:'Grafito',theme:{primary:'#334155',header:'#0f172a',accent:'#38bdf8',login:'#0f172a'}},
];
export const DEFAULT_BRAND:BrandTheme={preset:'iafas',...BRAND_PRESETS[0].theme,logoStyle:'square'};
export const HEX=/^#[0-9a-fA-F]{6}$/;

export function normalizeBrand(t?:Partial<BrandTheme>|null):BrandTheme{
 const pick=(v:unknown,d:string)=>typeof v==='string'&&HEX.test(v)?v.toLowerCase():d;
 return {preset:typeof t?.preset==='string'?t.preset:'personalizado',primary:pick(t?.primary,DEFAULT_BRAND.primary),header:pick(t?.header,DEFAULT_BRAND.header),accent:pick(t?.accent,DEFAULT_BRAND.accent),login:pick(t?.login,DEFAULT_BRAND.login),logoStyle:t?.logoStyle==='wide'?'wide':'square'};
}

// Texto blanco u oscuro según el contraste con el fondo (WCAG).
function luminance(hex:string){const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];}
export function readableOn(hex:string){const l=luminance(hex);return (1.05)/(l+.05)>=(l+.05)/(0.0175+.05)?'#ffffff':'#172033';}

const mix=(color:string,pct:number,base:'white'|'black')=>`color-mix(in oklab, ${color} ${pct}%, ${base})`;
const STORAGE='gesplaft_brand';

// Aplica los colores como variables CSS. También redefine la escala «teal» de Tailwind, que usan los componentes.
export function applyBrand(input?:Partial<BrandTheme>|null){
 if(typeof document==='undefined')return;
 const t=normalizeBrand(input),s=document.documentElement.style;
 const vars:Record<string,string>={
  '--brand':t.primary,'--brand-strong':mix(t.primary,80,'black'),'--brand-soft':mix(t.primary,10,'white'),'--brand-on':readableOn(t.primary),
  '--brand-header':t.header,'--brand-on-header':readableOn(t.header),
  '--brand-accent':t.accent,'--brand-accent-strong':mix(t.accent,82,'black'),'--brand-on-accent':readableOn(t.accent),
  '--color-teal-50':mix(t.primary,7,'white'),'--color-teal-100':mix(t.primary,14,'white'),'--color-teal-200':mix(t.primary,28,'white'),'--color-teal-300':mix(t.primary,48,'white'),'--color-teal-400':mix(t.primary,72,'white'),'--color-teal-500':mix(t.primary,88,'white'),'--color-teal-600':t.primary,'--color-teal-700':mix(t.primary,85,'black'),'--color-teal-800':mix(t.primary,70,'black'),'--color-teal-900':mix(t.primary,55,'black'),'--color-teal-950':mix(t.primary,35,'black'),
 };
 for(const [k,v] of Object.entries(vars))s.setProperty(k,v);
 document.documentElement.dataset.logoStyle=t.logoStyle;
}
export function rememberBrand(t?:Partial<BrandTheme>|null){try{localStorage.setItem(STORAGE,JSON.stringify(normalizeBrand(t)))}catch{/* sin almacenamiento local */}}
// Al abrir la página se usan los últimos colores conocidos, para que no aparezcan los originales mientras cargan los datos.
export function applyRememberedBrand(){try{const v=localStorage.getItem(STORAGE);if(v)applyBrand(JSON.parse(v));}catch{/* sin almacenamiento local */}}

export function setFavicon(dataUrl?:string){
 if(typeof document==='undefined')return;
 let link=document.querySelector<HTMLLinkElement>('link[rel="icon"]');
 if(!dataUrl){link?.remove();return;}
 if(!link){link=document.createElement('link');link.rel='icon';document.head.appendChild(link);}
 link.href=dataUrl;
}
