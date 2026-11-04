import {normalizeText,IMPORT_LIMIT} from './operationImport';
export const HISTORICAL_HEADERS=['FECHA DE COBRO','NOMBRE Y APELLIDO','DNI','CUIT/CUIL','NACIONALIDAD','SALA','IMPORTE','MEDIO DE PAGO','PROFESION','PEP(S/N)','SITUACION CENTRAL DE DEUDORES BCRA','NIVEL DE RIESGO'] as const;
export type HistoricalRow={_fila:number;values:string[]};
export function historicalRows(matrix:unknown[][]):HistoricalRow[]|null{
 const headers=matrix[0]?.map(v=>normalizeText(String(v??'')));
 if(!headers||!HISTORICAL_HEADERS.every((h,i)=>headers[i]===h)||headers.length!==12)return null;
 const rows=matrix.slice(1).flatMap((r,i)=>r.some(v=>v!==null&&v!==undefined&&String(v).trim())?[{_fila:i+2,values:HISTORICAL_HEADERS.map((_,j)=>r[j] instanceof Date?(r[j] as Date).toISOString().slice(0,10):String(r[j]??'').trim())}]:[]);
 if(!rows.length||rows.length>IMPORT_LIMIT)throw Error('El listado histórico debe contener entre 1 y 200 operaciones.');
 return rows;
}
