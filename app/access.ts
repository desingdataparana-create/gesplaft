import {env} from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import {getDb} from '../db';
import {appUsers} from '../db/schema';
import {can,type Module} from '../src/access';
const OWNER_EMAIL=(env as unknown as Record<string,string>).FIRST_SUPERADMIN_EMAIL?.trim().toLowerCase();
export async function access(req:Request){
 const userId=req.headers.get('oai-authenticated-user-id'),email=req.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
 if(!userId||!email)throw new Error('UNAUTHORIZED');
 const db=getDb();
 if(email===OWNER_EMAIL){await db.insert(appUsers).values({id:crypto.randomUUID(),ownerId:userId,email,name:'Superadministrador',role:'SUPERADMIN',active:true,grants:{},updatedAt:new Date().toISOString()}).onConflictDoNothing();}
 const [user]=await db.select().from(appUsers).where(eq(appUsers.email,email));
 if(!user||!user.active)throw new Error('FORBIDDEN');
 return user;
}
export function requireModule(user:Awaited<ReturnType<typeof access>>,module:Module,write=false){if(!can(user,module,write))throw new Error('FORBIDDEN');}
