export const BUSINESS_TIME_ZONE='America/Argentina/Buenos_Aires';
export function businessDate(value:string){const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';const parts=new Intl.DateTimeFormat('en-CA',{timeZone:BUSINESS_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);return ['year','month','day'].map(k=>parts.find(p=>p.type===k)?.value).join('-');}
export function businessDateTimeInput(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:BUSINESS_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const p=(key:string)=>parts.find(p=>p.type===key)?.value;
 return `${p('year')}-${p('month')}-${p('day')}T${p('hour')}:${p('minute')}`;
}
