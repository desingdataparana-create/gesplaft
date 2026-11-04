#!/usr/bin/env bash
# Instalar exclusivamente la distribución compilada en el entorno de pruebas conocido.
set -Eeuo pipefail
umask 077
cd /var/www/gesplaft-test-runtime
[ "$(pwd -P)" = /var/www/gesplaft-test-runtime ]
objetivo=${1:?Indicá el SHA completo de la distribución compilada}
[[ "$objetivo" =~ ^[0-9a-f]{40}$ ]]
anterior=$(git rev-parse HEAD)
if [ -n "$(git status --porcelain)" ]; then
  echo 'DETENIDO: hay cambios locales. Conservarlos y revisar antes de instalar.'
  exit 1
fi
if [ "$anterior" = "$objetivo" ]; then
  echo "La revisión ya está instalada: $objetivo"
  exit 0
fi
if [ "$anterior" != 83024e1c77c0434d9082a812a3f2ec7bda5f7f3e ]; then
  echo "DETENIDO: revisión actual distinta de la conocida: $anterior"
  exit 1
fi
git cat-file -e "$objetivo^{commit}"
git diff --exit-code "$anterior" "$objetivo" -- package.json package-lock.json portable/schema.sql
node - "$objetivo" <<'JS'
const {execFileSync}=require('node:child_process');
const {createHash}=require('node:crypto');
const revision=process.argv[2];
const read=p=>execFileSync('git',['show',revision+':'+p]);
const manifest=JSON.parse(read('BUILD.json'));
for(const [file,expected] of Object.entries(manifest.files)) {
  if(createHash('sha256').update(read(file)).digest('hex')!==expected)throw Error('Archivo no verificado: '+file);
}
console.log('Distribución compilada verificada antes de instalar.');
JS
pm2 jlist | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const p=JSON.parse(s).find(p=>p.name==="gesplaft-test");if(!p||p.pm2_env.pm_cwd!=="/var/www/gesplaft-test-runtime")throw Error("El proceso PM2 no corresponde al entorno esperado.");});'
for programa in pg_dump pg_restore curl; do command -v "$programa" >/dev/null; done
respaldo=$(mktemp -d /root/gesplaft-carga-respaldo-XXXXXX)
printf '%s\n' "$anterior" > "$respaldo/SHA_ANTERIOR"
printf '%s\n' "$objetivo" > "$respaldo/SHA_CANDIDATO"
cp -a dist-vps "$respaldo/dist-vps"
cp -a /etc/gesplaft/test.env "$respaldo/test.env"
echo "RESPALDO: $respaldo"
node --env-file=/etc/gesplaft/test.env --input-type=module - "$respaldo/postgresql.dump" <<'JS'
import {spawnSync} from 'node:child_process';
import {openSync,closeSync} from 'node:fs';
const u=new URL(process.env.DATABASE_URL);
const database=decodeURIComponent(u.pathname.slice(1));
if(database!=='gesplaft_test'||!['127.0.0.1','localhost','[::1]'].includes(u.hostname))throw Error('La base no corresponde a pruebas locales.');
const fd=openSync(process.argv[2],'wx',0o600);
try {
  const p=spawnSync('pg_dump',['--format=custom','--no-owner','--no-acl'],{env:{...process.env,PGHOST:u.hostname,PGPORT:u.port||'5432',PGDATABASE:database,PGUSER:decodeURIComponent(u.username),PGPASSWORD:decodeURIComponent(u.password)},stdio:['ignore',fd,'pipe']});
  if(p.error||p.status!==0)throw Error('Falló pg_dump; no se modificó la instalación.');
} finally {closeSync(fd);}
JS
pg_restore --list "$respaldo/postgresql.dump" > "$respaldo/postgresql-contenido.txt"
test -s "$respaldo/postgresql-contenido.txt"
validar_salud() {
  local url=$1 archivo=$2
  for intento in {1..10}; do
    if curl --noproxy '*' -fsS --max-time 10 "$url" -o "$archivo" &&
      node - "$archivo" <<'JS'
const d=JSON.parse(require('node:fs').readFileSync(process.argv[2],'utf8'));
if(d.ok!==true||d.app!=='gesplaft'||d.database!=='postgresql')process.exit(1);
console.log(JSON.stringify(d));
JS
    then return 0; fi
    sleep 2
  done
  return 1
}
validar_salud http://127.0.0.1:8094/gesplaft/api/health "$respaldo/salud-anterior.json"
cambiado=0
revertir() {
  codigo=$?
  trap - ERR
  set +e
  echo 'La actualización se detuvo.'
  if [ "$cambiado" = 1 ]; then
    if git checkout --detach "$anterior" && npm run verify && pm2 restart gesplaft-test --update-env &&
      validar_salud http://127.0.0.1:8094/gesplaft/api/health "$respaldo/salud-reversion.json"; then
      echo 'Revisión anterior recuperada y salud local comprobada.'
    else
      echo 'ATENCIÓN: recuperación incompleta; revisar el proceso y su salud.'
    fi
  fi
  echo "RESPALDO: $respaldo"
  exit "$codigo"
}
trap revertir ERR
cambiado=1
git checkout --detach "$objetivo"
npm run verify
pm2 restart gesplaft-test --update-env
validar_salud http://127.0.0.1:8094/gesplaft/api/health "$respaldo/salud-local.json"
validar_salud https://gesplaft.sigxia.com.ar/gesplaft/api/health "$respaldo/salud-https.json"
curl --noproxy '*' -fsSL --max-redirs 5 --max-time 20 https://gesplaft.sigxia.com.ar/gesplaft/ -o "$respaldo/login.html"
grep -q 'name="password"' "$respaldo/login.html"
trap - ERR
echo "INSTALADO EN PRUEBAS: $objetivo"
echo "RESPALDO: $respaldo"
echo 'Salud local, PostgreSQL, HTTPS y login verificados. Falta validar el recorrido con tu usuario.'
