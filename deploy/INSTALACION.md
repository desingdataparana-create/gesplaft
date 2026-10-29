# Preparación del despliegue de GesPLAFT

Este procedimiento está preparado; no fue ejecutado en el VPS. Primero se instala y valida en pruebas. El pase posterior a `https://sigxia.com.ar/gesplaft/` debe aprobarse sobre un commit concreto, con respaldo y reversión.

## Separación propuesta — confirmar valores libres

| Entorno | Carpeta | PM2 | Puerto | Base | Origen |
| --- | --- | --- | --- | --- | --- |
| Pruebas | `/var/www/gesplaft-test` | `gesplaft-test` | 8094 | `gesplaft_test` | HTTPS de pruebas por confirmar |
| Demo | `/var/www/gesplaft-demo` | `gesplaft-demo` | 8095 | `gesplaft_demo` | `https://sigxia.com.ar` |

Los nombres y puertos son una propuesta; no se comprobó todavía su disponibilidad en el servidor. Nunca compartir la base ni los secretos de pruebas y demo.

## Construcción

1. Confirmar ruta, remoto, SHA y árbol limpio. Clonar el repositorio en pruebas y fijar el commit revisado.
2. Usar Node >=22.13 y `corepack pnpm install --frozen-lockfile`.
3. Ejecutar `corepack pnpm run check`, `corepack pnpm run test:unit`, `corepack pnpm run vps:build` y `corepack pnpm run test:vps`.
4. Crear una base PostgreSQL vacía y un rol exclusivo con contraseña propia. Mantener la conexión en loopback o con TLS validado; no publicar el puerto de PostgreSQL.
5. Copiar `.env.example` fuera del repositorio a `/etc/gesplaft/test.env` con permisos 600, completar DATABASE_URL y el origen HTTPS real. No pegar el contenido de ese archivo en chats ni logs.
6. Aplicar el esquema inicial solo a la base nueva de pruebas:

```sh
node --env-file=/etc/gesplaft/test.env portable/migrate.mjs
```

El esquema es para una instalación inicial. No migra datos desde Sites ni sustituye un plan de migración de una base existente. Las actualizaciones futuras del esquema requerirán migraciones versionadas.

## Primer superadministrador

La clave se ingresa en la terminal, oculta, y se transmite por stdin. No queda como argumento del proceso ni en el repositorio:

```bash
read -r -s -p 'Contraseña inicial (mínimo 12 caracteres): ' gesplaft_password
printf '\n'
printf '%s' "$gesplaft_password" | node --env-file=/etc/gesplaft/test.env portable/admin.mjs correo-del-administrador@example.com
unset gesplaft_password
```

No hay una clave predeterminada. Si ya existe un superadministrador, registrar los demás usuarios desde la interfaz. El comando también permite restablecer la clave de una cuenta existente y revoca sus sesiones.

## PM2 y Nginx

Revisar `ecosystem.config.cjs`; iniciar únicamente `gesplaft-test` con cwd y archivo de entorno confirmados. Verificar primero `curl -fsS --max-time 10 http://127.0.0.1:8094/gesplaft/api/health`: debe responder `ok:true` y `database:postgresql`.

`nginx-location.conf` conserva la subruta al pasar la solicitud al servidor. Agregar sus dos bloques al servidor HTTPS elegido; no sustituir la web principal. Confirmar Host, certificado y origen. `PUBLIC_ORIGIN` contiene solo esquema y dominio, nunca `/gesplaft` ni barra final.

Respaldar la configuración y ejecutar `nginx -t`. Un reload de Nginx compartido requiere autorización porque afecta el VPS productivo. No realizarlo automáticamente.

## Validación y pase

Verificar HTTPS y salud a través de Nginx, login, alta de sujeto, dos operaciones de la misma persona, umbrales, revisión, exportación, permisos y persistencia después de reiniciar solo el proceso de pruebas. Revisar logs acotados, reinicios y uso de recursos.

Antes de la demo: fijar el SHA probado, separar variables/base/proceso/puerto, respaldar archivos y base con `pg_dump`, y probar que el respaldo es legible en una base aislada. Preparar el diff de Nginx para 8095 y obtener aprobación del pase.

La reversión debe conservar el commit, artefactos y configuración previos. Volver al código anterior no revierte el esquema; no restaurar una base perdiendo operaciones nuevas sin autorización específica. Para una instalación nueva, deshabilitar únicamente la nueva ruta/proceso si falla.
