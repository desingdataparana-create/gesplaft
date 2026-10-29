import { EvaluationRecord, RiskCriterion, FactorWeight, RegulatoryThreshold } from '../types';

export interface DateRangeFilter {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  preset?: string;
}

export interface ReportFilterOptions {
  startDate?: string;
  endDate?: string;
  riskLevel?: string;
  status?: string;
  pepOnly?: boolean | null;
  department?: string;
  channel?: string;
}

/**
 * Filters evaluation records based on date range and optional criteria
 */
export function filterRecordsByPeriod(
  records: EvaluationRecord[],
  filters: ReportFilterOptions
): EvaluationRecord[] {
  return records.filter((rec) => {
    // Date filtering
    if (filters.startDate) {
      const recDate = (rec.operationAt||rec.timestamp).slice(0, 10);
      if (recDate < filters.startDate) return false;
    }
    if (filters.endDate) {
      const recDate = (rec.operationAt||rec.timestamp).slice(0, 10);
      if (recDate > filters.endDate) return false;
    }

    // Risk level filter
    if (filters.riskLevel && filters.riskLevel !== 'ALL' && rec.riskLevel !== filters.riskLevel) {
      return false;
    }

    // Status filter
    if (filters.status && filters.status !== 'ALL' && rec.status !== filters.status) {
      return false;
    }

    // PEP filter
    if (filters.pepOnly === true && !rec.pepStatus) {
      return false;
    }
    if (filters.pepOnly === false && rec.pepStatus) {
      return false;
    }

    if(filters.channel&&filters.channel!=='ALL'&&rec.channelName!==filters.channel)return false;
    // Department filter
    if (filters.department && filters.department !== 'ALL' && rec.locationDepartment !== filters.department) {
      return false;
    }

    return true;
  });
}

/**
 * Escapes special XML characters
 */
