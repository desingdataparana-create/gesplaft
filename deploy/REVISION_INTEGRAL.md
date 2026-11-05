# Revisión integral — 5 de noviembre de 2026

## Correcciones

- Evaluación del histórico en el mismo expediente: vincula el sujeto cuando falta documento, usa los parámetros vigentes, conserva fecha, monto, sala, ID, número, fecha de importación, fuente original y análisis previo. Control de versión y escritura por módulo; no duplica operaciones. Los expedientes ya concluidos conservan su evaluación.
- Corrección del documento en la ficha mediante ID estable, con detección de duplicados y conflictos; los expedientes anteriores retienen su identificación histórica.
- No se permite cerrar como justificado un histórico pendiente de evaluación. El seguimiento no reabre un cierre ni retira silenciosamente una sospecha. Los atajos de estado no reemplazan análisis documentados. Fechas de ROS válidas, no futuras ni anteriores a la operación, en hora argentina.
- Requisitos pendientes se muestran como pendientes en ficha y exportaciones, no como ausencia de requisito. XML conserva datos del archivo original. Dashboard separa históricos sin evaluar de evaluaciones completas.
- Períodos de reportes en hora argentina, incluso junto al cambio de día, mes y año; siete y treinta días incluyen exactamente esos días.
- Matriz alineada al cálculo real: cuatro ponderaciones editables con suma 100%, fórmula y reglas de nivel explícitas. Retirados el cuadrante ilustrativo ajeno al cálculo y el control de mitigación sin efecto. Se conserva el metadato histórico; no se cambia la política de puntaje ni el piso configurado.
- Catálogo rechaza nombres ambiguos; configuración rechaza códigos vacíos/duplicados sin distinguir mayúsculas. Ediciones desde formularios desactualizados de configuración/organización se rechazan cuando incluyen la versión leída.
- Modo consulta mantiene navegación y filtros activos, con controles de escritura deshabilitados y permisos verificados por API.
- Inicialización de formularios al abrirlos, cancelación de búsquedas desactualizadas, preferencias de tema mediante suscripción y revisión de paginación.
- Servidor decodifica UTF-8 después de reunir los fragmentos de solicitud, valida entradas de contraseñas y usa el último salto enviado por el proxy local para limitar intentos.

## Validación

TypeScript; lint sin errores (persisten advertencias de mantenimiento en código anterior); compilación VPS; pruebas unitarias; API de sesiones, roles, aislamiento y permisos; importación completa y por archivos XLSX/CSV; evaluación manual/importada; históricos, reintentos, conflictos y CLI; regresiones específicas de revisión integral; renderizado de formularios y controles de consulta.

La interacción visual en navegador no pudo ejecutarse: el Chromium local no puede abrir sus sockets en este entorno y el navegador remoto no alcanza el servidor local. Requiere validación posterior en el dominio, con el usuario. No se afirma validación visual remota ni ausencia absoluta de errores.

## Instalación y límites

Distribución compilada para el entorno de pruebas: /var/www/gesplaft-test-runtime; proceso gesplaft-test; puerto local 8094; base local gesplaft_test; configuración /etc/gesplaft/test.env; dominio gesplaft.sigxia.com.ar/gesplaft/.

El instalador acepta como anterior ec48c330fec839e889d6c220eefe75630c984f8d, requiere árbol limpio, verifica hashes y dependencias sin cambios, respalda configuración, artefactos y PostgreSQL y verifica el listado del respaldo. Reinicia únicamente gesplaft-test y comprueba salud local, PostgreSQL, HTTPS y login. Ante fallo restaura el código anterior. No ejecuta migración, importación, limpieza de datos ni cambios de Nginx. No incluye datos personales ni credenciales.

Recorrido posterior: abrir histórico, completar ficha y factores, evaluar sin duplicar; revisar origen; analizar y seguir expediente; comprobar consulta con permisos limitados; descargar reportes y verificar sus períodos. La vigencia jurídica del piso y de los parámetros debe revisarse por la organización; no se actualizan automáticamente.
