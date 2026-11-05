import {businessDate} from './businessTime';
import type {EvaluationRecord} from '../types';
export function monthlyActivity(records:Pick<EvaluationRecord,'operationAt'|'timestamp'|'amountARS'>[],now=new Date()){
 const [year,month]=businessDate(now.toISOString()).split('-').map(Number);
 const months=Array.from({length:6},(_,i)=>{const d=new Date(Date.UTC(year,month-1-5+i,15,12));const key=d.toISOString().slice(0,7);return {key,label:d.toLocaleDateString('es-AR',{month:'short',year:'2-digit',timeZone:'UTC'}),count:0,amount:0};});
 const lookup=new Map(months.map(m=>[m.key,m]));
 for(const r of records){const bucket=lookup.get(businessDate(r.operationAt||r.timestamp).slice(0,7));if(bucket){bucket.count++;bucket.amount+=r.amountARS;}}
 return months.map(m=>({...m,amount:Math.round((m.amount+Number.EPSILON)*100)/100}));
}
