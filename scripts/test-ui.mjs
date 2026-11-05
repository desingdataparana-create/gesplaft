import {build} from 'esbuild';
import {renderToStaticMarkup} from 'react-dom/server';
import React from 'react';
import {unlink} from 'node:fs/promises';
import assert from 'node:assert/strict';
const file=new URL('../.audit-ui.mjs',import.meta.url);
try{
 await build({stdin:{contents:`export {RiskEvaluationModal} from './src/components/RiskEvaluationModal';export {NormativaMatrizView} from './src/components/NormativaMatrizView';export {SystemSettingsView} from './src/components/SystemSettingsView';export * from './src/data/initialRiskData';export {DEFAULT_ORGANIZATION} from './src/data/organization';export {DEFAULT_OPERATION_TYPES} from './src/utils/operationTypes';`,resolveDir:process.cwd()},outfile:file.pathname,bundle:true,format:'esm',platform:'node',packages:'external'});
 const x=await import(file.href),noop=()=>{},config={criteria:x.INITIAL_RISK_CRITERIA,factorWeights:x.INITIAL_FACTOR_WEIGHTS,thresholds:x.INITIAL_REGULATORY_THRESHOLDS};
 const person={id:'person',updatedAt:'2026-11-01T12:00:00Z',subjectName:'Persona visual QA',taxId:'00000031',subjectType:'PERSONA_FISICA',activity:'Empleado',pepStatus:false,clientCriteriaIds:['cli-01']};
 const original={id:'original',dossierNumber:'HIST-QA',operationAt:'2026-10-01T03:00:00.000Z',amountARS:1250.5,channelName:'Sala QA',locationDepartment:'Sin informar',operationType:'COBRO_PREMIO',notes:'Datos del archivo de origen'};
 const html=renderToStaticMarkup(React.createElement(x.RiskEvaluationModal,{...config,existingRecord:original,initialSubjectData:person,isOpen:true,onClose:noop,onSaveSubject:noop,onSaveEvaluation:noop,records:[],operationTypes:x.DEFAULT_OPERATION_TYPES}));
 assert.match(html,/aria-label="Completar evaluación histórica"/);assert.match(html,/value="1250.5"/);assert.match(html,/value="2026-10-01T00:00"/);assert.match(html,/value="Sala QA"/);assert.match(html,/Persona visual QA/);assert.match(html,/HIST-QA/);
 assert.equal((html.match(/readOnly=""/g)||[]).length,3,'source date, amount and room are read-only');
 const settings=renderToStaticMarkup(React.createElement(x.SystemSettingsView,{canEdit:false,organization:x.DEFAULT_ORGANIZATION,theme:'system',ready:true,onSave:noop,onThemeChange:noop,...config,operationTypes:x.DEFAULT_OPERATION_TYPES,operationTypesVersion:'qa',canImport:false,onImported:noop,onTypesSaved:noop}));
 assert.match(settings,/Plantilla CSV con ejemplo/);assert.match(settings,/fieldset disabled=""/);assert.match(settings,/Para importar necesitás permiso/);
 const risk=renderToStaticMarkup(React.createElement(x.NormativaMatrizView,{...config,canEdit:false,onUpdateThresholds:noop,onUpdateCriteria:noop,onUpdateWeights:noop,onOpenAddModal:noop,onEditCriterion:noop,onResetDefaults:noop}));
 assert.match(risk,/Parámetros|Configuración/);assert.match(risk,/Piso UIF/);assert.match(risk,/disabled=""/);
 console.log('PASS: renderizado de formularios históricos con datos iniciales, campos originales protegidos y consulta sin controles de escritura. No sustituye la prueba de interacción en navegador.');
}finally{await unlink(file).catch(()=>{});}
