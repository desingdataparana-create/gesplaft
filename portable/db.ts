import {AsyncLocalStorage} from 'node:async_hooks';
import {Pool} from 'pg';
import {drizzle,type NodePgDatabase} from 'drizzle-orm/node-postgres';
import {sql} from 'drizzle-orm';
import * as schema from './schema';
const path=process.env.GESPLAFT_TEST_DATABASE;
if(!path&&!process.env.DATABASE_URL)throw Error('DATABASE_URL no configurada.');
const pool=path?null:new Pool({connectionString:process.env.DATABASE_URL,max:10});
const embedded=path?new (await import('@electric-sql/pglite')).PGlite(path==='memory'?'memory://':path):null;
const root=(embedded?(await import('drizzle-orm/pglite')).drizzle(embedded,{schema}):drizzle(pool!,{schema})) as unknown as NodePgDatabase<typeof schema>;
const context=new AsyncLocalStorage<NodePgDatabase<typeof schema>>();
export async function sqlQuery<T extends Record<string,unknown>=Record<string,unknown>>(text:string,params:unknown[]=[]):Promise<T[]>{const active=context.getStore();if(active){const statement=sql.empty();text.split(/\$(\d+)/).forEach((v,i)=>statement.append(i%2?sql`${params[Number(v)-1]}`:sql.raw(v)));return (await active.execute(statement)).rows as T[];}return embedded?(await embedded.query<T>(text,params)).rows:(await pool!.query<T>(text,params)).rows;}
export function getDb():ReturnType<typeof import('../db').getDb>{const db=context.getStore()||root;return Object.assign(db,{batch:async(queries:{getSQL:()=>import('drizzle-orm').SQL}[])=>{const run=async(tx:NodePgDatabase<typeof schema>)=>{for(const q of queries)await tx.execute(q.getSQL());};if(context.getStore())return run(db);return root.transaction(tx=>run(tx));}}) as unknown as ReturnType<typeof import('../db').getDb>;}
export async function withWriteTransaction(fn:()=>Promise<Response>){return root.transaction(async tx=>{if(!embedded)await tx.execute(sql`select pg_advisory_xact_lock(1489152314)`);return context.run(tx,async()=>{const r=await fn();if(r.status>=400)throw r;return r;});});}
export async function closeDb(){if(pool)await pool.end();if(embedded)await embedded.close();}
