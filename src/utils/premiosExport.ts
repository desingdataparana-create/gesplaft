import type {EvaluationRecord,Subject} from '../types';
// Exporta cobros de premios con las columnas y encabezados del archivo «Formato para importar premios».
const SUBJECT_HEADERS=['Apellido y Nombres','F. Nacimiento','Tipo Documento','Nro Documento (SIN PUNTOS)','CUIT','Domicilio Legal-Calle','Domicilio Legal-Numero','Domicilio Legal-Piso','Domicilio Legal-Departamento','Domicilio Legal-C.P.','Domicilio Legal-Localidad','Domicilio Legal-Provincia','Domicilio Legal-Pais','Telefono','Email','Nacionalidad','Estado Civil','Pep','Actividad','Identificacion Tributaria'].map(h=>h+'\n ');
const OPERATION_HEADERS=['JUEGO','MODALIDAD','SORTEO','FECHA SORTEO','N° AGENCIA','FORMA DE PAGO (EFECTIVO, TRANSFERENCIA, OTRO)','BANCO EMISOR (TRANSFERENCIAS)','N°CHEQUE (OPCIONAL)','CBU (TRANSFERENCIAS)'];
export const PREMIOS_HEADERS=['Fecha\n (Formato DD/MM/AAA)','Importe (En pesos, con decimal)\n ',...SUBJECT_HEADERS,...OPERATION_HEADERS];
const pad=(n:number)=>String(n).padStart(2,'0');
export function ddmmyyyy(value?:string):string{
  if(!value)return '';
  const plain=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);if(plain)return `${plain[3]}/${plain[2]}/${plain[1]}`;
  const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';
  const parts=new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'2-digit',month:'2-digit',year:'numeric'}).formatToParts(d);
  const get=(t:string)=>parts.find(p=>p.type===t)?.value||'';return `${get('day')}/${get('month')}/${get('year')}`;
}
export const premiosOf=(records:EvaluationRecord[])=>records.filter(r=>r.operationType==='COBRO_PREMIO');
export function premiosRows(records:EvaluationRecord[],subjects:Subject[]):(string|number)[][]{
  const byId=new Map(subjects.map(s=>[s.id,s]));
  return premiosOf(records).map(r=>{
    const s=byId.get(r.subjectId||''),d=s?.details||{};
    return [ddmmyyyy(r.operationAt||r.timestamp),Math.round(r.amountARS*100)/100,
      s?.subjectName||r.subjectName,ddmmyyyy(d.birthDate),d.documentType||'DNI',(s?.taxId||r.taxId||'').replace(/[^A-Za-z0-9]/g,''),(d.cuit||'').replace(/\D/g,''),
      d.street||s?.address||'',d.streetNumber||'',d.floor||'',d.apartment||'',d.postalCode||'',d.locality||'',d.province||'',d.country||'',
      s?.phone||r.phone||'',s?.email||r.email||'',d.nationality||'',d.maritalStatus||'',(s?.pepStatus??r.pepStatus)?'SI':'NO',s?.activity||r.activityAtOperation||'',d.foreignTaxId||'',
      r.game||'',r.modality||'',r.drawName||'',ddmmyyyy(r.drawDate),r.agencyNumber||'',r.paymentMethod||'EFECTIVO',r.issuingBank||'',r.chequeNumber||'',r.cbu||''];
  });
}
export async function buildPremiosXls(records:EvaluationRecord[],subjects:Subject[]):Promise<Uint8Array>{
  const XLSX=await import('xlsx');
  const group=['OPERACIÓN','',...['Sujeto',...Array(19).fill('')],'OPERACIÓN',...Array(8).fill('')];
  const sheet=XLSX.utils.aoa_to_sheet([group,PREMIOS_HEADERS,...premiosRows(records,subjects)]);
  sheet['!merges']=[{s:{r:0,c:0},e:{r:0,c:1}},{s:{r:0,c:2},e:{r:0,c:21}},{s:{r:0,c:22},e:{r:0,c:30}}];
  sheet['!cols']=PREMIOS_HEADERS.map((_,i)=>({wch:i===2?28:i===16||i===7?24:i===1||i===0?18:16}));
  const rows=premiosRows(records,subjects);rows.forEach((row,i)=>{const cell=sheet[XLSX.utils.encode_cell({r:i+2,c:1})];if(cell){cell.t='n';cell.z='#,##0.00'}[3,5,6,25,29,30].forEach(c=>{const x=sheet[XLSX.utils.encode_cell({r:i+2,c})];if(x&&x.v!==''){x.t='s';x.z='@'}});});
  const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'OperacionesDetalladas');
  return new Uint8Array(XLSX.write(book,{type:'array',bookType:'biff8'}));
}
