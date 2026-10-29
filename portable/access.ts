import {and,eq} from 'drizzle-orm';
import {getDb} from './db';
import {appUsers} from './schema';
import {can,type Module} from '../src/access';
export async function access(req:Request){const id=req.headers.get('oai-authenticated-user-id'),email=req.headers.get('oai-authenticated-user-email');if(!id||!email)throw Error('UNAUTHORIZED');const [u]=await getDb().select().from(appUsers as never).where(and(eq(appUsers.id,id),eq(appUsers.email,email))) as unknown as (typeof appUsers.$inferSelect)[];if(!u?.active)throw Error('FORBIDDEN');return u;}
export function requireModule(u:Awaited<ReturnType<typeof access>>,m:Module,w=false){if(!can(u,m,w))throw Error('FORBIDDEN');}
