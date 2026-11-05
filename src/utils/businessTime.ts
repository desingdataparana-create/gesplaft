export const BUSINESS_TIME_ZONE='America/Argentina/Buenos_Aires';
export function businessPeriod(preset:string,now=new Date()){
 const today=businessDate(now.toISOString()),[year,month]=today.split('-').map(Number);
 const date=(y:number,m:number,d:number)=>new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10);
 if(preset==='HOY')return {start:today,end:today};
 if(preset==='7_DIAS'||preset==='30_DIAS')return {start:date(year,month,Number(today.slice(8))-(preset==='7_DIAS'?6:29)),end:today};
 if(preset==='MES_ACTUAL')return {start:date(year,month,1),end:date(year,month+1,0)};
 if(preset==='TRIMESTRE_ACTUAL'){const first=Math.floor((month-1)/3)*3+1;return {start:date(year,first,1),end:date(year,first+3,0)};}
 if(preset==='ANIO_ACTUAL')return {start:date(year,1,1),end:date(year,12,31)};
 return {start:'',end:''};
}
export function businessDate(value:string){const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';const parts=new Intl.DateTimeFormat('en-CA',{timeZone:BUSINESS_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);return ['year','month','day'].map(k=>parts.find(p=>p.type===k)?.value).join('-');}
export function businessDateTimeInput(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:BUSINESS_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const p=(key:string)=>parts.find(p=>p.type===key)?.value;
 return `${p('year')}-${p('month')}-${p('day')}T${p('hour')}:${p('minute')}`;
}
