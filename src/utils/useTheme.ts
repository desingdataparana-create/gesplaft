import {useSyncExternalStore} from 'react';
import type {ThemeMode} from '../components/SystemSettingsView';
const read=():ThemeMode=>{try{const v=localStorage.getItem('iafas_theme');if(v==='dark'||v==='light')return v;}catch{}return 'system';};
const subscribe=(notify:()=>void)=>{window.addEventListener('storage',notify);window.addEventListener('gesplaft-theme',notify);return()=>{window.removeEventListener('storage',notify);window.removeEventListener('gesplaft-theme',notify)}};
export function useTheme(){const theme=useSyncExternalStore(subscribe,read,()=> 'system' as ThemeMode);const setTheme=(mode:ThemeMode)=>{try{localStorage.setItem('iafas_theme',mode)}catch{}window.dispatchEvent(new Event('gesplaft-theme'));};return [theme,setTheme] as const;}
