import {build} from 'esbuild';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {readSheet} from 'read-excel-file/node';import assert from 'node:assert/strict';
const dir=await mkdtemp(join(tmpdir(),'gesplaft-files-'));
try{
 const path=join(dir,'files.mjs');await build({entryPoints:['src/utils/operationImport.ts'],outfile:path,bundle:true,platform:'node',format:'esm'});const x=await import(path);
 const matrix=await readSheet('public/templates/operaciones.xlsx',1),rows=x.rowsFromMatrix(matrix);
 assert.equal(rows.length,1);assert.equal(rows[0].documento,'00000001');assert.equal(rows[0].importe_ars,'6000000');assert.equal(x.parseImportDate(rows[0].fecha_operacion),'2026-11-01T17:30:00.000Z');
 const csv='\uFEFF'+matrix.map(row=>row.map(value=>'"'+String(value instanceof Date?value.toISOString().slice(0,19):value??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
 assert.deepEqual(x.rowsFromMatrix(x.parseCsv(csv)),rows,'real Excel file and equivalent CSV normalize identically');
 assert.throws(()=>x.parseCsv('a;b\n"cerrada"texto;otro'));
 console.log('PASS: plantilla XLSX real, primera hoja, ceros de documento, importe numérico, fecha Excel argentina y equivalencia CSV.');
}finally{await rm(dir,{recursive:true,force:true});}
