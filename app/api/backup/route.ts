import {eq} from 'drizzle-orm';
import {getDb} from '../../../db';
import {subjects,evaluations,settings,organizationSettings,appUsers} from '../../../db/schema';
import {access} from '../../access';
export const dynamic='force-dynamic';
// Respaldo descargable: solo el superadministrador. Incluye los datos de su organización; nunca contraseñas ni sesiones.
export async function GET(req:Request){try{
 const u=await access(req);if(u.role!=='SUPERADMIN')throw Error('FORBIDDEN');
 const db=getDb(),o=u.ownerId;
 const [s,e,c,org,users]=await Promise.all([
  db.select().from(subjects).where(eq(subjects.ownerId,o)),
  db.select().from(evaluations).where(eq(evaluations.ownerId,o)),
  db.select().from(settings).where(eq(settings.ownerId,o)),
  db.select().from(organizationSettings).where(eq(organizationSettings.ownerId,o)),
  db.select().from(appUsers).where(eq(appUsers.ownerId,o)),
 ]);
 const creado=new Date().toISOString();
 const body=JSON.stringify({formato:'gesplaft-respaldo',version:1,creado,tablas:{subjects:s,evaluations:e,risk_settings:c,organization_settings:org,app_users:users}});
 return new Response(body,{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="gesplaft-respaldo-${creado.slice(0,10)}.json"`,'Cache-Control':'no-store'}});
}catch(e){const m=e instanceof Error?e.message:'';return Response.json({error:m==='UNAUTHORIZED'?'Iniciá sesión para acceder a los datos.':m==='FORBIDDEN'?'Acceso no autorizado.':'No se pudo generar el respaldo.'},{status:m==='UNAUTHORIZED'?401:m==='FORBIDDEN'?403:500})}}
