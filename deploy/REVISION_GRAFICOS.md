# Íconos y gráficos — 5 de noviembre de 2026

Dashboard con íconos por indicador; distribución de riesgo en anillo y leyenda con cantidad/porcentaje; estados de expedientes con barra apilada; actividad mensual de los últimos seis meses con selector cantidad/importe ARS y tabla de cifras. La actividad usa la fecha de operación en hora argentina y solo aparece con acceso a Expedientes. Los históricos sin evaluación permanecen separados del riesgo calculado. Incluye estados vacíos, títulos accesibles, contraste de modo oscuro y distribución adaptable a celular.

Íconos en encabezados de Sujetos, Expedientes, Parámetros y Ajustes, y en Dashboard y sus indicadores. No se incorporan dependencias ni se cambia el cálculo de riesgo, los roles o la base de datos.

Verificación: TypeScript, lint, compilación VPS, pruebas unitarias de agregación mensual y cambio de año, renderizado con/sin datos y permisos. La comprobación visual interactiva en el dominio queda pendiente de la instalación; no se afirma una prueba de navegador local.

Instalación: el instalador acepta la revisión de pruebas 485f1f3ed4a3fa193203d9f1f7196403d55e6e26, comprueba árbol limpio, hashes y dependencias, respalda y reinicia solo gesplaft-test. Incluye reversión ante fallo de salud. No carga ni elimina datos y no modifica Nginx.
