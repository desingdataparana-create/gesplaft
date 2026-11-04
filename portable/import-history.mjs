// Administración local: no expone un endpoint ni almacena datos personales en el código.
import {readFileSync,mkdtempSync,openSync,closeSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {POST} from '../app/api/data/route';
import {sqlQuery,withWriteTransaction,closeDb} from './db';
try{
 const bytes=readFileSync(0),expected=process.argv.find(a=>a.startsWith('--sha256='))?.slice(9);
 if(!expected||createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('El archivo no coincide con la huella autorizada.');
 const rows=JSON.parse(bytes.toString('utf8'));
 const testing=process.env.GESPLAFT_TEST_DATABASE&&process.env.NODE_ENV==='test';
 const u=testing?null:new URL(process.env.DATABASE_URL||'');
 if(!testing&&(decodeURIComponent(u.pathname.slice(1))!=='gesplaft_test'||!['127.0.0.1','localhost','[::1]'].includes(u.hostname)))throw Error('Solo se permite la base local de pruebas gesplaft_test.');
 const actors=await sqlQuery("select id,email from app_users where role='SUPERADMIN' and active=true");
 if(actors.length!==1)throw Error('Se necesita exactamente un superadministrador activo. No se modificó la base.');
 const actor=actors[0],origin=process.env.PUBLIC_ORIGIN||'http://127.0.0.1:8094';
 const call=async(action,payload)=>{const r=await withWriteTransaction(()=>POST(new Request(origin+'/gesplaft/api/data',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','oai-authenticated-user-id':actor.id,'oai-authenticated-user-email':actor.email},body:JSON.stringify({action,payload})})));const d=await r.json();if(!r.ok)throw Error(d.error||'No se pudo completar la operación.');return d;};
 const preview=await call('previewHistoricalImport',{rows});
 console.log(JSON.stringify({operaciones:preview.newCount,sujetos:preview.subjectCount,yaImportadas:preview.skipped,errores:preview.errors,ejemplosIdentificados:preview.examples}));
 if(preview.errors)throw Error('Hay filas inválidas. Revisá la vista previa desde Ajustes; no se modificó la base.');
 if(!process.argv.includes('--apply')){console.log('Vista previa sin escrituras.');}
 else{
   if(!testing){
     const backup=mkdtempSync('/root/gesplaft-datos-respaldo-');const dump=backup+'/postgresql.dump';const fd=openSync(dump,'wx',0o600);
     try{const result=spawnSync('pg_dump',['--format=custom','--no-owner','--no-acl'],{env:{...process.env,PGHOST:u.hostname,PGPORT:u.port||'5432',PGDATABASE:'gesplaft_test',PGUSER:decodeURIComponent(u.username),PGPASSWORD:decodeURIComponent(u.password)},stdio:['ignore',fd,'pipe']});if(result.error||result.status!==0)throw Error('Falló el respaldo; no se modificó la base.');}finally{closeSync(fd);}
     const list=spawnSync('pg_restore',['--list',dump],{encoding:'utf8'});if(list.error||list.status!==0||!list.stdout.trim())throw Error('No se pudo verificar el respaldo.');writeFileSync(backup+'/contenido.txt',list.stdout,{mode:0o600});console.log('RESPALDO DE DATOS: '+backup);
   }
   const result=await call('importHistoricalOperations',{rows,fingerprint:preview.fingerprint,confirmed:true,replaceExamples:true});console.log('DATOS CARGADOS: '+JSON.stringify(result));
   const [totals]=await sqlQuery('select count(*)::int as operaciones,round(coalesce(sum((record->>\'amountARS\')::numeric),0),2)::text as importe from evaluations where owner_id=$1',[actor.id]);console.log('TOTAL DEL ENTORNO: '+JSON.stringify(totals));
 }
}catch(e){console.error(e instanceof Response?'Importación detenida; revisá la vista previa.':e.message);process.exitCode=1;}finally{await closeDb();}
