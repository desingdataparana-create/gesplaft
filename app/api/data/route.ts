import {access,requireModule} from '../../access';
import {can} from '../../../src/access';
import { DEFAULT_ORGANIZATION } from '../../../src/data/organization';
import { and, eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../../db/index';
import { subjects, evaluations, settings, organizationSettings } from '../../../db/schema';
import { INITIAL_FACTOR_WEIGHTS, INITIAL_RISK_CRITERIA, INITIAL_REGULATORY_THRESHOLDS } from '../../../src/data/initialRiskData';
import { calculateRisk } from '../../../src/utils/calculateRisk';
import type { EvaluationRecord, Subject } from '../../../src/types';

export const dynamic = 'force-dynamic';
const subjectTypes = ['PERSONA_FISICA','PERSONA_JURIDICA','AGENCIA'] as const;
const statusValues = ['PENDIENTE','EN_ANALISIS','JUSTIFICADO','ALERTA_EMITIDA','REPORTE_ROS'] as const;
const subjectSchema = z.object({id:z.string().optional(),updatedAt:z.string().optional(),subjectName:z.string().trim().min(2).max(200),taxId:z.string().trim().min(7).max(20),subjectType:z.enum(subjectTypes),address:z.string().trim().min(3).max(500),email:z.string().trim().email().max(254),phone:z.string().trim().min(6).max(40),activity:z.string().trim().min(2).max(200),pepStatus:z.boolean(),pepDetails:z.string().max(1000).optional(),clientCriteriaIds:z.array(z.string()).max(100).default([])}).refine(s=>/^\d{7,11}$/.test(s.taxId.replace(/\D/g,'')),{message:'Revisá el DNI/CUIT: debe tener entre 7 y 11 dígitos.'}).refine(s=>s.phone.replace(/\D/g,'').length>=6,{message:'Revisá el teléfono.'}).refine(s=>!s.pepStatus||!!s.pepDetails?.trim(),{message:'Indicá el cargo o condición PEP en la ficha del sujeto.'});
const recordSchema = z.object({subjectUpdatedAt:z.string().optional(),operationType:z.enum(['COBRO_PREMIO','APUESTA_PRESENCIAL','APUESTA_ONLINE','CAMBIO_FICHAS','ALTA_AGENCIA']),amountARS:z.number().finite().positive().max(1e15),locationDepartment:z.string().trim().min(1).max(200),channelName:z.string().trim().min(1).max(200),selectedCriteriaIds:z.array(z.string()).min(1).max(200),notes:z.string().max(10000)});
const profileSchema=z.object({profileSummary:z.string().max(4000),comparison:z.enum(['SIN_DATOS','COMPATIBLE','DESVIACION']),comparisonReason:z.string().max(4000),originDeclared:z.string().max(2000),destinationDeclared:z.string().max(2000),beneficialOwner:z.string().max(2000)});
const operationSchema=recordSchema.extend({profileAssessment:profileSchema.optional(),operationAt:z.string().datetime().refine(v=>Date.parse(v)<=Date.now()+60000,{message:'La operación no puede tener fecha futura.'}),conditionConfirmed:z.literal(true,{error:'Confirmá la condición del sujeto para esta operación.'}),pepStatus:z.boolean(),pepDetails:z.string().max(1000).optional(),activityAtOperation:z.string().trim().min(2).max(200)}).refine(r=>!r.pepStatus || !!r.pepDetails?.trim(),{message:'Indicá el cargo o condición PEP evaluada.'});
function json(body:unknown,status=200){return Response.json(body,{status,headers:{'Cache-Control':'no-store'}});}
function owner(req:Request){const id=req.headers.get('oai-authenticated-user-id');if(!id)throw new Error('UNAUTHORIZED');return id;}
function writeOwner(req:Request){const id=owner(req);const origin=req.headers.get('Origin');if(origin && origin!==new URL(req.url).origin)throw new Error('FORBIDDEN');return id;}
function handleError(e:unknown){if(e instanceof SyntaxError)return json({error:'El contenido no es JSON válido.'},400);if(e instanceof z.ZodError)return json({error:e.issues[0]?.message || 'Datos inválidos.'},400);if(e instanceof Error && e.message==='UNAUTHORIZED')return json({error:'Iniciá sesión para acceder a los datos.'},401);if(e instanceof Error && e.message==='FORBIDDEN')return json({error:'Operación no autorizada.'},403);return json({error:'No se pudo completar la operación en la base de datos. Intentá nuevamente.'},500);}
const defaultConfig={criteria:INITIAL_RISK_CRITERIA,factorWeights:INITIAL_FACTOR_WEIGHTS,thresholds:INITIAL_REGULATORY_THRESHOLDS};
async function configFor(ownerId:string){const db=getDb();const [config]=await db.select().from(settings).where(eq(settings.ownerId,ownerId));return config || defaultConfig;}
export async function GET(req:Request){try{
  const user=await access(req),ownerId=user.ownerId,db=getDb(),url=new URL(req.url);
  if(url.searchParams.get('kind')==='subjects'){
    if(!can(user,'sujetos')&&!can(user,'expedientes',true))throw new Error('FORBIDDEN');
    const query=(url.searchParams.get('q') || '').trim().slice(0,100).replace(/[%_]/g,'');
    if(query.length<2)return json({subjects:[]});
    const digits=query.replace(/\D/g,'');
    const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const people=await db.select().from(subjects).where(eq(subjects.ownerId,ownerId));
    const matches=people.filter(p=>normalize(p.subjectName).includes(normalize(query))||!!digits&&p.documentKey.includes(digits)).slice(0,30);
    return json({subjects:matches});
  }
  const [config,people,rows]=await Promise.all([configFor(ownerId),db.select().from(subjects).where(eq(subjects.ownerId,ownerId)).orderBy(desc(subjects.updatedAt)),db.select().from(evaluations).where(eq(evaluations.ownerId,ownerId)).orderBy(desc(evaluations.createdAt))]);
  const [org]=await db.select().from(organizationSettings).where(eq(organizationSettings.ownerId,ownerId));
  const records=rows.map(r=>r.record);
  const dashboard=can(user,'dashboard')?{subjects:people.length,total:records.length,pending:records.filter(r=>r.status==='PENDIENTE').length,inAnalysis:records.filter(r=>r.status==='EN_ANALISIS').length,closed:records.filter(r=>r.status==='JUSTIFICADO').length,ros:records.filter(r=>r.status==='REPORTE_ROS').length,risk:Object.fromEntries(['BAJO','MEDIO','ALTO','CRITICO'].map(k=>[k,records.filter(r=>r.riskLevel===k).length]))}:null;
  return json({...config,user,dashboard,organization:org?.organization||DEFAULT_ORGANIZATION,subjects:can(user,'sujetos')||can(user,'expedientes',true)?people:[],records:can(user,'expedientes')?records.map(r=>can(user,'analisis')?r:({...r,analysis:undefined,analysisHistory:undefined})):[]});
}catch(e){return handleError(e)}}
export async function POST(req:Request){try{
 writeOwner(req);const user=await access(req),ownerId=user.ownerId,db=getDb();
 const {action,payload}=z.object({action:z.string(),payload:z.record(z.string(),z.unknown())}).parse(await req.json());
 const required:Record<string,import('../../../src/access').Module>={saveOrganization:'ajustes',saveSubject:'sujetos',saveEvaluation:'expedientes',reviewCase:'analisis',updateStatus:'analisis',saveSettings:'riesgo',deleteCriterion:'riesgo',importLocal:'expedientes'};
 if(!required[action])return json({error:'Operación desconocida.'},400);
 requireModule(user,required[action],true);
 if(action==='importLocal'){requireModule(user,'sujetos',true);requireModule(user,'riesgo',true);}
 if(action==='reviewCase'||action==='updateStatus')requireModule(user,'expedientes');
 if(action==='saveOrganization'){
   const organization=z.object({shortName:z.string().trim().min(2).max(40),legalName:z.string().trim().min(2).max(200),area:z.string().trim().min(2).max(120),taxId:z.string().trim().max(30),address:z.string().trim().max(500),email:z.union([z.literal(''),z.string().trim().email().max(254)]),phone:z.string().trim().max(50),website:z.union([z.literal(''),z.string().url().max(300).refine(v=>/^https?:\/\//.test(v),{message:'Usá una dirección web http o https.'})]),logo:z.string().max(280000).refine(v=>!v||/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(v),{message:'Usá un logo PNG, JPG o WebP de hasta 200 KB.'})}).parse(payload);
   if(organization.logo){const [prefix,encoded]=organization.logo.split(',');const bytes=atob(encoded);const valid=prefix.includes('image/png')?bytes.startsWith('\x89PNG\r\n\x1a\n'):prefix.includes('image/jpeg')?bytes.startsWith('\xff\xd8\xff'):bytes.startsWith('RIFF')&&bytes.slice(8,12)==='WEBP';if(!valid||bytes.length>200000)return json({error:'El archivo del logo no es válido o supera 200 KB.'},400);}
   await db.insert(organizationSettings).values({ownerId,organization,updatedAt:new Date().toISOString()}).onConflictDoUpdate({target:organizationSettings.ownerId,set:{organization,updatedAt:new Date().toISOString()}});
   return json({organization});
 }
 if(action==='saveSubject'){
   const input=subjectSchema.parse(payload),documentKey=input.taxId.replace(/\D/g,''),now=new Date().toISOString();
   const [old]=await db.select().from(subjects).where(and(eq(subjects.ownerId,ownerId),eq(subjects.documentKey,documentKey)));
   if(old && old.id!==input.id)return json({error:'Ya existe un sujeto con ese documento. Seleccioná su ficha para editarlo.'},409);
   if(input.id && (!old || old.id!==input.id))return json({error:'No se encontró la ficha o cambió su documento.'},409);
   if(old&&input.updatedAt&&old.updatedAt!==input.updatedAt)return json({error:'La ficha cambió. Actualizala antes de editarla.'},409);
   const config=await configFor(ownerId);
   if(input.clientCriteriaIds.some(id=>!config.criteria.some(c=>c.id===id&&c.active&&c.category==='CLIENTE')))return json({error:'Revisá los criterios personales de la ficha.'},400);
   const subject={...input,id:old?.id || crypto.randomUUID(),ownerId,documentKey,pepDetails:input.pepDetails || '',createdAt:old?.createdAt || now,updatedAt:old?new Date(Math.max(Date.now(),Date.parse(old.updatedAt)+1)).toISOString():now};
   try {if(old){const changed=await db.update(subjects).set(subject).where(and(eq(subjects.id,old.id),eq(subjects.ownerId,ownerId),eq(subjects.updatedAt,old.updatedAt))).returning({id:subjects.id});if(!changed.length)return json({error:'Otra edición se guardó primero. Actualizá la ficha.'},409);}else await db.insert(subjects).values(subject);}
   catch(e){if(String(e).includes('UNIQUE'))return json({error:'El documento ya está registrado. Buscá su ficha.'},409);throw e;}
   return json({subject},old?200:201);
 }
 if(action==='saveEvaluation'){
   const now=new Date().toISOString();
   const requestedId=typeof payload.subjectId==='string'?payload.subjectId:undefined;
   if(!requestedId)return json({error:'Primero registrá y seleccioná al sujeto. Los datos personales se cargan en su ficha.'},400);
   const [person]=await db.select().from(subjects).where(and(eq(subjects.ownerId,ownerId),eq(subjects.id,requestedId)));
   if(!person)return json({error:'No se encontró el sujeto. Buscá su ficha antes de cargar la operación.'},404);
   const requestId=payload.requestId?z.string().uuid().parse(payload.requestId):crypto.randomUUID();
   const submitted=recordSchema.extend({operationAt:z.string().datetime(),profileAssessment:profileSchema.optional()}).parse(payload.record);
   const fingerprint=JSON.stringify({...submitted,selectedCriteriaIds:[...new Set(submitted.selectedCriteriaIds)].sort()});
   const [previous]=await db.select().from(evaluations).where(and(eq(evaluations.ownerId,ownerId),eq(evaluations.id,requestId)));
   if(previous){if(previous.subjectId!==person.id||previous.record.requestFingerprint!==fingerprint)return json({error:'El identificador ya se usó con otros datos.'},409);return json({record:previous.record,subject:person});}
   if(submitted.subjectUpdatedAt&&person.updatedAt!==submitted.subjectUpdatedAt)return json({error:'La ficha cambió. Seleccionala nuevamente y confirmá la condición.'},409);
   const input=operationSchema.parse({...payload.record as object,pepStatus:person.pepStatus,pepDetails:person.pepDetails,activityAtOperation:person.activity});
   const subjectId=person.id!;
   const config=await configFor(ownerId);
   input.selectedCriteriaIds=[...new Set([...input.selectedCriteriaIds.filter(id=>!config.criteria.some(c=>c.id===id&&c.category==='CLIENTE')),...person.clientCriteriaIds])];
   if(input.selectedCriteriaIds.some(id=>!config.criteria.some(c=>c.id===id&&c.active)))return json({error:'Uno de los criterios ya no está activo. Actualizá la página y revisá la selección.'},409);
   if(['CLIENTE','PRODUCTO','CANAL','GEOGRAFIA'].some(category=>!config.criteria.some(c=>c.category===category&&input.selectedCriteriaIds.includes(c.id))))return json({error:'Completá los criterios personales en la ficha del sujeto y los criterios de producto/servicio, canal y geografía en la operación.'},400);
   const history=await db.select().from(evaluations).where(and(eq(evaluations.ownerId,ownerId),eq(evaluations.subjectId,subjectId)));
   const result=calculateRisk(config.criteria,config.factorWeights,input.selectedCriteriaIds,input.pepStatus,input.amountARS,config.thresholds,{operationAt:input.operationAt,subjectType:person.subjectType,records:history.map(r=>r.record)});
   const id=requestId;
   const record:EvaluationRecord={...input,id,requestFingerprint:fingerprint,criteriaSnapshot:config.criteria.filter(c=>input.selectedCriteriaIds.includes(c.id)),weightsSnapshot:config.factorWeights,thresholdsSnapshot:config.thresholds,dossierNumber:`EXP-PLA-${new Date().getFullYear()}-${id.slice(0,8).toUpperCase()}`,timestamp:now,conditionReviewedAt:now,evaluator:req.headers.get('oai-authenticated-user-email')||'Usuario autenticado',evaluatorRole:user.role,subjectId,subjectName:person.subjectName,taxId:person.taxId,subjectType:person.subjectType as Subject['subjectType'],address:person.address||'',email:person.email||'',phone:person.phone||'',activityOcupation:input.activityAtOperation,pepStatus:input.pepStatus,pepDetails:input.pepDetails,weightedScore:result.weightedScore,rawScore:result.rawScore,riskLevel:result.riskLevel,dueDiligenceLevel:result.dueDiligence,status:'PENDIENTE',requiresDJOF:result.requiresDJOF,requiresDocumentation:result.requiresDocumentation,alerts:[...result.alerts,...(input.profileAssessment?.comparison==='DESVIACION'?['Desvío declarado respecto del perfil transaccional: requiere análisis.']:[])],analysisVersion:0};
   const operation=db.insert(evaluations).values({id,ownerId,subjectId,createdAt:now,record});
   try{
     // A known person is referenced, never re-created or edited by an operation.
     await operation;
   }catch(e){if(String(e).includes('UNIQUE'))return json({error:'Ese sujeto ya fue registrado. Buscalo y vinculá la operación a su ficha.'},409);throw e;}
   return json({record,subject:person},201);
 }
 if(action==='reviewCase'){
   const input=z.object({id:z.string(),version:z.number().int().nonnegative(),action:z.enum(['SEGUIMIENTO','CERRAR_JUSTIFICADA','DETERMINAR_SOSPECHOSA','REGISTRAR_ROS']),classification:z.enum(['EN_REVISION','SIN_INUSUALIDAD','INUSUAL','SOSPECHOSA']),alertOrigin:z.string().trim().min(2).max(1000),unusualType:z.string().max(4000),profileSummary:z.string().max(4000),documentationRequested:z.string().max(4000),documentationReviewed:z.string().max(4000),fundsAssessment:z.string().max(4000),beneficialOwner:z.string().max(2000),reasoning:z.string().trim().min(10).max(6000),rosReference:z.string().max(500),rosSubmittedAt:z.string().max(50)}).parse(payload);
   const [row]=await db.select().from(evaluations).where(and(eq(evaluations.ownerId,ownerId),eq(evaluations.id,input.id)));
   if(!row)return json({error:'No se encontró el expediente.'},404);
   if((row.record.analysisVersion||0)!==input.version)return json({error:'El expediente cambió. Actualizá la página antes de guardar el análisis.'},409);
   if(input.action==='SEGUIMIENTO' && input.classification==='SOSPECHOSA' && row.record.analysis?.classification!=='SOSPECHOSA')return json({error:'Usá la decisión Determinar sospechosa para registrar esa conclusión.'},400);
   if((input.classification==='INUSUAL'||input.action==='DETERMINAR_SOSPECHOSA')&&input.unusualType.trim().length<10)return json({error:'Describí la inusualidad detectada.'},400);
   if(row.record.status==='REPORTE_ROS' && input.action!=='SEGUIMIENTO')return json({error:'El ROS ya está registrado. Agregá novedades mediante seguimiento, conservando la constancia.'},400);
   if(input.action==='CERRAR_JUSTIFICADA' && input.classification==='INUSUAL' && !input.documentationReviewed.trim())return json({error:'Registrá el sustento documental revisado para justificar la inusualidad.'},400);
   if(input.action==='CERRAR_JUSTIFICADA' && input.classification==='EN_REVISION')return json({error:'Completá la clasificación antes de cerrar el análisis.'},400);
   if(input.action==='CERRAR_JUSTIFICADA' && (!input.profileSummary.trim() || !input.fundsAssessment.trim()))return json({error:'Documentá el perfil considerado y el análisis que sustenta el cierre.'},400);
   if(input.action==='CERRAR_JUSTIFICADA' && input.classification==='SOSPECHOSA')return json({error:'Revisá la clasificación antes de cerrar una operación como justificada.'},400);
   if(input.action==='DETERMINAR_SOSPECHOSA' && !input.fundsAssessment.trim())return json({error:'Registrá los elementos analizados que sustentan la sospecha.'},400);
   if(input.action==='REGISTRAR_ROS' && (row.record.analysis?.classification!=='SOSPECHOSA'||!input.rosReference.trim()||!Number.isFinite(Date.parse(input.rosSubmittedAt))))return json({error:'Primero documentá la determinación de sospecha. Para registrar el ROS presentado, indicá su constancia y fecha.'},400);
   if(input.action==='REGISTRAR_ROS' && Date.parse(input.rosSubmittedAt)>Date.now())return json({error:'La fecha de presentación no puede ser futura.'},400);
   const review={...input,classification:input.action==='DETERMINAR_SOSPECHOSA'||input.action==='REGISTRAR_ROS'||row.record.status==='REPORTE_ROS'?'SOSPECHOSA' as const:input.classification,rosReference:row.record.status==='REPORTE_ROS'?(row.record.analysis?.rosReference||input.rosReference):input.rosReference,rosSubmittedAt:row.record.status==='REPORTE_ROS'?(row.record.analysis?.rosSubmittedAt||input.rosSubmittedAt):input.rosSubmittedAt,analyst:req.headers.get('oai-authenticated-user-email')||'Usuario autenticado',reviewedAt:new Date().toISOString()};
   const record:EvaluationRecord={...row.record,analysis:review,analysisHistory:[...(row.record.analysisHistory||[]),review],analysisVersion:input.version+1,status:row.record.status==='REPORTE_ROS'?'REPORTE_ROS':input.action==='CERRAR_JUSTIFICADA'?'JUSTIFICADO':input.action==='REGISTRAR_ROS'?'REPORTE_ROS':'EN_ANALISIS'};
   const updated=await db.update(evaluations).set({record}).where(and(eq(evaluations.ownerId,ownerId),eq(evaluations.id,input.id),eq(evaluations.record,row.record))).returning({id:evaluations.id});
   if(!updated.length)return json({error:'Otro cambio se guardó primero. Actualizá el expediente.'},409);
   return json({record});
 }
 if(action==='updateStatus'){
   const input=z.object({id:z.string(),status:z.enum(statusValues)}).parse(payload);
   const [row]=await db.select().from(evaluations).where(and(eq(evaluations.ownerId,ownerId),eq(evaluations.id,input.id)));
   if(!row)return json({error:'No se encontró el expediente.'},404);
   if(row.record.status==='JUSTIFICADO'||row.record.status==='REPORTE_ROS')return json({error:'Los cambios de un expediente concluido requieren análisis documentado.'},409);
   if(input.status==='JUSTIFICADO'||input.status==='REPORTE_ROS')return json({error:'El cierre y el registro de ROS requieren un análisis fundamentado.'},400);
   const record={...row.record,status:input.status};await db.update(evaluations).set({record}).where(and(eq(evaluations.ownerId,ownerId),eq(evaluations.id,input.id)));return json({record});
 }
 if(action==='deleteCriterion'){
   if(user.role!=='SUPERADMIN')throw Error('FORBIDDEN');
   const {id}=z.object({id:z.string().min(1).max(200)}).parse(payload);
   const config=await configFor(ownerId),criterion=config.criteria.find(c=>c.id===id);
   if(!criterion)return json({error:'No se encontró el parámetro.'},404);
   if(criterion.deletedAt)return json(config);
   const now=new Date().toISOString();
   const next={criteria:config.criteria.map(c=>c.id===id?{...c,active:false,deletedAt:now,deletedBy:user.email}:c),factorWeights:config.factorWeights,thresholds:config.thresholds};
   await db.insert(settings).values({ownerId,...next,updatedAt:now}).onConflictDoUpdate({target:settings.ownerId,set:{...next,updatedAt:now}});
   return json(next);
 }
 if(action==='saveSettings'){
   const config=z.object({criteria:z.array(z.object({id:z.string(),deletedAt:z.string().optional(),deletedBy:z.string().optional(),code:z.string(),name:z.string(),description:z.string(),category:z.enum(['CLIENTE','PRODUCTO','CANAL','GEOGRAFIA','OPERACIONAL']),subgroup:z.string(),score:z.number().min(1).max(5),riskLevel:z.enum(['BAJO','MEDIO','ALTO','CRITICO']),mitigationFactor:z.number().min(0).max(1),active:z.boolean(),regulatoryBase:z.string(),lastUpdated:z.string()})).max(1000),factorWeights:z.array(z.object({category:z.enum(['CLIENTE','PRODUCTO','CANAL','GEOGRAFIA','OPERACIONAL']),name:z.string(),weightPercentage:z.number().min(0).max(100),description:z.string(),iconName:z.string()})).length(5),thresholds:z.array(z.object({id:z.string(),code:z.string(),title:z.string(),description:z.string(),amountARS:z.number().finite().nonnegative(),periodicity:z.enum(['POR_OPERACION','MENSUAL_ACUMULADO','ANUAL']),actionRequired:z.string(),regulationSource:z.string(),lastUpdated:z.string()})).max(100)}).parse(payload);
   if(Math.abs(config.factorWeights.reduce((sum,w)=>sum+w.weightPercentage,0)-100)>.01)return json({error:'Las ponderaciones deben sumar 100%.'},400);
   const unique=(v:string[])=>new Set(v).size===v.length;
   if(!unique(config.criteria.map(c=>c.id))||!unique(config.criteria.map(c=>c.code))||!unique(config.factorWeights.map(w=>w.category))||!unique(config.thresholds.map(t=>t.id))||!unique(config.thresholds.map(t=>t.code)))return json({error:'La configuración contiene códigos o factores duplicados.'},400);
   const previous=await configFor(ownerId);
   const removed=previous.criteria.filter(c=>!c.deletedAt&&!config.criteria.some(n=>n.id===c.id));
   if(removed.length&&user.role!=='SUPERADMIN')throw Error('FORBIDDEN');
   if(config.criteria.some(c=>c.deletedAt&&!previous.criteria.find(p=>p.id===c.id)?.deletedAt))return json({error:'Usá la opción Eliminar para retirar un parámetro.'},400);
   const archived=previous.criteria.filter(c=>c.deletedAt);
   const now=new Date().toISOString();
   config.criteria=[...config.criteria.filter(c=>!archived.some(a=>a.id===c.id)),...archived,...removed.map(c=>({...c,active:false,deletedAt:now,deletedBy:user.email}))];
   const row={ownerId,...config,updatedAt:new Date().toISOString()};await db.insert(settings).values(row).onConflictDoUpdate({target:settings.ownerId,set:row});return json(config);
 }
 if(action==='importLocal'){
   if(user.role!=='SUPERADMIN')throw Error('FORBIDDEN');
   // Explicit, repeatable migration. Existing subjects and evaluations are never overwritten.
   const records=z.array(recordSchema.extend({id:z.string().max(100),timestamp:z.string(),dossierNumber:z.string(),evaluator:z.string(),evaluatorRole:z.string(),subjectName:z.string(),taxId:z.string(),subjectType:z.enum(subjectTypes),activityOcupation:z.string(),pepStatus:z.boolean(),weightedScore:z.number().finite(),rawScore:z.number().finite(),riskLevel:z.enum(['BAJO','MEDIO','ALTO','CRITICO']),dueDiligenceLevel:z.enum(['SIMPLIFICADA','ESTANDAR','REFORZADA']),status:z.enum(statusValues),alerts:z.array(z.string()),requiresDJOF:z.boolean(),requiresDocumentation:z.boolean()}).passthrough()).max(1000).parse(payload.records) as unknown as EvaluationRecord[];
   let imported=0;
   for(const record of records){
     if(!record.taxId.replace(/\D/g,''))continue;
     const [already]=await db.select({id:evaluations.id}).from(evaluations).where(and(eq(evaluations.ownerId,ownerId),eq(evaluations.id,record.id)));if(already)continue;
     const key=record.taxId.replace(/\D/g,'');const [old]=await db.select().from(subjects).where(and(eq(subjects.ownerId,ownerId),eq(subjects.documentKey,key)));
     const id=old?.id || crypto.randomUUID(),now=new Date().toISOString();
     const sub={id,ownerId,documentKey:key,taxId:record.taxId,subjectName:record.subjectName,subjectType:record.subjectType,address:record.address || '',email:record.email || '',phone:record.phone || '',activity:record.activityOcupation,pepStatus:record.pepStatus,pepDetails:record.pepDetails || '',createdAt:now,updatedAt:now};
     await db.batch([db.insert(subjects).values(sub).onConflictDoNothing(),db.insert(evaluations).values({id:record.id,ownerId,subjectId:id,createdAt:record.timestamp,record:{...record,subjectId:id}}).onConflictDoNothing()]); imported++;
   }
   return json({imported});
 }
 return json({error:'Operación desconocida.'},400);
}catch(e){return handleError(e)}}
