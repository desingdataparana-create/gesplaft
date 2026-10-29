import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [major,minor]=process.versions.node.split('.').map(Number);
if(major<22||major===22&&minor<13)throw Error('Se requiere Node 22.13 o superior.');
const manifest=JSON.parse(await readFile(new URL('../BUILD.json',import.meta.url),'utf8'));
for(const [file,expected] of Object.entries(manifest.files)){const data=await readFile(new URL('../'+file,import.meta.url));if(createHash('sha256').update(data).digest('hex')!==expected)throw Error('No coincide el archivo: '+file);}
await import('pg');await import('drizzle-orm/node-postgres');await import('zod');
console.log('OK: archivos compilados y dependencias de ejecución verificados.');
console.log('Fuente GitHub: '+manifest.sourceCommit);
console.log('Ruta: /gesplaft/');
