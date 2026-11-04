import {z} from 'zod';
import type {Subject,EvaluationRecord} from '../../../src/types';
import type {ImportPreview,ImportPreviewRow} from '../../../src/utils/operationImport';
import {normalizeText,parseImportAmount,parseImportDate} from '../../../src/utils/operationImport';
import {HISTORICAL_HEADERS} from '../../../src/utils/historicalImport';
const input=z.array(z.object({_fila:z.number().int().min(2),values:z.array(z.string().max(1000)).length(12)}).strict()).min(1).max(200);
export async function digest(v:unknown){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(n=>n.toString(16).padStart(2,'0')).join('');}
export function exampleSubject(p:{subjectName:string;taxId:string}){return /^0{6,10}[0-9]{1,2}$/.test(p.taxId.replace(/\D/g,''))&&/^(Sujeto de demostraci[oó]n \d+|Persona de ejemplo|Persona de importación QA)$/i.test(p.subjectName);}
export function exampleRecord(r:EvaluationRecord){return exampleSubject(r)&&(r.evaluator==='Equipo de demostración'||r.importReference?.toUpperCase().startsWith('EJEMPLO-'));}
export async function prepareHistoricalImport(raw:unknown,ownerId:string,people:Subject[],existing:EvaluationRecord[],actor:{email:string;role:string}){
 const rows=input.parse(raw),now=new Date().toISOString(),newSubjects:Subject[]=[],records:EvaluationRecord[]=[],views:ImportPreviewRow[]=[],byDoc=new Map(people.map(p=>[p.taxId.replace(/\D/g,''),p])),seen=new Set<string>();
 for(const row of rows){const v=row.values,view:ImportPreviewRow={fila:row._fila,referencia:'',sujeto:v[1],documento:v[2]||v[3],estado:'ERROR'};try{
   if(v[1].length<2||!v[5]||v[8].length<2)throw Error('Completá nombre, sala y profesión.');
   if(!['SI','NO'].includes(normalizeText(v[9])))throw Error('PEP debe indicar SI o NO.');
   if(normalizeText(v[9])==='SI')throw Error('El listado no informa el cargo PEP. Usá la plantilla completa para esa fila.');
   const risk=normalizeText(v[11]);if(!['BAJO','MEDIO','ALTO','CRITICO'].includes(risk))throw Error('El nivel de riesgo del archivo no es válido.');
   const doc=v[2]||v[3],key=doc.replace(/\D/g,'');if(doc&&!/^\d{7,11}$/.test(key))throw Error('Documento inválido.');
   const date=String(v[0]).split('T')[0];const operationAt=parseImportDate(date+' 00:00'),amount=parseImportAmount(v[6]);
   const ref='HST-'+(await digest([date,key||normalizeText(v[1]),normalizeText(v[5]),amount])).slice(0,24),hash=await digest(v);
   view.referencia=ref;view.importe=amount;view.riesgo=risk+' (origen)';
   if(seen.has(ref))throw Error('Operación repetida dentro del listado.');seen.add(ref);
   const old=existing.find(r=>r.importReference===ref);if(old){if(old.importRowFingerprint!==hash)throw Error('Esta operación ya existe con datos distintos.');view.estado='YA_IMPORTADA';views.push(view);continue;}
   let person=key?byDoc.get(key):undefined;
   if(person&&(normalizeText(person.subjectName)!==normalizeText(v[1])||normalizeText(person.activity)!==normalizeText(v[8])||person.pepStatus))throw Error('Los datos no coinciden con la ficha existente. Revisá el sujeto.');
   if(key&&!person){person={id:crypto.randomUUID(),subjectName:v[1],taxId:doc,subjectType:'PERSONA_FISICA',address:'',email:'',phone:'',activity:v[8],pepStatus:false,pepDetails:'',clientCriteriaIds:[],updatedAt:now};newSubjects.push(person);byDoc.set(key,person);}
   const id=crypto.randomUUID(),sourceData=Object.fromEntries(HISTORICAL_HEADERS.map((h,i)=>[h,v[i]]));
   records.push({id,subjectId:person?.id,dossierNumber:'HIST-'+date.slice(0,4)+'-'+ref.slice(4,12).toUpperCase(),timestamp:now,operationAt,evaluator:actor.email,evaluatorRole:actor.role,subjectName:v[1],taxId:doc,subjectType:'PERSONA_FISICA',activityOcupation:v[8],pepStatus:false,selectedCriteriaIds:[],operationType:'COBRO_PREMIO',operationTypeName:'Cobro de premio (histórico)',amountARS:amount,locationDepartment:'Sin informar',channelName:v[5],rawScore:0,weightedScore:0,riskLevel:risk as EvaluationRecord['riskLevel'],dueDiligenceLevel:'ESTANDAR',status:'PENDIENTE',notes:'Importación histórica. Fecha sin hora en el original. Riesgo informado por la fuente; pendiente de evaluación con parámetros completos.'+(key?'':' Documento pendiente de completar.'),requiresDJOF:false,requiresDocumentation:false,alerts:[],analysisVersion:0,importReference:ref,importRowFingerprint:hash,evaluationPending:true,sourceData,sourceRow:row._fila});
   view.estado='NUEVA';view.alcance=key?'Histórico: pendiente de evaluación':'Pendiente de documento y evaluación';
 }catch(e){view.error=(e as Error).message;}views.push(view);}
 const fingerprint=await digest({rows,people,existing});const result:ImportPreview={rows:views,fingerprint,newCount:records.length,subjectCount:newSubjects.length,skipped:views.filter(v=>v.estado==='YA_IMPORTADA').length,errors:views.filter(v=>v.estado==='ERROR').length};return {result,records,newSubjects};
}
