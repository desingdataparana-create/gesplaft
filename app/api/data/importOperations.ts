import {z} from 'zod';
import {normalizeText,parseImportAmount,parseImportDate,IMPORT_HEADERS,type ImportRow,type ImportPreview,type ImportPreviewRow} from '../../../src/utils/operationImport';
import {subjectSchema,operationSchema} from '../../../src/utils/validation';
import {buildEvaluationRecord,type EvaluationConfig} from '../../../src/utils/evaluationRecord';
import type {Subject,OperationType,EvaluationRecord} from '../../../src/types';
const rawSchema=z.array(z.object(Object.fromEntries(IMPORT_HEADERS.map(h=>[h,z.string().max(h==='notas'?10000:1000).optional()]))).extend({_fila:z.number().int().min(2).max(100000)}).strict()).min(1).max(200);
async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(n=>n.toString(16).padStart(2,'0')).join('');}
async function uuid(value:string){const h=await digest(value);return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}
export async function operationTypesVersion(types:OperationType[]){return digest(JSON.stringify(types));}
export async function prepareOperationsImport(raw:unknown,ownerId:string,people:Subject[],existing:EvaluationRecord[],config:EvaluationConfig,types:OperationType[],actor:{email:string;role:string}) {
 const rows=rawSchema.parse(raw) as unknown as ImportRow[];
 const seen=new Set<string>(),byDoc=new Map(people.map(p=>[p.taxId.replace(/\D/g,''),p])),newSubjects=new Map<string,Subject>(),records:EvaluationRecord[]=[],preview:ImportPreviewRow[]=[];
 const now=new Date().toISOString();
 for(const row of rows){
  const view:ImportPreviewRow={fila:row._fila,referencia:row.referencia||'',sujeto:row.nombre||'',documento:row.documento||'',estado:'ERROR'};
  try{
   const ref=normalizeText(row.referencia||'');if(!ref||ref.length>100)throw Error('Indicá una referencia única de hasta 100 caracteres.');
   if(seen.has(ref))throw Error('Referencia repetida dentro del archivo.');seen.add(ref);
   const canonical=IMPORT_HEADERS.map(h=>{
    const value=(row[h]||'').trim();
    if(h==='referencia')return [h,ref];
    if(h==='documento')return [h,value.replace(/\D/g,'')];
    if(h==='fecha_operacion')return [h,parseImportDate(value)];
    if(h==='importe_ars')return [h,parseImportAmount(value)];
    if(h==='tipo_operacion')return [h,types.find(t=>normalizeText(t.code)===normalizeText(value)||normalizeText(t.name)===normalizeText(value))?.code||normalizeText(value)];
    if(['producto','canal','zona'].includes(h))return [h,config.criteria.find(c=>c.id===value||normalizeText(c.code)===normalizeText(value))?.code||normalizeText(value)];
    if(h==='criterios_sujeto')return [h,value?value.split('|').map(v=>config.criteria.find(c=>c.id===v.trim()||normalizeText(c.code)===normalizeText(v))?.code||normalizeText(v)).sort():[]];
    return [h,h==='notas'?value:normalizeText(value)];
   });
   const rowFingerprint=await digest(JSON.stringify(canonical));
   const id=await uuid(ownerId+':import:'+ref),previous=existing.find(r=>r.id===id);
   if(previous){if(previous.importRowFingerprint!==rowFingerprint)throw Error('Esta referencia ya se importó con otros datos.');Object.assign(view,{estado:'YA_IMPORTADA',sujeto:previous.subjectName,importe:previous.amountARS,riesgo:previous.riskLevel,puntaje:previous.weightedScore,alcance:previous.evaluationScope?.reason});preview.push(view);continue;}
   const document=row.documento||'';if(!/^[\d.\-\s]+$/.test(document)||!/^\d{7,11}$/.test(document.replace(/\D/g,'')))throw Error('Documento: deben ser entre 7 y 11 dígitos.');
   const key=document.replace(/\D/g,'');
   const criterion=(value:string,category:string)=>{const found=config.criteria.find(c=>c.active&&!c.deletedAt&&c.category===category&&(c.id===value||normalizeText(c.code)===normalizeText(value)));if(!found)throw Error(`Criterio de ${category.toLowerCase()} no válido: ${value||'(vacío)'}.`);return found.id;};
   const personal=row.criterios_sujeto?.trim()?row.criterios_sujeto.split('|').map(v=>criterion(v.trim(),'CLIENTE')):undefined;
   let person=byDoc.get(key);
   if(person){
    const comparisons:[string,string|undefined,string|undefined][]=[['nombre',row.nombre,person.subjectName],['tipo de sujeto',row.tipo_sujeto,person.subjectType],['actividad',row.actividad,person.activity],['detalle PEP',row.detalle_pep,person.pepDetails],['domicilio',row.direccion,person.address],['correo',row.email,person.email],['teléfono',row.telefono,person.phone]];
    for(const [label,value,stored] of comparisons)if(value&&normalizeText(value)!==normalizeText(stored||''))throw Error(`El ${label} no coincide con la ficha existente. Revisala en Sujetos.`);
    if(row.pep&&(!['SI','NO'].includes(normalizeText(row.pep))||(normalizeText(row.pep)==='SI')!==person.pepStatus))throw Error('La condición PEP no coincide con la ficha existente.');
    if(personal&&[...new Set(personal)].sort().join('|')!==[...new Set(person.clientCriteriaIds||[])].sort().join('|'))throw Error('Los parámetros personales no coinciden con la ficha existente.');
   }else{
    if(!row.pep||!['SI','NO'].includes(normalizeText(row.pep)))throw Error('Indicá SI o NO en PEP para el sujeto nuevo.');
    if(!row.nombre?.trim()||!row.actividad?.trim())throw Error('Completá nombre y actividad para el sujeto nuevo.');
    const values=subjectSchema.parse({subjectName:row.nombre||'',taxId:document,subjectType:row.tipo_sujeto||'PERSONA_FISICA',activity:row.actividad||'',pepStatus:normalizeText(row.pep)==='SI',pepDetails:row.detalle_pep||'',clientCriteriaIds:personal||[],address:row.direccion||'',email:row.email||'',phone:row.telefono||''});
    person={...values,id:await uuid(ownerId+':import-subject:'+key),updatedAt:now};
    byDoc.set(key,person);newSubjects.set(key,person);
   }
   const type=types.find(t=>t.active&&(normalizeText(t.code)===normalizeText(row.tipo_operacion||'')||normalizeText(t.name)===normalizeText(row.tipo_operacion||'')));
   if(!type)throw Error('El tipo de operación no existe o está deshabilitado.');
   const input=operationSchema.parse({operationType:type.code,operationAt:parseImportDate(row.fecha_operacion||''),amountARS:parseImportAmount(row.importe_ars||''),locationDepartment:row.departamento||'',channelName:row.sala||'',selectedCriteriaIds:[criterion(row.producto||type.productCriterionId||'','PRODUCTO'),criterion(row.canal||'','CANAL'),criterion(row.zona||'','GEOGRAFIA')],notes:row.notas||'',conditionConfirmed:true,pepStatus:person.pepStatus,pepDetails:person.pepDetails,activityAtOperation:person.activity});
   const record=buildEvaluationRecord(input,person,config,type,{id,now,evaluator:actor.email,role:actor.role,fingerprint:rowFingerprint});record.importReference=ref;record.importRowFingerprint=rowFingerprint;
   records.push(record);Object.assign(view,{estado:'NUEVA',sujeto:person.subjectName,importe:record.amountARS,riesgo:record.riskLevel,puntaje:record.weightedScore,alcance:record.evaluationScope?.reason});
  }catch(e){view.error=e instanceof z.ZodError?e.issues[0]?.message:(e as Error).message;}
  preview.push(view);
 }
 const fingerprint=await digest(JSON.stringify({rows,config,types,people:people.map(p=>({id:p.id,updatedAt:p.updatedAt})).sort((a,b)=>a.id.localeCompare(b.id)),existing:existing.filter(r=>r.importReference).map(r=>({id:r.id,hash:r.importRowFingerprint})).sort((a,b)=>a.id.localeCompare(b.id))}));
 const result:ImportPreview={rows:preview,fingerprint,newCount:records.length,subjectCount:newSubjects.size,skipped:preview.filter(r=>r.estado==='YA_IMPORTADA').length,errors:preview.filter(r=>r.estado==='ERROR').length};
 return {result,records,newSubjects:[...newSubjects.values()]};
}
