export function sitePath(path:string){return (typeof document==='undefined'?'':document.documentElement.dataset.basePath||'')+path;}
export function passwordAuth(){return typeof document!=='undefined'&&document.documentElement.dataset.authMode==='password';}
