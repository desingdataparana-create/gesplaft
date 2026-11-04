# Eliminación e importación histórica — 4 de noviembre de 2026

- Solo SUPERADMIN puede eliminar sujetos u operaciones. Se verifica el rol en servidor, el propietario y la versión de los datos, además de confirmación en la interfaz.
- Una operación se elimina con su análisis; su sujeto se conserva. Un sujeto con operaciones vinculadas no se puede eliminar. La eliminación es definitiva y el instalador respalda PostgreSQL antes de actualizar.
- El listado histórico de doce columnas se importa conservando los campos originales. No se infieren actividad formal, producto/juego, zona, puntaje ni debida diligencia. El riesgo de la fuente se muestra explícitamente como histórico, pendiente de evaluación; no se aplica el piso actual retroactivamente.
- Una fila sin documento conserva su operación pendiente, sin crear una identidad ficticia. La operación sigue disponible en expedientes, con sus datos de origen.
- La referencia determinista previene duplicados; una operación existente con datos diferentes se rechaza. El lote se aplica en una transacción y exige vista previa vigente.
- Limpieza opcional exclusiva del superadministrador: elimina solo registros identificados por nombre/documento y marca de demostración. No borra sujetos vinculados a operaciones reales ni cambia usuarios, parámetros u organización.
- El importador local restringe la escritura a gesplaft_test local, identifica un único superadministrador activo, exige huella SHA-256 y respalda PostgreSQL con verificación antes de cargar. La vista previa no escribe.
- Datos personales fuera del repositorio público. Las pruebas usan exclusivamente personas ficticias.

## Validación
TypeScript, compilación VPS, pruebas de permisos y versiones, protección de sujetos vinculados, limpieza selectiva, importación histórica sin puntaje inventado, fila sin documento, reintentos y CLI con huella. Las comprobaciones remotas se completan al ejecutar el instalador y la carga autorizada.
