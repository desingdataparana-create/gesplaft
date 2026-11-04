import {spawnSync} from 'node:child_process';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const temp=mkdtempSync(join(tmpdir(),'gesplaft-history-cli-')),env={...process.env,NODE_ENV:'test',GESPLAFT_TEST_DATABASE:join(temp,'pg'),PUBLIC_ORIGIN:'http://127.0.0.1:8094'};
const run=(args,input='')=>{const p=spawnSync(process.execPath,args,{env,input,encoding:'utf8'});assert.equal(p.status,0,p.stderr+p.stdout);return p.stdout;};
try{
 run(['portable/migrate.mjs']);run(['portable/admin.mjs','qa-history@example.com'],'Fictional-History-2026\n');
 const rows=[{_fila:2,values:['2025-03-03','Persona de archivo ficticia','00000031','20000000310','ARGENTINA','Sala QA','1234.56','EFECTIVO','Empleado','NO','1','BAJO']}],input=JSON.stringify(rows),sha=createHash('sha256').update(input).digest('hex');
 assert.match(run(['dist-vps/server/import-history.mjs','--sha256='+sha],input),/Vista previa sin escrituras/);
 assert.match(run(['dist-vps/server/import-history.mjs','--sha256='+sha,'--apply'],input),/"imported":1/);
 assert.match(run(['dist-vps/server/import-history.mjs','--sha256='+sha,'--apply'],input),/"imported":0/);
 const bad=spawnSync(process.execPath,['dist-vps/server/import-history.mjs','--sha256='+'0'.repeat(64),'--apply'],{env,input,encoding:'utf8'});assert.equal(bad.status,1);assert.match(bad.stderr,/huella autorizada/);
 console.log('PASS: importador local con huella, vista previa, autorización superadmin, transacción y reintento sin duplicados.');
}finally{rmSync(temp,{recursive:true,force:true});}
