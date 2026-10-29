import {readFile} from 'node:fs/promises';
import {sqlQuery,closeDb} from '../dist-vps/server/db.mjs';
try{for(const sql of (await readFile(new URL('./schema.sql',import.meta.url),'utf8')).split(';').map(s=>s.trim()).filter(Boolean))await sqlQuery(sql);console.log('Esquema PostgreSQL verificado.');}finally{await closeDb();}