function escapeXml(unsafe: string | number | boolean | undefined | null): string {
  if (unsafe === undefined || unsafe === null) return '';
  const str = String(unsafe);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates an XML string for Evaluation Records / Dossiers
 */
export function generateRecordsXML(
  records: EvaluationRecord[],
  criteria: RiskCriterion[],
  metadata: {
    title: string;
    generatedAt: string;
    generatedBy: string;
    startDate?: string;
    endDate?: string;
    totalRecords: number;
    totalAmountARS: number;
  }
): string {
  const criteriaMap = new Map<string, RiskCriterion>();
  criteria.forEach(c => criteriaMap.set(c.id, c));

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<reportePLAFT xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n`;
  xml += `  <metadatos>\n`;
  xml += `    <institucion>${escapeXml(metadata.generatedBy)}</institucion>\n`;
  xml += `    <jurisdiccion>Provincia de Entre Rios - Republica Argentina</jurisdiccion>\n`;
  xml += `    <marcoNormativo>Resolucion UIF N 194/2023 - Enfoque Basado en Riesgo (EBR)</marcoNormativo>\n`;
  xml += `    <titulo>${escapeXml(metadata.title)}</titulo>\n`;
  xml += `    <fechaGeneracion>${escapeXml(metadata.generatedAt)}</fechaGeneracion>\n`;
  xml += `    <generadoPor>${escapeXml(metadata.generatedBy)}</generadoPor>\n`;
  xml += `    <periodo>\n`;
  xml += `      <fechaDesde>${escapeXml(metadata.startDate || 'Historico Completo')}</fechaDesde>\n`;
  xml += `      <fechaHasta>${escapeXml(metadata.endDate || 'Actualidad')}</fechaHasta>\n`;
  xml += `    </periodo>\n`;
  xml += `    <resumen>\n`;
  xml += `      <totalExpedientes>${metadata.totalRecords}</totalExpedientes>\n`;
  xml += `      <montoTotalARS>${metadata.totalAmountARS}</montoTotalARS>\n`;
  xml += `    </resumen>\n`;
  xml += `  </metadatos>\n`;

  xml += `  <expedientes>\n`;
  for (const r of records) {
    xml += `    <expediente id="${escapeXml(r.id)}">\n`;
    xml += `      <numeroExpediente>${escapeXml(r.dossierNumber)}</numeroExpediente>\n`;
    xml += `      <fechaEvaluacion>${escapeXml(r.timestamp)}</fechaEvaluacion>\n`;
    xml += `      <evaluador>\n`;
    xml += `        <nombre>${escapeXml(r.evaluator)}</nombre>\n`;
    xml += `        <cargo>${escapeXml(r.evaluatorRole)}</cargo>\n`;
    xml += `      </evaluador>\n`;
    xml += `      <sujeto>\n`;
    xml += `        <tipo>${escapeXml(r.subjectType)}</tipo>\n`;
    xml += `        <nombreRazonSocial>${escapeXml(r.subjectName)}</nombreRazonSocial>\n`;
    xml += `        <cuitCuilDni>${escapeXml(r.taxId)}</cuitCuilDni>\n`;
    xml += `        <esPEP>${r.pepStatus ? 'true' : 'false'}</esPEP>\n`;
    if (r.pepDetails) {
      xml += `        <detallePEP>${escapeXml(r.pepDetails)}</detallePEP>\n`;
    }
    xml += `        <actividadOcupacion>${escapeXml(r.activityOcupation)}</actividadOcupacion>\n`;
    xml += `      </sujeto>\n`;
    xml += `      <operacion>\n`;
    xml += `        <tipoOperacion>${escapeXml(r.operationType)}</tipoOperacion>\n`;
    xml += `        <montoARS>${r.amountARS}</montoARS>\n`;
    xml += `        <departamento>${escapeXml(r.locationDepartment)}</departamento>\n`;
    xml += `        <canalSalaAgencia>${escapeXml(r.channelName)}</canalSalaAgencia>\n`;
    xml += `      </operacion>\n`;
    xml += `      <scoring>\n`;
    xml += `        <puntajeBruto>${r.rawScore}</puntajeBruto>\n`;
    xml += `        <puntajePonderado>${r.weightedScore}</puntajePonderado>\n`;
    xml += `        <nivelRiesgo>${escapeXml(r.riskLevel)}</nivelRiesgo>\n`;
    xml += `        <debidaDiligencia>${escapeXml(r.dueDiligenceLevel)}</debidaDiligencia>\n`;
    xml += `      </scoring>\n`;
    xml += `      <cumplimiento>\n`;
    xml += `        <requiereDJOF>${r.requiresDJOF ? 'true' : 'false'}</requiereDJOF>\n`;
    xml += `        <requiereDocumentacion>${r.requiresDocumentation ? 'true' : 'false'}</requiereDocumentacion>\n`;
    xml += `        <estadoExpediente>${escapeXml(r.status)}</estadoExpediente>\n`;
    xml += `        <observacionesAuditor>${escapeXml(r.notes)}</observacionesAuditor>\n`;
    xml += `      </cumplimiento>\n`;

    if (r.alerts && r.alerts.length > 0) {
      xml += `      <alertasDetectadas>\n`;
      for (const alert of r.alerts) {
        xml += `        <alerta>${escapeXml(alert)}</alerta>\n`;
      }
      xml += `      </alertasDetectadas>\n`;
    }

    if (r.selectedCriteriaIds && r.selectedCriteriaIds.length > 0) {
      xml += `      <criteriosImputados>\n`;
      for (const critId of r.selectedCriteriaIds) {
        const crit = r.criteriaSnapshot?.find(c=>c.id===critId)||criteriaMap.get(critId);
        if (crit) {
          xml += `        <criterio codigo="${escapeXml(crit.code)}" categoria="${escapeXml(crit.category)}" puntaje="${crit.score}">\n`;
          xml += `          <nombre>${escapeXml(crit.name)}</nombre>\n`;
          xml += `          <baseNormativa>${escapeXml(crit.regulatoryBase)}</baseNormativa>\n`;
          xml += `        </criterio>\n`;
        }
      }
      xml += `      </criteriosImputados>\n`;
    }

    xml += `    </expediente>\n`;
  }
  xml += `  </expedientes>\n`;
  xml += `</reportePLAFT>`;

  return xml;
}

/**
 * Generates an Excel XML Spreadsheet (native 2003 XML format that opens in Excel / Sheets)
 */
export function generateRecordsXLS(
  records: EvaluationRecord[],
  metadata: {
    title: string;
    generatedAt: string;
    generatedBy: string;
    startDate?: string;
    endDate?: string;
    totalRecords: number;
    totalAmountARS: number;
  }
): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<?mso-application progid="Excel.Sheet"?>\n`;
  xml += `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n`;
  xml += ` xmlns:o="urn:schemas-microsoft-com:office:office"\n`;
  xml += ` xmlns:x="urn:schemas-microsoft-com:office:excel"\n`;
  xml += ` xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n`;
  xml += ` xmlns:html="http://www.w3.org/TR/REC-html40">\n`;

  // Styles
  xml += `  <Styles>\n`;
  xml += `    <Style ss:ID="Default" ss:Name="Normal">\n`;
  xml += `      <Alignment ss:Vertical="Center"/>\n`;
  xml += `      <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#1E293B"/>\n`;
  xml += `    </Style>\n`;
  xml += `    <Style ss:ID="HeaderTitle">\n`;
  xml += `      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>\n`;
  xml += `      <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#0F172A"/>\n`;
  xml += `    </Style>\n`;
  xml += `    <Style ss:ID="HeaderSub">\n`;
  xml += `      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>\n`;
  xml += `      <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#64748B"/>\n`;
  xml += `    </Style>\n`;
  xml += `    <Style ss:ID="TableHeader">\n`;
  xml += `      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>\n`;
  xml += `      <Borders>\n`;
  xml += `        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0284C7"/>\n`;
  xml += `        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>\n`;
  xml += `      </Borders>\n`;
  xml += `      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>\n`;
  xml += `      <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>\n`;
  xml += `    </Style>\n`;
  xml += `    <Style ss:ID="CellText">\n`;
  xml += `      <Borders>\n`;
  xml += `        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n`;
  xml += `      </Borders>\n`;
  xml += `      <Font ss:FontName="Calibri" ss:Size="10"/>\n`;
  xml += `    </Style>\n`;
  xml += `    <Style ss:ID="CellCenter">\n`;
  xml += `      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n`;
  xml += `      <Borders>\n`;
  xml += `        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n`;
  xml += `      </Borders>\n`;
  xml += `      <Font ss:FontName="Calibri" ss:Size="10"/>\n`;
  xml += `    </Style>\n`;
  xml += `    <Style ss:ID="CellCurrency">\n`;
  xml += `      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>\n`;
  xml += `      <Borders>\n`;
  xml += `        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n`;
  xml += `      </Borders>\n`;
  xml += `      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1"/>\n`;
  xml += `      <NumberFormat ss:Format="$#,##0"/>\n`;
  xml += `    </Style>\n`;
  xml += `    <Style ss:ID="CellRiskCritico">\n`;
  xml += `      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n`;
  xml += `      <Borders>\n`;
  xml += `        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n`;
  xml += `      </Borders>\n`;
  xml += `      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#991B1B"/>\n`;
  xml += `      <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>\n`;
  xml += `    </Style>\n`;
  xml += `    <Style ss:ID="CellRiskAlto">\n`;
  xml += `      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n`;
  xml += `      <Borders>\n`;
  xml += `        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n`;
  xml += `      </Borders>\n`;
  xml += `      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#C2410C"/>\n`;
  xml += `      <Interior ss:Color="#FFEDD5" ss:Pattern="Solid"/>\n`;
  xml += `    </Style>\n`;
  xml += `    <Style ss:ID="CellRiskMedio">\n`;
  xml += `      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n`;
  xml += `      <Borders>\n`;
  xml += `        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n`;
  xml += `      </Borders>\n`;
  xml += `      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#B45309"/>\n`;
  xml += `      <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>\n`;
  xml += `    </Style>\n`;
  xml += `    <Style ss:ID="CellRiskBajo">\n`;
  xml += `      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n`;
  xml += `      <Borders>\n`;
  xml += `        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n`;
  xml += `      </Borders>\n`;
  xml += `      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#166534"/>\n`;
  xml += `      <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>\n`;
  xml += `    </Style>\n`;
  xml += `  </Styles>\n`;

  // Worksheet 1: Expedientes
  xml += `  <Worksheet ss:Name="Expedientes PLA-FT">\n`;
  xml += `    <Table>\n`;
  xml += `      <Column ss:Width="120"/>\n`; // N° Expediente
  xml += `      <Column ss:Width="90"/>\n`;  // Fecha
  xml += `      <Column ss:Width="160"/>\n`; // Sujeto / Apellido y Nombre
  xml += `      <Column ss:Width="110"/>\n`; // CUIT/CUIL
  xml += `      <Column ss:Width="70"/>\n`;  // PEP
  xml += `      <Column ss:Width="140"/>\n`; // Actividad
  xml += `      <Column ss:Width="130"/>\n`; // Operación
  xml += `      <Column ss:Width="110"/>\n`; // Monto ARS
  xml += `      <Column ss:Width="100"/>\n`; // Departamento
  xml += `      <Column ss:Width="150"/>\n`; // Canal / Sala
  xml += `      <Column ss:Width="70"/>\n`;  // Score
  xml += `      <Column ss:Width="80"/>\n`;  // Riesgo
  xml += `      <Column ss:Width="90"/>\n`;  // Diligencia
  xml += `      <Column ss:Width="90"/>\n`;  // DJOF
  xml += `      <Column ss:Width="100"/>\n`; // Estado
  xml += `      <Column ss:Width="130"/>\n`; // Evaluador
  xml += `      <Column ss:Width="200"/>\n`; // Observaciones

  // Title block
  xml += `      <Row ss:Height="26">\n`;
  xml += `        <Cell ss:MergeAcross="16" ss:StyleID="HeaderTitle"><Data ss:Type="String">${escapeXml(metadata.generatedBy)} - Reporte de Expedientes y Operaciones PLA/FT</Data></Cell>\n`;
  xml += `      </Row>\n`;
  xml += `      <Row ss:Height="18">\n`;
  xml += `        <Cell ss:MergeAcross="16" ss:StyleID="HeaderSub"><Data ss:Type="String">Período: ${escapeXml(metadata.startDate || 'Inicio')} a ${escapeXml(metadata.endDate || 'Actualidad')} | Generado: ${escapeXml(metadata.generatedAt)} por ${escapeXml(metadata.generatedBy)} | Res. UIF 194/2023</Data></Cell>\n`;
  xml += `      </Row>\n`;
  xml += `      <Row ss:Height="12"></Row>\n`;

  // Header row
  xml += `      <Row ss:Height="24">\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">N° Expediente</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Fecha</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Sujeto / Razón Social</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">CUIT/DNI</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">PEP</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Actividad</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Tipo Operación</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Monto ARS</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Departamento</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Canal / Sala / Agencia</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Scoring</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Nivel Riesgo</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Debida Diligencia</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Req. DJOF</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Estado</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Auditor / Evaluador</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Observaciones</Data></Cell>\n`;
  xml += `      </Row>\n`;

  // Data rows
  for (const r of records) {
    const riskStyle = 
      r.riskLevel === 'CRITICO' ? 'CellRiskCritico' :
      r.riskLevel === 'ALTO' ? 'CellRiskAlto' :
      r.riskLevel === 'MEDIO' ? 'CellRiskMedio' : 'CellRiskBajo';

    xml += `      <Row ss:Height="20">\n`;
    xml += `        <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(r.dossierNumber)}</Data></Cell>\n`;
    xml += `        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml((r.operationAt||r.timestamp).slice(0, 10))}</Data></Cell>\n`;
    xml += `        <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(r.subjectName)}</Data></Cell>\n`;
    xml += `        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(r.taxId)}</Data></Cell>\n`;
    xml += `        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${r.pepStatus ? 'SÍ' : 'NO'}</Data></Cell>\n`;
    xml += `        <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(r.activityOcupation)}</Data></Cell>\n`;
    xml += `        <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(r.operationType.replace('_', ' '))}</Data></Cell>\n`;
    xml += `        <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">${r.amountARS}</Data></Cell>\n`;
    xml += `        <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(r.locationDepartment)}</Data></Cell>\n`;
    xml += `        <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(r.channelName)}</Data></Cell>\n`;
    xml += `        <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${r.weightedScore}</Data></Cell>\n`;
    xml += `        <Cell ss:StyleID="${riskStyle}"><Data ss:Type="String">${escapeXml(r.riskLevel)}</Data></Cell>\n`;
    xml += `        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(r.dueDiligenceLevel)}</Data></Cell>\n`;
    xml += `        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${r.requiresDJOF ? 'SÍ' : 'NO'}</Data></Cell>\n`;
    xml += `        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(r.status.replace('_', ' '))}</Data></Cell>\n`;
    xml += `        <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(r.evaluator)}</Data></Cell>\n`;
    xml += `        <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(r.notes || '')}</Data></Cell>\n`;
    xml += `      </Row>\n`;
  }

  xml += `    </Table>\n`;
  xml += `  </Worksheet>\n`;

  // Worksheet 2: Resumen Ejecutivo
  const totalBajo = records.filter(r => r.riskLevel === 'BAJO').length;
  const totalMedio = records.filter(r => r.riskLevel === 'MEDIO').length;
  const totalAlto = records.filter(r => r.riskLevel === 'ALTO').length;
  const totalCritico = records.filter(r => r.riskLevel === 'CRITICO').length;
  const totalPep = records.filter(r => r.pepStatus).length;

  xml += `  <Worksheet ss:Name="Resumen Estadístico">\n`;
  xml += `    <Table>\n`;
  xml += `      <Column ss:Width="200"/>\n`;
  xml += `      <Column ss:Width="140"/>\n`;
  xml += `      <Row ss:Height="24">\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Métrica / Indicador</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Valor</Data></Cell>\n`;
  xml += `      </Row>\n`;
  xml += `      <Row ss:Height="20">\n`;
  xml += `        <Cell ss:StyleID="CellText"><Data ss:Type="String">Total de Expedientes</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${records.length}</Data></Cell>\n`;
  xml += `      </Row>\n`;
  xml += `      <Row ss:Height="20">\n`;
  xml += `        <Cell ss:StyleID="CellText"><Data ss:Type="String">Monto Total Auditado (ARS)</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">${metadata.totalAmountARS}</Data></Cell>\n`;
  xml += `      </Row>\n`;
  xml += `      <Row ss:Height="20">\n`;
  xml += `        <Cell ss:StyleID="CellRiskCritico"><Data ss:Type="String">Riesgo Crítico</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${totalCritico}</Data></Cell>\n`;
  xml += `      </Row>\n`;
  xml += `      <Row ss:Height="20">\n`;
  xml += `        <Cell ss:StyleID="CellRiskAlto"><Data ss:Type="String">Riesgo Alto</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${totalAlto}</Data></Cell>\n`;
  xml += `      </Row>\n`;
  xml += `      <Row ss:Height="20">\n`;
  xml += `        <Cell ss:StyleID="CellRiskMedio"><Data ss:Type="String">Riesgo Medio</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${totalMedio}</Data></Cell>\n`;
  xml += `      </Row>\n`;
  xml += `      <Row ss:Height="20">\n`;
  xml += `        <Cell ss:StyleID="CellRiskBajo"><Data ss:Type="String">Riesgo Bajo</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${totalBajo}</Data></Cell>\n`;
  xml += `      </Row>\n`;
  xml += `      <Row ss:Height="20">\n`;
  xml += `        <Cell ss:StyleID="CellText"><Data ss:Type="String">Personas Expuestas Políticamente (PEP)</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${totalPep}</Data></Cell>\n`;
  xml += `      </Row>\n`;
  xml += `    </Table>\n`;
  xml += `  </Worksheet>\n`;

  xml += `</Workbook>`;
  return xml;
}

/**
 * Generates CSV string (with UTF-8 BOM for Microsoft Excel Spanish compatibility)
 */
export function generateRecordsCSV(
  records: EvaluationRecord[]
): string {
  // UTF-8 BOM
  let csv = '\uFEFF';

  const headers = [
    'N_Expediente',
    'Fecha',
    'Sujeto_Nombre_RazonSocial',
    'Tipo_Sujeto',
    'CUIT_DNI',
    'Es_PEP',
    'Detalle_PEP',
    'Actividad_Ocupacion',
    'Tipo_Operacion',
    'Monto_ARS',
    'Departamento',
    'Canal_Sala_Agencia',
    'Scoring_Ponderado',
    'Nivel_Riesgo',
    'Debida_Diligencia',
    'Requiere_DJOF',
    'Requiere_Documentacion',
    'Estado_Expediente',
    'Evaluador',
    'Cargo_Evaluador',
    'Observaciones'
  ];

  csv += headers.join(';') + '\r\n';

  for (const r of records) {
    const row = [
      `"${r.dossierNumber}"`,
      `"${(r.operationAt||r.timestamp).slice(0, 10)}"`,
      `"${(r.subjectName || '').replace(/"/g, '""')}"`,
      `"${r.subjectType}"`,
      `"${r.taxId}"`,
      `"${r.pepStatus ? 'SI' : 'NO'}"`,
      `"${(r.pepDetails || '').replace(/"/g, '""')}"`,
      `"${(r.activityOcupation || '').replace(/"/g, '""')}"`,
      `"${r.operationType}"`,
      `${r.amountARS}`,
      `"${(r.locationDepartment || '').replace(/"/g, '""')}"`,
      `"${(r.channelName || '').replace(/"/g, '""')}"`,
      `${r.weightedScore}`,
      `"${r.riskLevel}"`,
      `"${r.dueDiligenceLevel}"`,
      `"${r.requiresDJOF ? 'SI' : 'NO'}"`,
      `"${r.requiresDocumentation ? 'SI' : 'NO'}"`,
      `"${r.status}"`,
      `"${(r.evaluator || '').replace(/"/g, '""')}"`,
      `"${(r.evaluatorRole || '').replace(/"/g, '""')}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`
    ];

    csv += row.map(v=>String(v).replace(/^("?)([\s]*[=+@-])/,"$1'$2")).join(';') + '\r\n';
  }

  return csv;
}

/**
 * Generates XML for Risk Criteria Parameters
 */
export function generateCriteriaXML(
  criteria: RiskCriterion[],
  factorWeights: FactorWeight[]
): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<catalogoParametrosRiesgoPLAFT institucion="IAFAS Entre Rios" normativa="Res. UIF 194/2023">\n`;
  
  xml += `  <factoresPonderacion>\n`;
  for (const fw of factorWeights) {
    xml += `    <factor categoria="${escapeXml(fw.category)}" ponderacion="${fw.weightPercentage}%">\n`;
    xml += `      <nombre>${escapeXml(fw.name)}</nombre>\n`;
    xml += `      <descripcion>${escapeXml(fw.description)}</descripcion>\n`;
    xml += `    </factor>\n`;
  }
  xml += `  </factoresPonderacion>\n`;

  xml += `  <criterios>\n`;
  for (const c of criteria) {
    xml += `    <criterio id="${escapeXml(c.id)}" codigo="${escapeXml(c.code)}" activo="${c.active}">\n`;
    xml += `      <categoria>${escapeXml(c.category)}</categoria>\n`;
    xml += `      <subgrupo>${escapeXml(c.subgroup)}</subgrupo>\n`;
    xml += `      <nombre>${escapeXml(c.name)}</nombre>\n`;
    xml += `      <descripcion>${escapeXml(c.description)}</descripcion>\n`;
    xml += `      <puntaje>${c.score}</puntaje>\n`;
    xml += `      <nivelRiesgo>${escapeXml(c.riskLevel)}</nivelRiesgo>\n`;
    xml += `      <factorMitigador>${c.mitigationFactor}</factorMitigador>\n`;
    xml += `      <baseNormativa>${escapeXml(c.regulatoryBase)}</baseNormativa>\n`;
    xml += `      <ultimaActualizacion>${escapeXml(c.lastUpdated)}</ultimaActualizacion>\n`;
    xml += `    </criterio>\n`;
  }
  xml += `  </criterios>\n`;
  xml += `</catalogoParametrosRiesgoPLAFT>`;

  return xml;
}

/**
 * Generates XLS for Risk Criteria Parameters
 */
export function generateCriteriaXLS(
  criteria: RiskCriterion[],
  factorWeights: FactorWeight[]
): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<?mso-application progid="Excel.Sheet"?>\n`;
  xml += `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n`;
  xml += ` xmlns:o="urn:schemas-microsoft-com:office:office"\n`;
  xml += ` xmlns:x="urn:schemas-microsoft-com:office:excel"\n`;
  xml += ` xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n`;

  xml += `  <Styles>\n`;
  xml += `    <Style ss:ID="Default" ss:Name="Normal">\n`;
  xml += `      <Alignment ss:Vertical="Center"/>\n`;
  xml += `      <Font ss:FontName="Calibri" ss:Size="11"/>\n`;
  xml += `    </Style>\n`;
  xml += `    <Style ss:ID="TableHeader">\n`;
  xml += `      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n`;
  xml += `      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>\n`;
  xml += `      <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>\n`;
  xml += `    </Style>\n`;
  xml += `    <Style ss:ID="CellCenter">\n`;
  xml += `      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n`;
  xml += `    </Style>\n`;
  xml += `  </Styles>\n`;

  xml += `  <Worksheet ss:Name="Parámetros de Riesgo">\n`;
  xml += `    <Table>\n`;
  xml += `      <Column ss:Width="80"/>\n`;
  xml += `      <Column ss:Width="100"/>\n`;
  xml += `      <Column ss:Width="130"/>\n`;
  xml += `      <Column ss:Width="250"/>\n`;
  xml += `      <Column ss:Width="60"/>\n`;
  xml += `      <Column ss:Width="80"/>\n`;
  xml += `      <Column ss:Width="70"/>\n`;
  xml += `      <Column ss:Width="220"/>\n`;
  xml += `      <Column ss:Width="80"/>\n`;

  xml += `      <Row ss:Height="24">\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Código</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Factor</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Subgrupo</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Parámetro / Variable</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Puntaje</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Nivel</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Mitigador</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Base Normativa</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Estado</Data></Cell>\n`;
  xml += `      </Row>\n`;

  for (const c of criteria) {
    xml += `      <Row ss:Height="20">\n`;
    xml += `        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(c.code)}</Data></Cell>\n`;
    xml += `        <Cell><Data ss:Type="String">${escapeXml(c.category)}</Data></Cell>\n`;
    xml += `        <Cell><Data ss:Type="String">${escapeXml(c.subgroup)}</Data></Cell>\n`;
    xml += `        <Cell><Data ss:Type="String">${escapeXml(c.name)}</Data></Cell>\n`;
    xml += `        <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${c.score}</Data></Cell>\n`;
    xml += `        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(c.riskLevel)}</Data></Cell>\n`;
    xml += `        <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${c.mitigationFactor}</Data></Cell>\n`;
    xml += `        <Cell><Data ss:Type="String">${escapeXml(c.regulatoryBase)}</Data></Cell>\n`;
    xml += `        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${c.active ? 'ACTIVO' : 'INACTIVO'}</Data></Cell>\n`;
    xml += `      </Row>\n`;
  }

  xml += `    </Table>\n`;
  xml += `  </Worksheet>\n`;
  xml += `</Workbook>`;

  return xml;
}

/**
 * Generates CSV for Risk Criteria Parameters
 */
export function generateCriteriaCSV(criteria: RiskCriterion[]): string {
  let csv = '\uFEFF';
  csv += 'Codigo;Categoria;Subgrupo;Nombre_Parametro;Puntaje;Nivel_Riesgo;Factor_Mitigador;Base_Normativa;Estado;Ultima_Actualizacion\r\n';

  for (const c of criteria) {
    const row = [
      `"${c.code}"`,
      `"${c.category}"`,
      `"${(c.subgroup || '').replace(/"/g, '""')}"`,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `${c.score}`,
      `"${c.riskLevel}"`,
      `${c.mitigationFactor}`,
      `"${(c.regulatoryBase || '').replace(/"/g, '""')}"`,
      `"${c.active ? 'ACTIVO' : 'INACTIVO'}"`,
      `"${c.lastUpdated}"`
    ];
    csv += row.map(v=>String(v).replace(/^("?)([\s]*[=+@-])/,"$1'$2")).join(';') + '\r\n';
  }

  return csv;
}

/**
 * Generates XML for Regulatory Thresholds
 */
export function generateThresholdsXML(thresholds: RegulatoryThreshold[]): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<umbralesRegulatoriosPLAFT institucion="IAFAS Entre Rios" fecha="${new Date().toISOString()}">\n`;
  for (const t of thresholds) {
    xml += `  <umbral id="${escapeXml(t.id)}" codigo="${escapeXml(t.code)}">\n`;
    xml += `    <titulo>${escapeXml(t.title)}</titulo>\n`;
    xml += `    <descripcion>${escapeXml(t.description)}</descripcion>\n`;
    xml += `    <montoARS>${t.amountARS}</montoARS>\n`;
    xml += `    <periodicidad>${escapeXml(t.periodicity)}</periodicidad>\n`;
    xml += `    <accionRequerida>${escapeXml(t.actionRequired)}</accionRequerida>\n`;
    xml += `    <fuenteNormativa>${escapeXml(t.regulationSource)}</fuenteNormativa>\n`;
    xml += `    <ultimaActualizacion>${escapeXml(t.lastUpdated)}</ultimaActualizacion>\n`;
    xml += `  </umbral>\n`;
  }
  xml += `</umbralesRegulatoriosPLAFT>`;
  return xml;
}

/**
 * Generates XLS for Regulatory Thresholds
 */
export function generateThresholdsXLS(thresholds: RegulatoryThreshold[]): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<?mso-application progid="Excel.Sheet"?>\n`;
  xml += `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n`;
  xml += ` xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n`;
  xml += `  <Styles>\n`;
  xml += `    <Style ss:ID="TableHeader">\n`;
  xml += `      <Font ss:Bold="1" ss:Color="#FFFFFF"/>\n`;
  xml += `      <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>\n`;
  xml += `    </Style>\n`;
  xml += `    <Style ss:ID="Currency">\n`;
  xml += `      <NumberFormat ss:Format="$#,##0"/>\n`;
  xml += `    </Style>\n`;
  xml += `  </Styles>\n`;
  xml += `  <Worksheet ss:Name="Umbrales UIF">\n`;
  xml += `    <Table>\n`;
  xml += `      <Column ss:Width="100"/>\n`;
  xml += `      <Column ss:Width="220"/>\n`;
  xml += `      <Column ss:Width="110"/>\n`;
  xml += `      <Column ss:Width="120"/>\n`;
  xml += `      <Column ss:Width="250"/>\n`;
  xml += `      <Column ss:Width="200"/>\n`;
  xml += `      <Row ss:Height="24">\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Código</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Concepto</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Monto Vigente (ARS)</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Periodicidad</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Acción Requerida</Data></Cell>\n`;
  xml += `        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Fuente Normativa</Data></Cell>\n`;
  xml += `      </Row>\n`;
  for (const t of thresholds) {
    xml += `      <Row ss:Height="20">\n`;
    xml += `        <Cell><Data ss:Type="String">${escapeXml(t.code)}</Data></Cell>\n`;
    xml += `        <Cell><Data ss:Type="String">${escapeXml(t.title)}</Data></Cell>\n`;
    xml += `        <Cell ss:StyleID="Currency"><Data ss:Type="Number">${t.amountARS}</Data></Cell>\n`;
    xml += `        <Cell><Data ss:Type="String">${escapeXml(t.periodicity.replace('_', ' '))}</Data></Cell>\n`;
    xml += `        <Cell><Data ss:Type="String">${escapeXml(t.actionRequired)}</Data></Cell>\n`;
    xml += `        <Cell><Data ss:Type="String">${escapeXml(t.regulationSource)}</Data></Cell>\n`;
    xml += `      </Row>\n`;
  }
  xml += `    </Table>\n`;
  xml += `  </Worksheet>\n`;
  xml += `</Workbook>`;
  return xml;
}

/**
 * Generates CSV for Regulatory Thresholds
 */
export function generateThresholdsCSV(thresholds: RegulatoryThreshold[]): string {
  let csv = '\uFEFF';
  csv += 'Codigo;Concepto_Umbral;Monto_ARS;Periodicidad;Accion_Requerida;Fuente_Normativa;Ultima_Actualizacion\r\n';
  for (const t of thresholds) {
    const row = [
      `"${t.code}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `${t.amountARS}`,
      `"${t.periodicity}"`,
      `"${(t.actionRequired || '').replace(/"/g, '""')}"`,
      `"${(t.regulationSource || '').replace(/"/g, '""')}"`,
      `"${t.lastUpdated}"`
    ];
    csv += row.map(v=>String(v).replace(/^("?)([\s]*[=+@-])/,"$1'$2")).join(';') + '\r\n';
  }
  return csv;
}

/**
 * Helper to download content as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
