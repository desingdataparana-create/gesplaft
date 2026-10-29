export type RiskLevel = 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';

export type RiskFactorCategory = 
  | 'CLIENTE' 
  | 'PRODUCTO' 
  | 'CANAL' 
  | 'GEOGRAFIA' 
  | 'OPERACIONAL';

export interface RiskCriterion {
  id: string;
  category: RiskFactorCategory;
  code: string; // e.g. "CLI-01", "PROD-03"
  name: string;
  description: string;
  subgroup: string; // e.g. "Condición PEP", "Tipo de Juego", "Ubicación"
  score: number; // 1 (Bajo) to 5 (Crítico)
  riskLevel: RiskLevel;
  mitigationFactor: number; // 0.1 to 1.0 (reductor de riesgo con control)
  active: boolean;
  regulatoryBase: string; // e.g. "Res. UIF 194/2023 Art. 14", "Manual PLA/FT IAFAS"
  lastUpdated: string;
}

export interface FactorWeight {
  category: RiskFactorCategory;
  name: string;
  weightPercentage: number; // Sum must equal 100%
  description: string;
  iconName: string;
}

export interface RegulatoryThreshold {
  id: string;
  code: string;
  title: string;
  description: string;
  amountARS: number;
  periodicity: 'POR_OPERACION' | 'MENSUAL_ACUMULADO' | 'ANUAL';
  actionRequired: string;
  regulationSource: string;
  lastUpdated: string;
}

export interface Subject {
  updatedAt?:string;
  clientCriteriaIds?: string[];
  id: string;
  subjectName: string;
  taxId: string;
  subjectType: 'PERSONA_FISICA' | 'PERSONA_JURIDICA' | 'AGENCIA';
  address: string;
  email: string;
  phone: string;
  activity: string;
  pepStatus: boolean;
  pepDetails?: string;
}

export interface ProfileAssessment {
  profileSummary: string;
  comparison: 'SIN_DATOS' | 'COMPATIBLE' | 'DESVIACION';
  comparisonReason: string;
  originDeclared: string;
  destinationDeclared: string;
  beneficialOwner: string;
}
export interface CaseReview {
  classification: 'EN_REVISION' | 'SIN_INUSUALIDAD' | 'INUSUAL' | 'SOSPECHOSA';
  alertOrigin: string;
  unusualType: string;
  profileSummary: string;
  documentationRequested: string;
  documentationReviewed: string;
  fundsAssessment: string;
  beneficialOwner: string;
  reasoning: string;
  rosReference: string;
  rosSubmittedAt: string;
  action: 'SEGUIMIENTO' | 'CERRAR_JUSTIFICADA' | 'DETERMINAR_SOSPECHOSA' | 'REGISTRAR_ROS';
  analyst: string;
  reviewedAt: string;
}

export interface EvaluationRecord {
  requestFingerprint?:string;
  subjectUpdatedAt?:string;
  criteriaSnapshot?:RiskCriterion[];
  weightsSnapshot?:FactorWeight[];
  thresholdsSnapshot?:RegulatoryThreshold[];
  profileAssessment?: ProfileAssessment;
  analysis?: CaseReview;
  analysisHistory?: CaseReview[];
  analysisVersion?: number;
  operationAt?: string;
  conditionConfirmed?: boolean;
  conditionReviewedAt?: string;
  activityAtOperation?: string;
  subjectId?: string;
  address?: string;
  email?: string;
  phone?: string;
  id: string;
  dossierNumber: string; // e.g. "EXP-PLA-2026-0482"
  timestamp: string;
  evaluator: string;
  evaluatorRole: string;
  
  // Evaluated Subject/Entity
  subjectType: 'PERSONA_FISICA' | 'PERSONA_JURIDICA' | 'AGENCIA';
  subjectName: string;
  taxId: string; // CUIT/CUIL/DNI
  pepStatus: boolean;
  pepDetails?: string;
  activityOcupation: string;

  // Selected Parameters
  selectedCriteriaIds: string[];
  
  // Operation details
  operationType: 'COBRO_PREMIO' | 'APUESTA_PRESENCIAL' | 'APUESTA_ONLINE' | 'CAMBIO_FICHAS' | 'ALTA_AGENCIA';
  amountARS: number;
  locationDepartment: string;
  channelName: string; // e.g. "Casino Mayor Paraná", "Agencia Oficial 412"

  // Calculated Results
  rawScore: number; // 0 - 100
  weightedScore: number; // 0 - 100
  riskLevel: RiskLevel;
  dueDiligenceLevel: 'SIMPLIFICADA' | 'ESTANDAR' | 'REFORZADA';
  
  // Status & Investigation
  status: 'PENDIENTE' | 'EN_ANALISIS' | 'JUSTIFICADO' | 'ALERTA_EMITIDA' | 'REPORTE_ROS';
  notes: string;
  requiresDJOF: boolean; // Declaración Jurada Origen de Fondos
  requiresDocumentation: boolean;
  alerts: string[];
}

export interface RiskMatrixCell {
  probability: number; // 1 to 5
  impact: number; // 1 to 5
  score: number;
  level: RiskLevel;
  label: string;
}

export interface OrganizationSettings {
 shortName:string;
 legalName:string;
 area:string;
 taxId:string;
 address:string;
 email:string;
 phone:string;
 website:string;
 logo:string;
}
