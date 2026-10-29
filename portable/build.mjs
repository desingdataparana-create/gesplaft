import {build} from 'esbuild';
import {build as viteBuild} from 'vite';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
await viteBuild({configFile:resolve(root,'portable/vite.config.mjs')});
await build({entryPoints:{server:resolve(root,'portable/server.mjs'),db:resolve(root,'portable/db.ts')},outdir:resolve(root,'dist-vps/server'),outExtension:{'.js':'.mjs'},bundle:true,splitting:true,platform:'node',format:'esm',target:'node22',packages:'external',plugins:[{name:'portable-aliases',setup(b){b.onResolve({filter:/(?:schema|access|db(?:\/index)?)$/},a=>{if(!a.path.startsWith('.'))return;const f=resolve(a.resolveDir,a.path);const paths={[resolve(root,'db/schema')]:resolve(root,'portable/schema.ts'),[resolve(root,'db')]:resolve(root,'portable/db.ts'),[resolve(root,'db/index')]:resolve(root,'portable/db.ts'),[resolve(root,'app/access')]:resolve(root,'portable/access.ts')};if(paths[f])return {path:paths[f]};});}}]});
console.log('VPS: interfaz /gesplaft/ y servidor Node/PostgreSQL compilados.');
