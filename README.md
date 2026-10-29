# GesPLAFT — distribución compilada para VPS

Rama de despliegue `deploy/vps-demo`. El código editable se conserva en `main`. Esta distribución está compilada desde el commit `95dcd0971c2f715b8119efe29c1dade34118b246`, incluida la eliminación de parámetros exclusiva para el superadministrador.

Evita instalar Vite, Next, Wrangler y las herramientas de compilación en un VPS compartido con poca memoria. El servidor mantiene Node, PostgreSQL, login propio, sesiones y permisos. No incluye datos, claves, sesiones ni base de datos de demostración.

## Preparación

Requiere Node >=22.13. Instalar en una carpeta nueva y fijar el commit de esta rama:

```sh
NODE_OPTIONS=--max-old-space-size=256 npm ci --omit=dev --omit=optional --ignore-scripts --no-audit --no-fund
npm run verify
```

`npm run verify` comprueba los hashes de los artefactos y los módulos de ejecución sin abrir servicios ni acceder a la base. Los archivos de entorno se guardan fuera del repositorio.

## Base, usuario y servicio

Confirmar PostgreSQL, carpeta, puerto 8094 y separación de entornos. Crear una base nueva `gesplaft_test` y un usuario exclusivo. Copiar `.env.example` a `/etc/gesplaft/test.env`, con permisos 600, y completar conexión y origen HTTPS.

Aplicar el esquema solo a la base nueva:

```sh
node --env-file=/etc/gesplaft/test.env portable/migrate.mjs
```

Crear el primer superadministrador ingresando una clave propia por stdin, sin argumentos ni archivos con la clave:

```bash
read -r -s -p 'Contraseña inicial: ' gesplaft_password
printf '\n'
printf '%s' "$gesplaft_password" | node --env-file=/etc/gesplaft/test.env portable/admin.mjs correo-del-administrador@example.com
unset gesplaft_password
```

Revisar `deploy/ecosystem.config.cjs`: propone `gesplaft-test`, carpeta `/var/www/gesplaft-test-runtime` y entorno externo. Verificar salud local en `http://127.0.0.1:8094/gesplaft/api/health`. Confirmar todos los recorridos en pruebas antes de habilitar el proxy de SIGXIA. No se modifican automáticamente PM2, Nginx, PostgreSQL ni las demás aplicaciones.

Para `sigxia.com.ar/gesplaft/`, preparar un pase separado con base/proceso/puerto de demo, HTTPS, respaldo y reversión. El reload de Nginx compartido necesita aprobación del pase concreto.

## Validación de esta distribución

La batería de integración está en `scripts/test-vps.mjs`. En un entorno aislado con memoria suficiente, `npm ci` instala la dependencia de desarrollo PGlite y `npm test` comprueba login, sesiones, permisos, acumulados, reintentos, historial, eliminación de parámetros y subruta. La instalación de producción con `--omit=dev --omit=optional` no descarga ese motor de pruebas.

Los parámetros iniciales son de demostración y deben validarse metodológicamente. Esta distribución no migra automáticamente registros de la vista privada Sites. El PostgreSQL del VPS, los respaldos y el proxy requieren su propia validación.
