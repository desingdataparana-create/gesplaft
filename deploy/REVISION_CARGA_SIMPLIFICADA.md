# Revisión de carga y flujo de expedientes — 4 de noviembre de 2026

- Un único piso UIF por operación (`UMB-ID-01`). Se conserva el importe configurado por la organización; este cambio no actualiza ni certifica la vigencia de su valor normativo.
- Las configuraciones anteriores se adaptan al leerlas: se retiran los demás umbrales y el factor operacional para las nuevas cargas. Las cuatro ponderaciones restantes se normalizan proporcionalmente para sumar 100%. Los registros y las instantáneas históricas no se recalculan ni se eliminan.
- Nuevo expediente contiene un botón visible Nuevo sujeto, además de Editar ficha cuando hay una persona seleccionada. Crear una ficha la vincula al expediente conservando monto, fecha, sala y selección de factores. Cancelar vuelve al mismo formulario.
- Dirección, correo y teléfono son opcionales; si se informan se validan. Identificación, actividad, condición PEP y factores personales continúan disponibles.
- Perfil transaccional, comparación y origen/destino se retiran de la nueva carga. La API descarta esos campos y no genera alertas a partir de ellos. Los antecedentes existentes siguen consultables.
- El análisis conserva clasificación, inusualidad, documentación, beneficiario y fundamento de la decisión. Cierre y sospecha no dependen de campos retirados. Se conservan controles de versión, permisos, documentación para justificar una inusualidad y constancia para registrar un ROS ya presentado.
- PEP y nivel de riesgo siguen determinando diligencia reforzada; no se crea un ROS automáticamente por importe o puntaje.
- Las rutas heredadas de evaluación siguen abriendo el formulario. Los puntos de entrada muestran Nuevo expediente.

## Validación

TypeScript, pruebas unitarias, compilación Node/VPS y pruebas de integración con PostgreSQL embebido. Prueba real en navegador, con base aislada y datos ficticios: alta del sujeto desde el expediente sin datos de contacto, preservación del importe, selección de producto/canal/geografía, guardado del expediente, análisis y cierre justificado sin perfil ni origen/destino; pantalla de piso UIF único.

## Instalación

Distribución compilada en rama independiente, con manifest de hashes y referencia al commit fuente. No requiere migración SQL, compilación en el VPS ni cambio de Nginx. El instalador limita la actualización al runtime y PM2 `gesplaft-test`, verifica el estado previo, respalda código, configuración y PostgreSQL, y vuelve al SHA anterior si falla salud. No restaura datos automáticamente.

La revisión del VPS después de instalar sigue pendiente hasta recibir sus salidas y validar el ingreso y los recorridos con la cuenta del usuario.
