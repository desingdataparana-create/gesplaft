export const IMPORT_LIMIT=200;
export const IMPORT_HEADERS=['referencia','documento','nombre','tipo_sujeto','actividad','pep','detalle_pep','criterios_sujeto','tipo_operacion','fecha_operacion','importe_ars','departamento','sala','producto','canal','zona','direccion','email','telefono','notas'] as const;
export type ImportColumn=typeof IMPORT_HEADERS[number];
export type ImportRow=Partial<Record<ImportColumn,string>> & {_fila:number};
export const normalizeText=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
export function parseCsv(text:string):string[][] {
 text=text.replace(/^\uFEFF/,'');
 const firstLine=text.split(/\r?\n/,1)[0]||'';
 const delimiter=firstLine.includes(';')?';':',';
 const rows:string[][]=[];let row:string[]=[],value='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else if(quoted){quoted=false;closed=true;}else if(value.length||closed)throw Error('Comillas inválidas en el CSV.');else quoted=true;}
  else if(!quoted&&c===delimiter){row.push(value);value='';closed=false;}
  else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);rows.push(row);row=[];value='';closed=false;}
  else if(!quoted&&closed){if(!/\s/.test(c))throw Error('Hay texto después del cierre de comillas en el CSV.');}
  else value+=c;
 }
 if(quoted)throw Error('El CSV tiene una celda con comillas sin cerrar.');
 if(value||row.length){row.push(value);rows.push(row);}
 return rows;
}
export function rowsFromMatrix(matrix:unknown[][]):ImportRow[]{
 if(!matrix.length)throw Error('El archivo está vacío.');
 const header=matrix[0].map(x=>normalizeText(String(x??'')).toLowerCase().replace(/\s+/g,'_'));
 if(header.some(h=>!IMPORT_HEADERS.includes(h as ImportColumn))||new Set(header).size!==header.length)throw Error('Hay encabezados desconocidos o repetidos. Usá la plantilla sin cambiar la primera fila.');
 for(const h of ['referencia','documento','tipo_operacion','fecha_operacion','importe_ars','departamento','sala','producto','canal','zona'])if(!header.includes(h))throw Error('Falta la columna '+h+'.');
 const result:ImportRow[]=[];
 matrix.slice(1).forEach((cells,index)=>{
  if(cells.every(v=>v===null||v===undefined||String(v).trim()===''))return;
  if(cells.length>header.length&&cells.slice(header.length).some(v=>v!==null&&v!==undefined&&String(v).trim()))throw Error('Hay celdas fuera de los encabezados en la fila '+(index+2)+'.');
  const row:ImportRow={_fila:index+2};
  header.forEach((h,i)=>{const value=cells[i];row[h as ImportColumn]=value instanceof Date?value.toISOString().slice(0,19):String(value??'').trim();});
  result.push(row);
 });
 if(!result.length||result.length>IMPORT_LIMIT)throw Error(`Cargá entre 1 y ${IMPORT_LIMIT} operaciones por archivo.`);
 return result;
}
export function parseImportAmount(value:string){
 if(!/^\d+(?:[.,]\d{1,2})?$/.test(value))throw Error('Importe: usá números sin separador de miles y hasta dos decimales.');
 const n=Number(value.replace(',','.'));
 if(!Number.isFinite(n)||n<=0||n>1e15)throw Error('El importe debe ser mayor a cero.');
 return n;
}
export function parseImportDate(value:string){
 let v=value.trim().replace(' ','T');
 if(/^\d{2}\/\d{2}\/\d{4}T\d{2}:\d{2}(:\d{2})?$/.test(v)){const [date,time]=v.split('T'),[d,m,y]=date.split('/');v=`${y}-${m}-${d}T${time}`;}
 if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v))v+='-03:00';
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(v)||!Number.isFinite(Date.parse(v)))throw Error('Fecha: usá AAAA-MM-DD HH:mm (hora argentina).');
 const day=v.slice(0,10),test=new Date(day+'T12:00:00Z').toISOString().slice(0,10);
 if(day!==test)throw Error('La fecha no existe.');
 if(Date.parse(v)>Date.now()+60000)throw Error('La operación no puede tener fecha futura.');
 return new Date(v).toISOString();
}
export interface ImportPreviewRow {fila:number;referencia:string;sujeto:string;documento:string;importe?:number;riesgo?:string;puntaje?:number;alcance?:string;estado:'NUEVA'|'YA_IMPORTADA'|'ERROR';error?:string}
export interface ImportPreview {rows:ImportPreviewRow[];fingerprint:string;newCount:number;subjectCount:number;skipped:number;errors:number}
