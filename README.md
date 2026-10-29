# GesPLAFT

Demo de gestión de sujetos, operaciones y evaluaciones PLA/FT. Incluye dashboard, fichas reutilizables, criterios configurables, análisis documentado y cuatro roles con permisos por módulo.

## Dos entornos

- **Sites:** vista previa privada existente, con D1 y autenticación de ChatGPT. El código de `app/` y `db/` conserva esa integración.
- **VPS:** `portable/` compila la misma interfaz y lógica en un servidor Node con PostgreSQL y login propio. No confía en cabeceras de identidad enviadas por el visitante. La ruta es `/gesplaft/`.

El código no contiene bases de datos, sesiones, contraseñas ni archivos de configuración de un servidor real. Los sujetos incluidos como ejemplos son sintéticos.

## Preparación local

Requiere Node >=22.13 y pnpm 11.25.0. Usar el lockfile incluido:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm run check
corepack pnpm run test:unit
corepack pnpm run vps:build
corepack pnpm run test:vps
```

`test:vps` inicia un motor PostgreSQL embebido desechable. Comprueba consultas y recorridos del servidor, pero no acredita la configuración, TLS ni recuperación de un PostgreSQL remoto.

La construcción de Sites usa sus propios helpers. Luego `npm run test:data` prueba persistencia, permisos y análisis con un Worker local y datos de QA.

## Instalar en VPS

Seguir [deploy/INSTALACION.md](deploy/INSTALACION.md). El repositorio solo prepara el despliegue: subir código no modifica `sigxia.com.ar` ni configura PM2/Nginx automáticamente.

## Roles

El superadministrador tiene acceso completo y administra usuarios. Administrador, Analista/Auditor y Operador/Carga tienen únicamente los módulos asignados, con consulta o consulta y edición. El rol por sí solo no amplía privilegios. Deshabilitar la cuenta bloquea su acceso en la siguiente solicitud.

En VPS, crear un usuario y luego **Asignar contraseña** desde Usuarios. Las contraseñas requieren al menos 12 caracteres y se guardan derivadas con scrypt y sal aleatoria. Las sesiones duran 8 horas y se guardan mediante el hash del token.

## Riesgo e historial

Los importes se leen de la configuración. Los acumulados se calculan por sujeto y período en la zona horaria argentina. Cada nueva evaluación conserva sus criterios, ponderaciones y umbrales. El puntaje no justifica una operación ni presenta un ROS automáticamente. El análisis exige fundamento y conserva versiones anteriores.

Los parámetros iniciales y referencias son contenido de demostración pendiente de validación metodológica por la organización. Los mitigadores de la matriz visual no reducen automáticamente el puntaje de una operación. Los expedientes antiguos sin copia histórica no permiten reconstruir con certeza su configuración original.

Consultar [REVISION.md](REVISION.md) para conocer pruebas y límites de la revisión.
