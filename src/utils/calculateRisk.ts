import type {RiskCriterion, FactorWeight, RiskLevel, RegulatoryThreshold, EvaluationRecord} from '../types';
export function calculateRisk(criteria:RiskCriterion[],factorWeights:FactorWeight[], selectedCriteriaIds:string[], isPep:boolean, amountARS:number,thresholds:RegulatoryThreshold[]=[],context:{operationAt?:string;subjectType?:string;records?:EvaluationRecord[]}={}) {
    const selectedObj = criteria.filter((c) => c.active && selectedCriteriaIds.includes(c.id));
    
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
    if (totalScore >= 75 || isPep || selectedCriteriaIds.includes('cli-07') || selectedCriteriaIds.includes('oper-04')) {
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
    const thresholdChecks=thresholds.filter(t=>t.code!=='UMB-AGENCIA-04'||context.subjectType==='AGENCIA').map(t=>{
      const date=businessDate(context.operationAt||new Date().toISOString());
      const prior=(context.records||[]).filter(r=>{const d=businessDate(r.operationAt||r.timestamp);return t.periodicity==='MENSUAL_ACUMULADO'?d.slice(0,7)===date.slice(0,7):t.periodicity==='ANUAL'?d.slice(0,4)===date.slice(0,4):false}).reduce((n,r)=>n+r.amountARS,0);
      return {...t,total:amountARS+prior,triggered:amountARS+prior>=t.amountARS};
    });
    const triggered=thresholdChecks.filter(t=>t.triggered);
    triggered.forEach(t=>alertsGenerated.push(`${t.title}: $${t.total.toLocaleString('es-AR')} / $${t.amountARS.toLocaleString('es-AR')} (${t.periodicity}). ${t.actionRequired}`));
    if (selectedCriteriaIds.includes('oper-04')) {
      alertsGenerated.push('Señal de alerta: Sospecha de estructuración o fraccionamiento de operaciones.');
    }
    if (selectedCriteriaIds.includes('geo-02')) {
      alertsGenerated.push('Operación en zona de frontera internacional.');
    }

    const djofRequired = triggered.some(t=>t.code==='UMB-DJOF-02') || isPep || lvl === 'ALTO' || lvl === 'CRITICO';
    const docRequired = triggered.some(t=>t.code==='UMB-ID-01') || djofRequired;

    return {
      thresholdChecks,
      weightedScore: totalScore,
      rawScore: Math.round(totalScore),
      riskLevel: lvl,
      dueDiligence: dd,
      alerts: alertsGenerated,
      requiresDJOF: djofRequired,
      requiresDocumentation: docRequired,
    };

}

export function businessDate(v:string){const d=new Date(v);if(!Number.isFinite(d.getTime()))return '';const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);return ['year','month','day'].map(k=>parts.find(p=>p.type===k)?.value).join('-');}
