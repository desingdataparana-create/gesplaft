import type {EvaluationRecord,Subject,RiskCriterion,FactorWeight,RegulatoryThreshold,OperationType} from '../types';
import {calculateRisk} from './calculateRisk';
export const EVALUATION_POLICY_VERSION='2026-11-operacion-sujeto-v2';
export interface EvaluationConfig {criteria:RiskCriterion[];factorWeights:FactorWeight[];thresholds:RegulatoryThreshold[]}
export function resolveOperationCriteria(config:EvaluationConfig,person:Subject,submitted:string[]){
 if(person.clientCriteriaIds?.includes('cli-03')&&!person.pepStatus)throw Error('La ficha tiene un parámetro PEP incompatible con su condición. Corregila en Sujetos.');
 const operationIds=submitted.filter(id=>!config.criteria.some(c=>c.id===id&&c.category==='CLIENTE'));
 const ids=[...new Set([...operationIds,...(person.clientCriteriaIds||[])])];
 if(ids.some(id=>!config.criteria.some(c=>c.id===id&&c.active&&!c.deletedAt)))throw Error('Uno de los criterios no está activo. Revisá la selección.');
 if(!config.criteria.some(c=>c.category==='CLIENTE'&&ids.includes(c.id)))throw Error('Completá los parámetros personales en la ficha del sujeto.');
 for(const category of ['PRODUCTO','CANAL','GEOGRAFIA']){
  if(config.criteria.filter(c=>c.category===category&&ids.includes(c.id)).length!==1)throw Error('Elegí un producto/juego, un canal y una zona geográfica para la operación.');
 }
 return ids;
}
export function buildEvaluationRecord(input:Pick<EvaluationRecord,'operationType'|'operationAt'|'amountARS'|'locationDepartment'|'channelName'|'selectedCriteriaIds'|'notes'>,person:Subject,config:EvaluationConfig,type:OperationType,meta:{id:string;now:string;evaluator:string;role:string;fingerprint:string}):EvaluationRecord {
 if(type.uifScope==='PISO'&&!config.thresholds.some(t=>t.code==='UMB-ID-01'&&Number.isFinite(t.amountARS)&&t.amountARS>0))throw Error('Configurá un piso UIF válido antes de evaluar este tipo de operación.');
 const selectedCriteriaIds=resolveOperationCriteria(config,person,input.selectedCriteriaIds);
 const result=calculateRisk(config.criteria,config.factorWeights,selectedCriteriaIds,person.pepStatus,input.amountARS,config.thresholds,{operationType:type});
 return {...input,selectedCriteriaIds,id:meta.id,requestFingerprint:meta.fingerprint,dossierNumber:`EXP-PLA-${new Date(meta.now).getFullYear()}-${meta.id.slice(0,8).toUpperCase()}`,timestamp:meta.now,conditionConfirmed:true,conditionReviewedAt:meta.now,evaluator:meta.evaluator,evaluatorRole:meta.role,subjectId:person.id,subjectUpdatedAt:person.updatedAt,subjectName:person.subjectName,taxId:person.taxId,subjectType:person.subjectType,address:person.address,email:person.email,phone:person.phone,activityOcupation:person.activity,activityAtOperation:person.activity,pepStatus:person.pepStatus,pepDetails:person.pepDetails,rawScore:result.rawScore,weightedScore:result.weightedScore,riskLevel:result.riskLevel,dueDiligenceLevel:result.dueDiligence,status:'PENDIENTE',requiresDJOF:result.requiresDJOF,requiresDocumentation:result.requiresDocumentation,alerts:result.alerts,analysisVersion:0,criteriaSnapshot:config.criteria.filter(c=>selectedCriteriaIds.includes(c.id)),weightsSnapshot:config.factorWeights,thresholdsSnapshot:config.thresholds,operationTypeName:type.name,evaluationScope:result.evaluationScope,evaluationPolicyVersion:EVALUATION_POLICY_VERSION};
}
