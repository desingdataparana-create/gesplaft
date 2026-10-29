import {eq,and} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '../../../db';
import {appUsers} from '../../../db/schema';
import {access} from '../../access';
import {MODULES} from '../../../src/access';
export const dynamic='force-dynamic';
function error(e:unknown){return Response.json({error:e instanceof z.ZodError?e.issues[0].message:'Acceso no autorizado.'},{status:e instanceof z.ZodError?400:e instanceof Error&&e.message==='UNAUTHORIZED'?401:403});}
export async function GET(req:Request){try{const u=await access(req);if(u.role!=='SUPERADMIN')throw Error('FORBIDDEN');return Response.json({users:await getDb().select().from(appUsers).where(eq(appUsers.ownerId,u.ownerId))},{headers:{'Cache-Control':'no-store'}})}catch(e){return error(e)}}
export async function POST(req:Request){try{
 const u=await access(req);if(u.role!=='SUPERADMIN')throw Error('FORBIDDEN');
 if(req.headers.get('Origin')&&req.headers.get('Origin')!==new URL(req.url).origin)throw Error('FORBIDDEN');
 const input=z.object({id:z.string().optional(),email:z.string().trim().email().transform(v=>v.toLowerCase()),name:z.string().trim().min(2).max(100),role:z.enum(['ADMIN','ANALISTA','OPERADOR']),active:z.boolean(),grants:z.partialRecord(z.enum(MODULES),z.enum(['read','write']))}).parse(await req.json());
 if(input.grants.analisis&&!input.grants.expedientes)return Response.json({error:'El análisis requiere acceso a Expedientes.'},{status:400});
 const db=getDb();const [existing]=await db.select().from(appUsers).where(eq(appUsers.email,input.email));
 if(existing&&(existing.ownerId!==u.ownerId||existing.role==='SUPERADMIN'||existing.id!==input.id))throw Error('FORBIDDEN');
 if(input.id&&(!existing||existing.id!==input.id))throw Error('FORBIDDEN');
 const row={...input,id:existing?.id||crypto.randomUUID(),ownerId:u.ownerId,updatedAt:new Date().toISOString()};
 await db.insert(appUsers).values(row).onConflictDoUpdate({target:appUsers.id,set:row});return Response.json({user:row});
 }catch(e){return error(e)}}
