import {writeFileSync,rmSync} from 'node:fs';
writeFileSync('dist/server/.dev.vars','FIRST_SUPERADMIN_EMAIL=qa-super@example.com\n');
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const server=spawn('npm',['start','--','--port','8793'],{stdio:['ignore','pipe','pipe'],detached:true});
const base='http://127.0.0.1:8793';
let log='';for(const stream of [server.stdout,server.stderr])stream.on('data',chunk=>{log+=chunk.toString()});
async function call(action,payload,user='qa-persistent-subjects',retry=0){
 const headers=user?{'oai-authenticated-user-id':user,'oai-authenticated-user-email':user==='qa-persistent-subjects'?'qa-super@example.com':'other@example.com'}:{};
 const response=await fetch(base+'/api/data',action?{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({action,payload})}:{headers});
 if(response.status===503&&retry<3){await response.text();await new Promise(r=>setTimeout(r,750));return call(action,payload,user,retry+1);}
 return {status:response.status,data:await response.json()};
}
try{
 const deadline=Date.now()+45000;while(Date.now()<deadline){try{await fetch(base+'/api/data');break}catch{await new Promise(r=>setTimeout(r,300));}}
 assert.equal((await call(null,null,null)).status,401,'anonymous access rejected');
 const doc=String(Date.now()).slice(-8);
 const subject={subjectName:'Sujeto Prueba QA',taxId:doc,subjectType:'PERSONA_FISICA',address:'Calle de Prueba 123, Paraná',email:'qa@example.com',phone:'3430000000',activity:'Prueba funcional',pepStatus:false,clientCriteriaIds:['cli-01']};
 const standaloneSubject={...subject,taxId:doc+'2',subjectName:'Ficha independiente QA'};
 const standalone=await call('saveSubject',standaloneSubject);assert.equal(standalone.status,201,JSON.stringify(standalone.data));
 assert.equal((await call('saveSubject',standaloneSubject)).status,409,'duplicate independent subject rejected');
 const edited=await call('saveSubject',{...standaloneSubject,id:standalone.data.subject.id,phone:'3432222222'});assert.equal(edited.status,200);assert.equal(edited.data.subject.phone,'3432222222');
 const subjectState=await call();assert.equal(subjectState.data.subjects.some(s=>s.id===standalone.data.subject.id),true,'subject persists without evaluation');assert.equal(subjectState.data.records.some(r=>r.subjectId===standalone.data.subject.id),false);
 assert.equal((await call('saveSubject',{...standaloneSubject,id:standalone.data.subject.id},'qa-other-user')).status,403,'other user cannot update subject');
 const record={operationAt:new Date().toISOString(),conditionConfirmed:true,pepStatus:false,activityAtOperation:subject.activity,operationType:'COBRO_PREMIO',amountARS:1000000,locationDepartment:'Paraná',channelName:'Sala de prueba',selectedCriteriaIds:['cli-01','prod-01','can-01','geo-01'],notes:'Prueba automatizada local'};
 assert.equal((await call('saveEvaluation',{subject,record})).status,400,'operations cannot create people');
 const savedSubject=await call('saveSubject',subject);assert.equal(savedSubject.status,201,JSON.stringify(savedSubject.data));
 const created=await call('saveEvaluation',{subjectId:savedSubject.data.subject.id,record});assert.equal(created.status,201,JSON.stringify(created.data));assert.equal(created.data.subject.email,subject.email);assert.equal(created.data.record.phone,subject.phone);
 assert.equal((await call('saveSubject',subject)).status,409,'duplicate rejected');
 assert.equal((await call('saveSubject',{...subject,taxId:doc.slice(0,2)+'-'+doc.slice(2)})).status,409,'formatted duplicate rejected');
 assert.equal((await call('saveSubject',{...subject,taxId:doc+'1',email:'invalid'})).status,400,'invalid email rejected');
 assert.equal((await call('saveSubject',{...subject,taxId:doc+'1',pepStatus:true,pepDetails:''})).status,400,'PEP requires detail in subject form');
 assert.equal((await call('saveSubject',{...subject,taxId:doc+'1',clientCriteriaIds:['prod-01']})).status,400,'only personal criteria belong in subject form');
 const withId={...subject,id:created.data.subject.id,address:'Dirección actualizada 456',phone:'3431111111',pepStatus:true,pepDetails:'Cargo actualizado en ficha',activity:'Actividad actualizada en ficha',clientCriteriaIds:['cli-03']};
 await call('saveSubject',withId);
 const second=await call('saveEvaluation',{subjectId:withId.id,subject:{...withId,subjectName:'No debe sobrescribir la ficha'},record:{...record,amountARS:9000000,pepStatus:false,pepDetails:'Valor que debe ignorarse',activityAtOperation:'Valor que debe ignorarse'}});assert.equal(second.status,201,JSON.stringify(second.data));
 const refreshed=await call();const matches=refreshed.data.subjects.filter(s=>s.taxId===doc);assert.equal(matches.length,1);assert.equal(matches[0].address,withId.address);assert.equal(refreshed.data.records.filter(r=>r.subjectId===withId.id).length,2);
 assert.equal(refreshed.data.records.find(r=>r.id===created.data.record.id).address,subject.address,'historical contact snapshot retained');
 assert.equal(matches[0].subjectName,subject.subjectName,'operation cannot overwrite master identity');
 assert.equal(matches[0].pepStatus,true,'operation retains master condition');
 assert.equal(second.data.record.subjectId,created.data.record.subjectId,'same person, separate operations');
 assert.notEqual(second.data.record.id,created.data.record.id,'each operation has its own dossier');
 assert.equal(created.data.record.pepStatus,false);assert.equal(second.data.record.pepStatus,true,'current master condition snapshot used');
 assert.equal(second.data.record.activityOcupation,withId.activity);
 assert.equal(second.data.record.pepDetails,withId.pepDetails);assert.ok(second.data.record.selectedCriteriaIds.includes('cli-03'));assert.ok(!second.data.record.selectedCriteriaIds.includes('cli-01'),'personal criteria cannot be overridden in operation');
 assert.ok(created.data.record.selectedCriteriaIds.includes('cli-01'),'historical personal criteria preserved');
 assert.equal(created.data.record.amountARS,1000000);assert.equal(second.data.record.amountARS,9000000);
 assert.ok(second.data.record.conditionReviewedAt);assert.ok(second.data.record.operationAt);
 assert.equal((await call('saveEvaluation',{subjectId:withId.id,record:{...record,conditionConfirmed:false}})).status,400,'each operation requires condition review');
 assert.equal((await call('saveEvaluation',{subjectId:withId.id,record},'qa-other-user')).status,403,'subject reference is authorized server-side');
 const search=await fetch(base+'/api/data?kind=subjects&q='+doc,{headers:{'oai-authenticated-user-id':'qa-persistent-subjects','oai-authenticated-user-email':'qa-super@example.com'}});assert.equal((await search.json()).subjects.some(s=>s.id===withId.id),true,'search returns saved person');
 const other=await call(null,null,'qa-other-user');assert.equal(other.status,403,'unassigned identities cannot read records');
 assert.equal((await call('updateStatus',{id:created.data.record.id,status:'EN_ANALISIS'},'qa-other-user')).status,403,'other identity cannot edit');
 const status=await call('updateStatus',{id:created.data.record.id,status:'EN_ANALISIS'});assert.equal(status.data.record.status,'EN_ANALISIS');
 assert.equal(created.data.record.status,'PENDIENTE','risk does not justify an operation automatically');
 assert.equal(second.data.record.status,'PENDIENTE','high risk does not create a ROS');
 assert.equal((await call('updateStatus',{id:created.data.record.id,status:'JUSTIFICADO'})).status,400,'closure requires documented review');
 assert.equal((await call('updateStatus',{id:created.data.record.id,status:'REPORTE_ROS'})).status,400,'ROS cannot be set by a status shortcut');
 const review={id:second.data.record.id,version:0,classification:'INUSUAL',alertOrigin:'Revisión manual de prueba',unusualType:'Desvío del patrón habitual de la operación',profileSummary:'Perfil considerado con antecedentes documentados',documentationRequested:'Respaldo del origen de fondos solicitado',documentationReviewed:'Referencia legajo QA-01; consistencia revisada',fundsAssessment:'Persisten inconsistencias explicadas en el análisis local de prueba',beneficialOwner:'Titular identificado en la ficha',reasoning:'Decisión fundada exclusivamente para la prueba funcional local',rosReference:'',rosSubmittedAt:''};
 assert.equal((await call('reviewCase',{...review,action:'REGISTRAR_ROS'})).status,400,'ROS requires prior suspicion decision and reference');
 const justified=await call('reviewCase',{...review,id:created.data.record.id,classification:'SIN_INUSUALIDAD',action:'CERRAR_JUSTIFICADA'});assert.equal(justified.status,200,JSON.stringify(justified.data));assert.equal(justified.data.record.status,'JUSTIFICADO');
 const unusual=await call('reviewCase',{...review,action:'SEGUIMIENTO'});assert.equal(unusual.status,200,JSON.stringify(unusual.data));assert.equal(unusual.data.record.analysis.classification,'INUSUAL');
 assert.equal((await call('reviewCase',{...review,action:'SEGUIMIENTO'})).status,409,'stale reviews rejected');
 const suspicion=await call('reviewCase',{...review,version:1,action:'DETERMINAR_SOSPECHOSA'});assert.equal(suspicion.status,200);assert.equal(suspicion.data.record.analysis.classification,'SOSPECHOSA');assert.notEqual(suspicion.data.record.status,'REPORTE_ROS','suspicion does not imply submission');
 const ros=await call('reviewCase',{...review,version:2,action:'REGISTRAR_ROS',rosReference:'Constancia QA ficticia',rosSubmittedAt:new Date().toISOString().slice(0,10)});assert.equal(ros.status,200,JSON.stringify(ros.data));assert.equal(ros.data.record.status,'REPORTE_ROS');assert.equal(ros.data.record.analysisHistory.length,3);assert.equal(ros.data.record.analysisHistory[0].classification,'INUSUAL');
 assert.equal((await call('reviewCase',{...review,action:'SEGUIMIENTO'},'qa-other-user')).status,403);
 assert.equal((await call('saveEvaluation',{subjectId:withId.id,record:{...record,selectedCriteriaIds:['cli-01']}})).status,400,'four EBR factors required');
 const config=await call();assert.equal((await call('saveSettings',{criteria:config.data.criteria,factorWeights:config.data.factorWeights,thresholds:config.data.thresholds})).status,200,'settings persist');
 const org={shortName:'Organización QA',legalName:'Organización de prueba local',area:'Cumplimiento',taxId:'',address:'Dirección de prueba',email:'qa@example.com',phone:'3430000000',website:'https://example.com',logo:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j0xkAAAAASUVORK5CYII='};
 assert.equal((await call('saveOrganization',org)).status,200,'organization settings saved');
 assert.deepEqual((await call()).data.organization,org,'organization and logo persist');
 assert.equal((await call(null,null,'qa-other-user')).status,403,'organization requires membership');
 assert.equal((await call('saveOrganization',{...org,logo:'data:image/svg+xml;base64,PHN2Zz4='})).status,400,'active image formats rejected');
 assert.equal((await call('saveOrganization',{...org,logo:'data:image/png;base64,YWJj'})).status,400,'fake raster rejected');
 assert.equal((await call('saveOrganization',{...org,website:'javascript:alert(1)'})).status,400,'unsafe website rejected');
 assert.equal((await call('saveOrganization',org,null)).status,401,'organization writes authenticated');
 const bad=await call('importLocal',{records:[{id:'bad'}]});assert.equal(bad.status,400,'invalid migration rejected');
 const csrf=await fetch(base+'/api/data',{method:'POST',headers:{'oai-authenticated-user-id':'qa-persistent-subjects','Content-Type':'application/json',Origin:'https://untrusted.example'},body:JSON.stringify({action:'updateStatus',payload:{id:created.data.record.id,status:'PENDIENTE'}})});assert.equal(csrf.status,403,'foreign origin rejected');

 const ownerHeaders={'oai-authenticated-user-id':'qa-persistent-subjects','oai-authenticated-user-email':'qa-super@example.com','Content-Type':'application/json'};
 async function userApi(input,headers=ownerHeaders,retry=0){const r=await fetch(base+'/api/users',input?{method:'POST',headers,body:JSON.stringify(input)}:{headers});if(r.status===503&&retry<3){await r.text();await new Promise(r=>setTimeout(r,750));return userApi(input,headers,retry+1);}return {status:r.status,data:await r.json()}}
 assert.equal((await userApi()).status,200);
 for(const role of ['ADMIN','ANALISTA','OPERADOR']){
   const email=`${role.toLowerCase()}-${Date.now()}@example.com`;
   const assigned=await userApi({email,name:'Prueba '+role,role,active:true,grants:{dashboard:'read',sujetos:'read',expedientes:'read'}});assert.equal(assigned.status,200,JSON.stringify(assigned.data));
   const headers={'oai-authenticated-user-id':'id-'+email,'oai-authenticated-user-email':email,'Content-Type':'application/json'};
   const state=await fetch(base+'/api/data',{headers});const d=await state.json();assert.equal(state.status,200);assert.ok(d.subjects.some(s=>s.id===withId.id),'shared organization data');assert.ok(d.dashboard.total>0);
   const write=async(action,payload)=>{const r=await fetch(base+'/api/data',{method:'POST',headers,body:JSON.stringify({action,payload})});return r.status};
   assert.equal(await write('saveSubject',subject),403);assert.equal(await write('saveEvaluation',{subjectId:withId.id,record}),403);assert.equal(await write('saveSettings',config.data),403);assert.equal(await write('saveOrganization',org),403);assert.equal(await write('reviewCase',review),403);
   assert.equal((await userApi(null,headers)).status,403);assert.equal((await userApi({...assigned.data.user,grants:{ajustes:'write'}},headers)).status,403,'cannot elevate own privileges');
   const grant={...assigned.data.user,grants:{sujetos:'write',expedientes:'write',dashboard:'read'}};
   assert.equal((await userApi(grant)).status,200);
   assert.equal(await write('saveSubject',{...subject,id:withId.id}),200,'assigned module permits write irrespective of role name');
   assert.equal(await write('saveEvaluation',{subjectId:withId.id,record}),201);
   await userApi({...grant,grants:{dashboard:'read'}});
   const restricted=await (await fetch(base+'/api/data',{headers})).json();assert.equal(restricted.records.length,0);assert.equal(restricted.subjects.length,0);
   assert.equal((await fetch(base+'/api/data?kind=subjects&q='+doc,{headers})).status,403);
   await userApi({...grant,active:false});assert.equal((await fetch(base+'/api/data',{headers})).status,403,'deactivated identity blocked immediately');
 }
 assert.equal((await userApi({email:'privilege@example.com',name:'Invalid super',role:'SUPERADMIN',active:true,grants:{}})).status,400,'superadmin cannot be assigned through client payload');
 console.log('PASS: four roles, shared organization, per-module server permissions, read-only access, privilege escalation rejection, revoked grants, deactivation and dashboard aggregates.');
 console.log('PASS: separate subject registration, canonical personal conditions and risk criteria, immutable historical snapshots, documented EBR review, justified closure, unusual-to-suspicious analysis, ROS reference without transmission, versioned audit trail,  independent dossiers per operation, existing subject by ID only, per-operation condition review, unchanged master identity, contact persistence, normalized duplicate protection, historical snapshots, search, status, settings, validation, identity isolation and CSRF. Local test data only.');
}catch(e){console.error(e);console.error(log.slice(-2500));process.exitCode=1;}finally{rmSync('dist/server/.dev.vars',{force:true});try{process.kill(-server.pid,'SIGTERM')}catch{}server.stdout.destroy();server.stderr.destroy();}
