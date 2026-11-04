import type {OperationType, OrganizationSettings} from '../types';
export const DEFAULT_OPERATION_TYPES:OperationType[]=[
 {code:'COBRO_PREMIO',name:'Cobro de premio',active:true,uifScope:'PISO'},
 {code:'APUESTA_PRESENCIAL',name:'Apuesta presencial',active:true,uifScope:'NO_APLICA'},
 {code:'APUESTA_ONLINE',name:'Juego en línea',active:true,uifScope:'SIEMPRE'},
 {code:'CAMBIO_FICHAS',name:'Conversión de valores / cambio de fichas',active:true,uifScope:'PISO'},
 {code:'ALTA_AGENCIA',name:'Alta de agencia / intermediario',active:true,uifScope:'NO_APLICA'},
];
export const operationTypesFor=(org?:Partial<OrganizationSettings>)=>org?.operationTypes??DEFAULT_OPERATION_TYPES;
export function operationLabel(record:{operationType:string;operationTypeName?:string}){
 return record.operationTypeName||DEFAULT_OPERATION_TYPES.find(t=>t.code===record.operationType)?.name||record.operationType.replaceAll('_',' ');
}
