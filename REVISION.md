# Revisión técnica — 29 de octubre de 2026

## Correcciones

- Los cálculos y avisos utilizan los umbrales configurados; incluyen acumulados mensuales/anuales del sujeto y períodos de Argentina.
- Búsqueda por nombre sin distinguir tildes ni mayúsculas; documento normalizado y protección de duplicados.
- Edición de fichas con comprobación de versión y actualización condicional; una operación puede exigir reseleccionar una ficha que cambió.
- Reintentos con identificador estable por operación: una misma carga no crea expedientes duplicados. Reusar el identificador con otro contenido se rechaza.
- Copia de criterios, pesos y umbrales en nuevas evaluaciones; ficha e informe usan los criterios históricos cuando existen.
- Fechas futuras, configuración con identificadores duplicados y JSON inválido se rechazan.
- Exportaciones filtradas por fecha de operación y canal; celdas CSV protegidas ante fórmulas; encabezados de expedientes toman la organización configurada.
- Login de VPS con contraseña, scrypt, sesión HttpOnly, control de origen y límites de intentos. Nunca se aceptan identidades enviadas por el visitante.
- La lógica PostgreSQL y las rutas comparten código con la vista previa. Las escrituras del VPS se ejecutan en transacción y se serializan mediante bloqueo asesor para conservar acumulados coherentes.
- Preparación de subruta, salud, PM2 y bloque Nginx aislado.

## Dependencias

Se actualizaron Next, Zod y dependencias transitivas con avisos conocidos. La auditoría `pnpm audit --prod` del lockfile revisado devolvió cero avisos; ese resultado es una comprobación puntual, no una garantía futura.

## Comprobaciones reproducibles

| Comprobación | Alcance |
| --- | --- |
| `npm run check` | TypeScript |
| `npm run test:unit` | límites, configuración, acumulados, zona horaria, filtros, CSV y permisos |
| `npm run vps:build` | interfaz en `/gesplaft/` y servidor Node |
| `npm run test:vps` | motor PostgreSQL embebido, login y sesiones, permisos, snapshots, reintentos, versiones, CSRF, subruta y activos |
| `npm run test:data` | Worker local: sujetos, expedientes, análisis, ROS, organización y cuatro roles |

## Límites y pendientes del pase

La revisión no certifica ausencia total de vulnerabilidades ni validez normativa de los parámetros de ejemplo. La metodología debe validarla el área responsable. La matriz visual y sus mitigadores tienen finalidad ilustrativa.

La pantalla de login se inspeccionó visualmente. La validación completa de pantallas internas en el navegador queda pendiente del recorrido manual; los recorridos de datos y acceso se comprobaron por pruebas del servidor.

Falta validar PostgreSQL externo, respaldos/restauración, TLS, PM2, Nginx y todos los recorridos en el VPS. No se cambiaron servicios ni bases de SIGXIA. La vista previa Sites conserva D1 y login de ChatGPT; la versión VPS usa PostgreSQL y login propio. No se migran automáticamente sus registros.

El listado y la búsqueda se realizan sobre el conjunto del usuario/organización; el paginado actual es visual. Para volúmenes productivos se requieren consultas paginadas e índices normalizados adicionales. Los expedientes anteriores a las copias históricas no permiten recuperar una versión de metodología inexistente.

Los cambios de configuración y de permisos siguen la última escritura válida; los expedientes y fichas disponen de controles de versión en sus flujos críticos. La serialización de PostgreSQL se valida contra PostgreSQL externo en pruebas; el motor embebido no ejercita el bloqueo asesor de red.

## Eliminación de parámetros

Solo el superadministrador puede eliminar criterios. Se registra una baja lógica con fecha y usuario, sin modificar expedientes históricos. Guardar una configuración anterior no restaura un criterio eliminado. También se impide eludir el permiso retirándolo de la lista enviada a `saveSettings`.
