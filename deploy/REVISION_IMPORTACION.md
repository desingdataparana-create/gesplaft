# Revisión de operación, sujeto e importación — 4 de noviembre de 2026

## Flujo y reglas

1. El sujeto se identifica por documento y conserva su propia ficha y parámetros personales.
2. El tipo de operación pertenece a un catálogo configurable. Cada tipo define su alcance de identificación y, opcionalmente, un producto/juego predeterminado.
3. La operación selecciona un producto/juego, un canal y una zona. No se admiten varias alternativas contradictorias dentro de la misma categoría.
4. El piso UIF se compara con el importe por operación. Igualdad también alcanza el piso. Esto se informa separadamente del puntaje de riesgo; un importe elevado no genera por sí solo riesgo alto, sospecha ni ROS.
5. El riesgo usa las cuatro ponderaciones configuradas y los parámetros activos de la ficha y de la operación. PEP, vínculos PEP y coincidencia en listas conservan un nivel mínimo alto; un parámetro inactivo no puede forzar esa clasificación.
6. Se conservan los parámetros, ponderaciones, piso, nombre del tipo y versión de política utilizados al guardar. Los cambios posteriores no recalculan expedientes históricos.

## Hallazgos y correcciones

- La carga manual y una importación podrían divergir si tuvieran calculadores separados: ambas usan `buildEvaluationRecord` y las mismas validaciones.
- Se podían marcar varios productos/canales/geografías incompatibles: ahora hay un selector por condición y validación también en el servidor.
- El tipo de operación estaba fijado en un enum de código: ahora se puede agregar, renombrar o retirar desde Ajustes. La retirada es lógica y no elimina referencias históricas. Se controla la versión del catálogo para rechazar sobrescrituras concurrentes.
- Un cambio en los datos de organización podía borrar la configuración de tipos: se preserva el catálogo al guardar la organización.
- Una ficha podía marcar el parámetro PEP y negar esa condición: se valida su coherencia.
- Las fechas de los filtros y exportaciones usaban cortes UTC y podían cambiar de día según el navegador: carga manual, archivos, filtros, fichas y reportes usan hora argentina.
- Un sujeto que aparece en varias filas no debe crearse repetidamente. Los documentos se normalizan; las fichas existentes se reutilizan sin sobrescribirlas. Si se informan datos distintos, se muestra un error para revisar la ficha.

## Importación

Ajustes admite `.xlsx` y CSV UTF-8. Una fila por operación, hasta 200 filas y 5 MB. La referencia externa es obligatoria y evita duplicados entre archivos y reintentos. Un identificador ya usado con datos diferentes produce error.

Primero se genera una vista previa sin escrituras. Se muestran importe, sujeto, riesgo y errores por fila. La confirmación exige revisar el lote, permisos de escritura en Ajustes/Sujetos/Expedientes y una huella vigente de datos y configuración. Si existe cualquier error no se importa ninguna fila. PostgreSQL ejecuta el lote en una transacción; los reintentos simultáneos no duplican operaciones.

La plantilla Excel contiene Operaciones, Guia y Codigos. Conserva los documentos como texto, fechas/importe tipados y listas de validación. Se verifica leyéndola con la misma familia de lector usada por la aplicación. La plantilla CSV y los catálogos vigentes se generan desde la configuración del usuario.

Los archivos no pueden cambiar roles, puntajes calculados, decisiones de sospecha, ROS o fichas existentes. No se ejecutan fórmulas ni macros. El archivo original se procesa en el navegador; al servidor se envían las filas normalizadas para volver a validarlas.

## Alcance normativo y limitaciones

Fuente oficial revisada: Resolución UIF 194/2023, texto actualizado, art. 2.b, con modificación por Resolución 243/2023:
https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-194-2023-390692/actualizacion

El alcance presencial de cobro de premios, conversión de valores y canje es desde 15 SMVM; el juego en línea tiene identificación desde el inicio. No se actualizó automáticamente el importe en pesos configurado por la organización. No hay descarga automática del SMVM ni cálculo retroactivo del piso: antes de usar operaciones de otro período debe revisarse su vigencia. Esta revisión funcional no certifica cumplimiento normativo integral.

Operaciones por debajo del piso pueden registrarse para seguimiento, con su alcance identificado. No se presume ausencia de riesgo por quedar debajo del piso.

Los ejemplos y pruebas contienen exclusivamente datos ficticios. Esta implementación no importa el listado real de ganadores ni lo publica en el repositorio.

## Evidencia

- TypeScript y compilación del runtime VPS.
- Pruebas unitarias: límites del piso, criterio inactivo, PEP, zona horaria, CSV entrecomillado y validación de importes/fechas.
- Archivo Excel real: documento con ceros iniciales, importe numérico, fecha en hora argentina y equivalencia con CSV.
- API/PostgreSQL: catálogos editables, conflictos de versión, vista previa sin escrituras, lote inválido sin escrituras parciales, reintentos concurrentes, referencias duplicadas, identidad y permisos.
- Una operación equivalente cargada manualmente e importada produce el mismo puntaje, nivel, requisitos y versión de política.
- Navegador con base aislada: cargar XLSX, revisar/confirmar, verificar sujeto y expediente, crear tipo personalizado y usarlo con producto predeterminado en carga manual.

## Instalación y reversión

No requiere cambios SQL, dependencia adicional del servidor ni recarga de Nginx. El lector de Excel está compilado en un módulo del navegador. El catálogo se almacena dentro de los ajustes de organización existentes.

Distribución separada para el VPS, con SHA fuente y manifiesto de hashes. El instalador admite únicamente la revisión de pruebas previamente confirmada, verifica paquetes y esquema sin cambios, respalda código/configuración/PostgreSQL y reinicia solo `gesplaft-test`. Ante un fallo de salud vuelve al código anterior; no restaura datos automáticamente. Las salidas de instalación y la validación del usuario en el dominio siguen pendientes hasta realizarlas.
