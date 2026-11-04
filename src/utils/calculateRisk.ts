import { simplifyRiskConfiguration } from './riskConfiguration';
import type {RiskCriterion, FactorWeight, RiskLevel, RegulatoryThreshold, EvaluationRecord, OperationType} from '../types';
export function calculateRisk(criteria:RiskCriterion[],factorWeights:FactorWeight[], selectedCriteriaIds:string[], isPep:boolean, amountARS:number,thresholds:RegulatoryThreshold[]=[],context:{operationAt?:string;subjectType?:string;records?:EvaluationRecord[];operationType?:OperationType}={}) {
    ({criteria, factorWeights, thresholds} = simplifyRiskConfiguration({criteria, factorWeights, thresholds}));
    const selectedObj = criteria.filter((c) => c.active && !c.deletedAt && selectedCriteriaIds.includes(c.id));
    
    const catScores: Record<string, { avgScore: number; count: number; maxScore: number; weight: number }> = {};

    factorWeights.forEach((fw) => {
      const itemsInCat = selectedObj.filter((c) => c.category === fw.category);
      if (itemsInCat.length > 0) {
        const maxScore = Math.max(...itemsInCat.map((c) => c.score));
        const avg = itemsInCat.reduce((acc, curr) => acc + curr.score, 0) / itemsInCat.length;
        catScores[fw.category] = {
          avgScore: avg,
          maxScore: maxScore,
          count: itemsInCat.length,
          weight: fw.weightPercentage,
        };
      } else {
        catScores[fw.category] = {
          avgScore: 1,
          maxScore: 1,
          count: 0,
          weight: fw.weightPercentage,
        };
      }
    });

    let totalScore = 0;
    factorWeights.forEach((fw) => {
      const data = catScores[fw.category];
      const categoryNormalized = ((data.maxScore * 0.7 + data.avgScore * 0.3) / 5) * 100;
      totalScore += categoryNormalized * (fw.weightPercentage / 100);
    });

    totalScore = Math.min(100, Math.max(10, Math.round(totalScore * 10) / 10));

    let lvl: RiskLevel = 'BAJO';
    if (totalScore >= 75 || isPep || selectedObj.some(c=>['cli-03','cli-04','cli-07'].includes(c.id))) {
      lvl = totalScore >= 85 ? 'CRITICO' : 'ALTO';
    } else if (totalScore >= 40) {
      lvl = 'MEDIO';
    }

    let dd: 'SIMPLIFICADA' | 'ESTANDAR' | 'REFORZADA' = 'SIMPLIFICADA';
    if (lvl === 'ALTO' || lvl === 'CRITICO') {
      dd = 'REFORZADA';
    } else if (lvl === 'MEDIO') {
      dd = 'ESTANDAR';
    }

    const alertsGenerated: string[] = [];
    if (isPep) {
      alertsGenerated.push('Persona Expuesta Políticamente (PEP): Requiere debida diligencia reforzada.');
    }
    const scope=context.operationType?.uifScope||'PISO';
    const thresholdChecks=thresholds.map(t=>({...t,total:amountARS,triggered:amountARS>=t.amountARS}));
    const triggered=thresholdChecks.filter(t=>t.triggered);
    if(scope==='PISO')triggered.forEach(t=>alertsGenerated.push(`${t.title}: $${t.total.toLocaleString('es-AR')} / $${t.amountARS.toLocaleString('es-AR')} (${t.periodicity}). ${t.actionRequired}`));
    if (selectedObj.some(c=>c.id==='geo-02')) {
      alertsGenerated.push('Operación en zona de frontera internacional.');
    }

    const djofRequired = isPep || lvl === 'ALTO' || lvl === 'CRITICO';
    const meetsFloor=triggered.some(t=>t.code==='UMB-ID-01');
    const identificationRequired=scope==='SIEMPRE'||scope==='PISO'&&meetsFloor;
    const scopeReason=scope==='SIEMPRE'?'Identificación desde el inicio de la relación en línea.':scope==='NO_APLICA'?'Este tipo de operación no usa el piso monetario para definir su alcance.':meetsFloor?'Alcanza el piso UIF configurado.':'No alcanza el piso UIF configurado; el riesgo se informa para seguimiento.';
    const docRequired = identificationRequired || djofRequired;
    const categoryBreakdown=factorWeights.map(w=>({category:w.category,name:w.name,weight:w.weightPercentage,score:Math.round(((catScores[w.category].maxScore*.7+catScores[w.category].avgScore*.3)/5)*1000)/10,criteria:selectedObj.filter(c=>c.category===w.category).map(c=>c.name)}));

    return {
      thresholdChecks,
      evaluationScope:{meetsFloor,identificationRequired,reason:scopeReason},
      categoryBreakdown,
      weightedScore: totalScore,
      rawScore: Math.round(totalScore),
      riskLevel: lvl,
      dueDiligence: dd,
      alerts: alertsGenerated,
      requiresDJOF: djofRequired,
      requiresDocumentation: docRequired,
    };

}

export {businessDate} from './businessTime';
