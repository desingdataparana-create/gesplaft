import {readdir,readFile} from 'node:fs/promises';
import {sqlQuery,withWriteTransaction,closeDb} from '../dist-vps/server/db.mjs';
// Migraciones versionadas: portable/migrations/NNNN_nombre.sql, aplicadas en orden y una sola vez.
// Cada archivo puede tener varias sentencias separadas por ';' (sin ';' dentro de cadenas).
try{
 await sqlQuery('create table if not exists schema_migrations(name text primary key,applied_at timestamptz not null default now())');
 const dir=new URL('./migrations/',import.meta.url),files=(await readdir(dir)).filter(f=>/^\d{4}_.+\.sql$/.test(f)).sort();
 const done=new Set((await sqlQuery('select name from schema_migrations')).map(r=>r.name));let applied=0;
 for(const f of files){if(done.has(f))continue;
  const statements=(await readFile(new URL(f,dir),'utf8')).split(';').map(s=>s.trim()).filter(Boolean);
  try{await withWriteTransaction(async()=>{for(const s of statements)await sqlQuery(s);await sqlQuery('insert into schema_migrations(name) values($1)',[f]);return new Response('ok');});}
  catch(e){throw Error(`Falló la migración ${f}: ${e.message}`);}
  console.log('Aplicada:',f);applied++;}
 console.log(applied?`Esquema PostgreSQL actualizado (${applied} migración/es).`:'Esquema PostgreSQL al día.');
}finally{await closeDb();}
