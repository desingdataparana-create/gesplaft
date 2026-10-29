import React, { useState } from 'react';
import { RiskCriterion, FactorWeight, RiskLevel } from '../types';
import { 
  Grid3X3, 
  ShieldCheck, 
  ShieldAlert, 
  Layers, 
  ArrowRight, 
  Info, 
  Filter, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';

interface RiskMatrixHeatmapProps {
  criteria: RiskCriterion[];
  factorWeights: FactorWeight[];
  onSelectCriterion?: (criterion: RiskCriterion) => void;
}

export const RiskMatrixHeatmap: React.FC<RiskMatrixHeatmapProps> = ({
  criteria,
  factorWeights,
}) => {
  const [selectedCell, setSelectedCell] = useState<{ prob: number; imp: number } | null>(null);
  const [showResidual, setShowResidual] = useState(false);

  // Map 1-5 criteria into probability/impact approximations:
  // For each criterion, we derive Probability and Impact based on score and category.
  const getMatrixCoordinates = (item: RiskCriterion, residualMode: boolean) => {
    let baseScore = item.score; // 1 to 5
    if (residualMode) {
      // Apply mitigation control
      baseScore = Math.max(1, Math.round(baseScore * item.mitigationFactor));
    }

    // Assign Impact & Probability based on criterion characteristics
    let impact = baseScore;
    let probability = Math.min(5, Math.max(1, (item.score % 3) + 2));
    if (item.category === 'CLIENTE' && item.score >= 4) {
      probability = 4;
      impact = item.score;
    } else if (item.category === 'OPERACIONAL') {
      probability = 5;
      impact = Math.min(5, item.score);
    } else if (item.category === 'GEOGRAFIA') {
      probability = 3;
      impact = item.score;
    }

    if (residualMode) {
      impact = Math.max(1, Math.round(impact * item.mitigationFactor));
      probability = Math.max(1, Math.round(probability * (0.3 + item.mitigationFactor * 0.7)));
    }

    return { probability, impact };
  };

  // Get cell color & risk level based on Probability (1-5) and Impact (1-5)
  const getCellRisk = (prob: number, imp: number): { level: RiskLevel; label: string; bgClass: string; textClass: string; score: number } => {
    const product = prob * imp;
    if (product >= 16) {
      return { level: 'CRITICO', label: 'Crítico / Extremo', bgClass: 'bg-rose-600 hover:bg-rose-700 text-white', textClass: 'text-rose-700', score: product };
    }
    if (product >= 10) {
      return { level: 'ALTO', label: 'Alto', bgClass: 'bg-orange-500 hover:bg-orange-600 text-white', textClass: 'text-orange-700', score: product };
    }
    if (product >= 5) {
      return { level: 'MEDIO', label: 'Medio', bgClass: 'bg-amber-400 hover:bg-amber-500 text-slate-900', textClass: 'text-amber-700', score: product };
    }
    return { level: 'BAJO', label: 'Bajo', bgClass: 'bg-emerald-500 hover:bg-emerald-600 text-white', textClass: 'text-emerald-700', score: product };
  };

  // Count items per level
  const criteriaWithCoords = criteria.filter(c => c.active).map(c => ({
    ...c,
    coords: getMatrixCoordinates(c, showResidual),
  }));

  const selectedCellCriteria = selectedCell
    ? criteriaWithCoords.filter(
        (c) => c.coords.probability === selectedCell.prob && c.coords.impact === selectedCell.imp
      )
    : [];

  const counts = {
    BAJO: criteriaWithCoords.filter(c => getCellRisk(c.coords.probability, c.coords.impact).level === 'BAJO').length,
    MEDIO: criteriaWithCoords.filter(c => getCellRisk(c.coords.probability, c.coords.impact).level === 'MEDIO').length,
    ALTO: criteriaWithCoords.filter(c => getCellRisk(c.coords.probability, c.coords.impact).level === 'ALTO').length,
    CRITICO: criteriaWithCoords.filter(c => getCellRisk(c.coords.probability, c.coords.impact).level === 'CRITICO').length,
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 shrink-0">
        <div>
          <p className="text-sm text-slate-500 font-medium">Matriz Institucional EBR • Probabilidad vs. Impacto</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Mapa de Calor de Riesgo Inherente y Residual
          </h2>
        </div>

        {/* Toggle Inherent vs Residual */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setShowResidual(false)}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              !showResidual 
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Riesgo Inherente (Bruto)
          </button>
          <button
            onClick={() => setShowResidual(true)}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              showResidual 
                ? 'bg-teal-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Riesgo Residual (Con Mitigadores)
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Riesgo Bajo</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{counts.BAJO}</div>
          <div className="text-xs text-slate-400 mt-1 font-medium">Debida Diligencia Simplificada</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Riesgo Medio</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{counts.MEDIO}</div>
          <div className="text-xs text-slate-400 mt-1 font-medium">Debida Diligencia Estándar</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">Riesgo Alto</span>
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{counts.ALTO}</div>
          <div className="text-xs text-slate-400 mt-1 font-medium">Debida Diligencia Reforzada</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Riesgo Crítico</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{counts.CRITICO}</div>
          <div className="text-xs text-slate-400 mt-1 font-medium">Atención Inmediata / Pre-ROS</div>
        </div>
      </div>

      {/* Main Grid & Cell Inspection Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* The 5x5 Matrix */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Grid3X3 className="w-4 h-4 text-teal-600" />
              Cuadrícula 5x5: Impacto (Vertical) vs Probabilidad (Horizontal)
            </h3>
            <span className="text-xs text-slate-400 font-medium">Haga clic en una celda para filtrar</span>
          </div>

          <div className="flex flex-col items-center">
            {/* Impact Label on top left */}
            <div className="w-full flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <span>▲ Impacto / Severidad</span>
              <span>Modo: {showResidual ? 'Residual (Con Controles)' : 'Inherente (Bruto)'}</span>
            </div>

            {/* Matrix Body with Y and X axes */}
            <div className="w-full max-w-2xl space-y-2">
              {[5, 4, 3, 2, 1].map((impactVal) => {
                const impactLabels = ['1 - Insignificante', '2 - Menor', '3 - Moderado', '4 - Mayor', '5 - Catastrófico'];
                return (
                  <div key={impactVal} className="flex items-center gap-2">
                    {/* Y Axis Label */}
                    <div className="w-28 text-right text-[11px] font-semibold text-slate-500 shrink-0">
                      {impactLabels[impactVal - 1]}
                    </div>

                    {/* 5 Cells for this Impact */}
                    <div className="grid grid-cols-5 gap-2 flex-1">
                      {[1, 2, 3, 4, 5].map((probVal) => {
                        const cellRisk = getCellRisk(probVal, impactVal);
                        const itemsInCell = criteriaWithCoords.filter(
                          (c) => c.coords.probability === probVal && c.coords.impact === impactVal
                        );
                        const isSelected = selectedCell?.prob === probVal && selectedCell?.imp === impactVal;

                        return (
                          <button
                            key={probVal}
                            onClick={() => setSelectedCell(isSelected ? null : { prob: probVal, imp: impactVal })}
                            className={`h-16 sm:h-20 rounded-xl p-2 flex flex-col justify-between items-center transition-all cursor-pointer relative shadow-2xs ${cellRisk.bgClass} ${
                              isSelected ? 'ring-4 ring-slate-900 scale-102 z-10' : ''
                            }`}
                          >
                            <span className="text-[10px] font-black opacity-80 self-start">
                              {probVal}x{impactVal} ({cellRisk.score})
                            </span>

                            {itemsInCell.length > 0 && (
                              <div className="w-6 h-6 rounded-full bg-white text-slate-900 font-extrabold text-xs flex items-center justify-center shadow-md">
                                {itemsInCell.length}
                              </div>
                            )}

                            <span className="text-[10px] font-semibold truncate w-full text-center">
                              {itemsInCell.length > 0 ? `${itemsInCell.length} variables` : '-'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* X Axis Probability Labels */}
              <div className="flex items-center gap-2 pt-2">
                <div className="w-28 shrink-0"></div>
                <div className="grid grid-cols-5 gap-2 flex-1 text-center text-[11px] font-semibold text-slate-500">
                  <div>1. Muy Rara</div>
                  <div>2. Improbable</div>
                  <div>3. Posible</div>
                  <div>4. Probable</div>
                  <div>5. Frecuente</div>
                </div>
              </div>

              <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider pt-2">
                ► Probabilidad / Frecuencia de Ocurrencia
              </div>
            </div>
          </div>

          {/* Matrix Legend */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-emerald-500"></div>
              <span>Riesgo Bajo (1 - 4 pts)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-amber-400"></div>
              <span>Riesgo Medio (5 - 9 pts)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-orange-500"></div>
              <span>Riesgo Alto (10 - 15 pts)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-rose-600"></div>
              <span>Riesgo Crítico (16 - 25 pts)</span>
            </div>
          </div>
        </div>

        {/* Selected Cell Inspection Panel */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                Detalle de Celda Seleccionada
              </h3>
              {selectedCell && (
                <button
                  onClick={() => setSelectedCell(null)}
                  className="text-xs text-teal-600 hover:underline font-semibold cursor-pointer"
                >
                  Ver todos
                </button>
              )}
            </div>

            {selectedCell ? (
              <div className="space-y-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Probabilidad: {selectedCell.prob}</span>
                    <span>Impacto: {selectedCell.imp}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-500">Nivel de Riesgo:</span>
                    <span className="font-bold">
                      {getCellRisk(selectedCell.prob, selectedCell.imp).label}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  <span className="text-xs font-bold text-slate-700">
                    Variables en este cuadrante ({selectedCellCriteria.length}):
                  </span>
                  {selectedCellCriteria.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">
                      No hay parámetros posicionados en esta celda.
                    </p>
                  ) : (
                    selectedCellCriteria.map((item) => (
                      <div key={item.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 space-y-1 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-teal-800">{item.code}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                            {item.category}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900">{item.name}</div>
                        <div className="text-[11px] text-slate-500">{item.subgroup}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 space-y-2">
                <Filter className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-medium text-slate-500">
                  Seleccione cualquier cuadrante en la matriz para ver qué variables normativas y factores operacionales caen en dicho nivel.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 text-xs text-slate-500 bg-slate-50/70 p-3 rounded-xl">
            <strong>Criterio Normativo:</strong> Conforme al Enfoque Basado en Riesgo de la Res. UIF 194/2023, toda variable en cuadrantes <span className="text-orange-700 font-bold">Alto</span> o <span className="text-rose-700 font-bold">Crítico</span> activa obligatoriamente la aplicación de Debida Diligencia Reforzada.
          </div>
        </div>

      </div>

    </div>
  );
};
