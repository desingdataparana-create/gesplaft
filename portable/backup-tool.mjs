#!/usr/bin/env node
// Abre un respaldo cifrado descargado desde GesPLAFT.
// Uso: GESPLAFT_BACKUP_PASSWORD='...' node portable/backup-tool.mjs descifrar respaldo.cifrado.json > respaldo.json
import {readFile} from 'node:fs/promises';
import {webcrypto as crypto} from 'node:crypto';
const [cmd,file]=process.argv.slice(2),password=process.env.GESPLAFT_BACKUP_PASSWORD;
if(cmd!=='descifrar'||!file||!password){console.error('Uso: GESPLAFT_BACKUP_PASSWORD=... node portable/backup-tool.mjs descifrar ARCHIVO');process.exit(2);}
const env=JSON.parse(await readFile(file,'utf8'));
if(env.formato!=='gesplaft-respaldo-cifrado'||env.version!==1){console.error('El archivo no es un respaldo cifrado de GesPLAFT.');process.exit(2);}
const bytes=v=>new Uint8Array(Buffer.from(v,'base64'));
const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(env.sal),iterations:env.iteraciones,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);
try{process.stdout.write(Buffer.from(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(env.iv)},key,bytes(env.datos))));}
catch{console.error('Contraseña incorrecta o archivo dañado.');process.exit(1);}
