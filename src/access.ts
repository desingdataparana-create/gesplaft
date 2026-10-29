export const MODULES = ['dashboard','expedientes','sujetos','analisis','riesgo','ajustes'] as const;
export type Module = typeof MODULES[number];
export type Grants = Partial<Record<Module,'read'|'write'>>;
export const ROLES = ['SUPERADMIN','ADMIN','ANALISTA','OPERADOR'] as const;
export const ROLE_NAMES = {SUPERADMIN:'Superadministrador',ADMIN:'Administrador',ANALISTA:'Analista / Auditor',OPERADOR:'Operador / Carga'};
export const MODULE_NAMES:Record<Module,string> = {dashboard:'Dashboard',expedientes:'Expedientes',sujetos:'Sujetos',analisis:'Análisis y decisiones',riesgo:'Parámetros de riesgo',ajustes:'Ajustes del sistema'};
export type AccessUser = {id:string;email:string;name:string;role:typeof ROLES[number];active:boolean;grants:Grants};
export const can=(u:AccessUser|null,m:Module,write=false)=>!!u&&u.active&&(u.role==='SUPERADMIN'||(write?u.grants[m]==='write':!!u.grants[m]));
