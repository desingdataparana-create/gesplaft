import {request as httpRequest} from 'node:http';
import {spawn} from 'node:child_process';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
const temp=await mkdtemp(join(tmpdir(),'gesplaft-audit-')),origin='http://127.0.0.1:8797',base=origin+'/gesplaft',env={...process.env,GESPLAFT_TEST_DATABASE:join(temp,'pg'),PUBLIC_ORIGIN:origin,PORT:'8797',NODE_ENV:'test'};let server,log='';
function run(args,input=''){return new Promise((yes,no)=>{const p=spawn(process.execPath,args,{env,stdio:['pipe','pipe','pipe']});let output='';p.stdout.on('data',d=>output+=d);p.stderr.on('data',d=>output+=d);p.stdin.end(input);p.on('exit',c=>c?no(Error(output)):yes(output));});}
async function login(email,password){const r=await fetch(base+'/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email,password}),redirect:'manual'});return r.headers.get('set-cookie')?.split(';')[0]||'';}
async function api(cookie,action,payload,path='/api/data'){const r=await fetch(base+path,{method:action?'POST':'GET',headers:{Cookie:cookie,...(action?{Origin:origin,'Content-Type':'application/json'}:{})},...(action?{body:JSON.stringify(path==='/api/data'?{action,payload}:payload)}:{})});return {status:r.status,data:await r.json()};}

try{
 await run(['portable/migrate.mjs']);await run(['portable/admin.mjs','qa-audit@example.com'],'Fictional-Audit-2026\n');
 server=spawn(process.execPath,['dist-vps/server/server.mjs'],{env,stdio:['ignore','pipe','pipe']});for(const s of [server.stdout,server.stderr])s.on('data',d=>log+=d);
 let ready=false;for(let i=0;i<90;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,300));}assert.ok(ready,log);
 const cookie=await login('qa-audit@example.com','Fictional-Audit-2026');assert.ok(cookie);
 let state=(await api(cookie)).data;
 const config={criteria:state.criteria,factorWeights:state.factorWeights,thresholds:state.thresholds};
 const updated={...config,thresholds:config.thresholds.map(t=>({...t,amountARS:1000}))};
 assert.equal((await api(cookie,'saveSettings',{...updated,expectedConfig:config})).status,200);
 assert.equal((await api(cookie,'saveSettings',{...config,expectedConfig:config})).status,409,'stale risk configuration cannot overwrite another edit');
 const org=state.organization;
 assert.equal((await api(cookie,'saveOrganization',{...org,area:'Área modificada',expectedOrganization:org})).status,200);
 assert.equal((await api(cookie,'saveOrganization',{...org,area:'Otra área',expectedOrganization:org})).status,409,'stale organization form is rejected');
 assert.equal((await api(cookie,'saveOperationTypes',{version:state.operationTypesVersion,types:[...org.operationTypes,{code:'REPETIDO',name:'  COBRO DE PREMIO  ',active:true,uifScope:'PISO'}]})).status,400,'ambiguous catalog labels are rejected');
 assert.equal((await api(cookie,'saveSubject',{subjectName:'Inválido QA',taxId:'letras12345678',subjectType:'PERSONA_FISICA',activity:'Empleado',pepStatus:false})).status,400,'letters are not silently stripped from identity');
 const rows=[{_fila:2,values:['2026-10-01','Persona histórica QA','00000031','20000000310','ARGENTINA','Sala QA','1250.50','EFECTIVO','Empleado','NO','2','ALTO']},{_fila:3,values:['2026-10-02','Persona sin documento QA','','','ARGENTINA','Sala QA','2000','EFECTIVO','Empleado','NO','1','MEDIO']}];
 const preview=await api(cookie,'previewHistoricalImport',{rows});assert.equal(preview.data.errors,0);
 assert.equal((await api(cookie,'importHistoricalOperations',{rows,fingerprint:preview.data.fingerprint,confirmed:true})).status,200);
 state=(await api(cookie)).data;assert.equal(state.dashboard.pendingEvaluation,2);assert.equal(Object.values(state.dashboard.risk).reduce((a,b)=>a+b,0),0,'source risks are not counted as completed evaluations');
 let historic=state.records.find(r=>r.sourceRow===2),unidentified=state.records.find(r=>r.sourceRow===3),person=state.subjects[0];
 const review={id:historic.id,version:0,action:'CERRAR_JUSTIFICADA',classification:'SIN_INUSUALIDAD',alertOrigin:'Revisión QA',unusualType:'',documentationRequested:'',documentationReviewed:'',beneficialOwner:'',reasoning:'Revisión documentada de prueba',rosReference:'',rosSubmittedAt:''};
 assert.equal((await api(cookie,'reviewCase',review)).status,409,'pending historical assessment cannot be closed as justified');
 const makeRecord=(row,p)=>({subjectUpdatedAt:p.updatedAt,operationType:'COBRO_PREMIO',operationAt:row.operationAt,conditionConfirmed:true,amountARS:row.amountARS,locationDepartment:'Paraná',channelName:row.channelName,selectedCriteriaIds:['prod-04','can-03','geo-01'],notes:row.notes});
 let payload={id:historic.id,version:0,subjectId:person.id,record:makeRecord(historic,person)};
 assert.equal((await api(cookie,'completeHistoricalEvaluation',payload)).status,409,'missing personal factors require completing master identity');
 let saved=await api(cookie,'saveSubject',{...person,clientCriteriaIds:['cli-01']});assert.equal(saved.status,200);person=saved.data.subject;payload.record=makeRecord(historic,person);
 assert.equal((await api(cookie,'completeHistoricalEvaluation',{...payload,record:{...payload.record,amountARS:1}})).status,409,'source amount cannot be changed');
 const completed=await api(cookie,'completeHistoricalEvaluation',payload);assert.equal(completed.status,200,JSON.stringify(completed));
 const assessed=completed.data.record;assert.equal(assessed.id,historic.id);assert.equal(assessed.dossierNumber,historic.dossierNumber);assert.equal(assessed.timestamp,historic.timestamp);assert.deepEqual(assessed.sourceData,historic.sourceData);assert.equal(assessed.importRowFingerprint,historic.importRowFingerprint);assert.equal(assessed.evaluationPending,false);assert.equal(assessed.riskLevel,'BAJO');assert.equal(assessed.analysisVersion,1);
 assert.equal((await api(cookie,'completeHistoricalEvaluation',payload)).status,409,'concurrent completion does not create another operation');
 const again=await api(cookie,'previewHistoricalImport',{rows});assert.equal(again.data.skipped,2,'completion does not break original import deduplication');
 saved=await api(cookie,'saveSubject',{...person,taxId:'00000032'});assert.equal(saved.status,200,'document correction uses stable subject id');assert.equal(saved.data.subject.id,person.id);
 assert.equal((await api(cookie,'saveSubject',{...person,phone:'3430000000'})).status,409,'stale edit cannot reverse the identity correction');
 assert.equal((await api(cookie)).data.records.find(r=>r.id===historic.id).taxId,'00000031','previous identity remains in the evaluation snapshot');
 const wrong=await api(cookie,'saveSubject',{subjectName:'Persona distinta QA',taxId:'00000033',subjectType:'PERSONA_FISICA',activity:'Empleado',pepStatus:false,clientCriteriaIds:['cli-01']});
 assert.equal((await api(cookie,'completeHistoricalEvaluation',{id:unidentified.id,version:0,subjectId:wrong.data.subject.id,record:makeRecord(unidentified,wrong.data.subject)})).status,409,'unidentified historical operation cannot link an unrelated name');
 const identified=await api(cookie,'saveSubject',{subjectName:unidentified.subjectName,taxId:'00000034',subjectType:'PERSONA_FISICA',activity:'Empleado',pepStatus:false,clientCriteriaIds:['cli-01']});
 const linked=await api(cookie,'completeHistoricalEvaluation',{id:unidentified.id,version:0,subjectId:identified.data.subject.id,record:makeRecord(unidentified,identified.data.subject)});assert.equal(linked.status,200,JSON.stringify(linked));assert.equal(linked.data.record.sourceData.DNI,'');assert.equal(linked.data.record.taxId,'00000034');
 const closed=await api(cookie,'reviewCase',{...review,version:1});assert.equal(closed.status,200);
 const follow=await api(cookie,'reviewCase',{...review,version:2,action:'SEGUIMIENTO'});assert.equal(follow.status,200);assert.equal(follow.data.record.status,'JUSTIFICADO','follow-up preserves a justified closure');
 assert.equal((await api(cookie,'updateStatus',{id:historic.id,status:'PENDIENTE'})).status,409,'shortcut cannot contradict documented analysis');
 const sus=await api(cookie,'reviewCase',{...review,id:unidentified.id,version:1,classification:'INUSUAL',unusualType:'Inusualidad ficticia documentada para QA',action:'DETERMINAR_SOSPECHOSA'});assert.equal(sus.status,200);
 assert.equal((await api(cookie,'reviewCase',{...review,id:unidentified.id,version:2,action:'SEGUIMIENTO'})).status,400,'follow-up cannot silently remove suspicion');
 assert.equal((await api(cookie,'reviewCase',{...review,id:unidentified.id,version:2,action:'REGISTRAR_ROS',rosReference:'Constancia QA',rosSubmittedAt:'2026-02-31'})).status,400,'impossible ROS dates are rejected');
 assert.equal((await api(cookie,'reviewCase',{...review,id:unidentified.id,version:2,action:'REGISTRAR_ROS',rosReference:'Constancia QA',rosSubmittedAt:'2026-09-01'})).status,400,'ROS cannot precede the operation');
 const operator=await api(cookie,true,{email:'qa-audit-operator@example.com',name:'Operador auditoría',role:'OPERADOR',active:true,grants:{expedientes:'read'}},'/api/users');
 await api(cookie,true,{id:operator.data.user.id,password:'Fictional-Operator-2026'},'/api/users/password');const readOnly=await login('qa-audit-operator@example.com','Fictional-Operator-2026');
 assert.equal((await api(readOnly,'completeHistoricalEvaluation',payload)).status,403);assert.equal((await api(readOnly,'deleteEvaluation',{id:historic.id,version:JSON.stringify(follow.data.record),confirmed:true})).status,403);
 const requestBody=Buffer.from(JSON.stringify({action:'saveSubject',payload:{subjectName:'Muñoz Peña QA',taxId:'00000035',subjectType:'PERSONA_FISICA',activity:'Empleado',pepStatus:false,clientCriteriaIds:['cli-01']}}));const split=requestBody.indexOf(Buffer.from('ñ'))+1;
 const response=await new Promise((resolve,reject)=>{const req=httpRequest(base+'/api/data',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'}},res=>{let body='';res.on('data',d=>body+=d);res.on('end',()=>resolve({status:res.statusCode,data:JSON.parse(body)}));});req.on('error',reject);req.write(requestBody.subarray(0,split));setTimeout(()=>req.end(requestBody.subarray(split)),30);});assert.equal(response.status,201);assert.equal(response.data.subject.subjectName,'Muñoz Peña QA','UTF-8 survives a split network character');
 const badPassword=await fetch(base+'/api/users/password',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:'null'});assert.equal(badPassword.status,400);
 state=(await api(cookie)).data;assert.equal(state.records.length,2);assert.equal(state.dashboard.pendingEvaluation,0);assert.equal(Object.values(state.dashboard.risk).reduce((a,b)=>a+b,0),2);
 console.log('PASS: históricos completados sin duplicación, datos fuente preservados, identificación pendiente, corrección documental, permisos, versiones, períodos, reportes, estados, ROS y UTF-8 fragmentado.');
}catch(e){console.error(e);console.error(log.slice(-2000));process.exitCode=1;}finally{if(server){server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));}await rm(temp,{recursive:true,force:true});}
