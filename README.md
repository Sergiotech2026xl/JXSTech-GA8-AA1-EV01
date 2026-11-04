# JXSTech — Servicios web de la tienda

Aprendiz: Sergio Murillo. Evidencia: GA7-220501096-AA5-EV03.
Actividad: Diseño y desarrollo de servicios web – proyecto. Versión: 2.0.0.

## Propósito

API para la tienda de relojes y audífonos inteligentes JXSTech: acceso de operadores, clientes, catálogo de productos, entradas y salidas de inventario, ventas y anulaciones. Se amplía EV01 conservando JavaScript, Node.js, Express, MongoDB, bcryptjs y dotenv. Los clientes conservan los campos del módulo trabajado en evidencias anteriores.

## Instalación y ejecución

Se requiere Node.js 20.19 o posterior, npm y MongoDB Atlas o un replica set. Se verificó con Node.js 24.21.0. Un MongoDB standalone no permite las transacciones de esta aplicación.

Desde la carpeta del proyecto:

```powershell
cd backend
npm.cmd ci
Copy-Item .env.example .env
```

Edita `.env` con tu conexión privada. Usa DB_NAME=jxstech_ev03 y PORT=3001 para mantener separados los datos y el puerto de EV01. El usuario de Atlas necesita permisos sobre esa base y la IP debe estar autorizada. No compartas `.env`.

```powershell
npm.cmd start
```

Consulta http://localhost:3001/api/salud para comprobar la conexión. La página http://localhost:3001 demuestra registro y login. Los demás servicios se utilizan con Postman. El frontend React anterior no está integrado en esta entrega.

## Documentación

- [Guía paso a paso](docs/GUIA_DE_EJECUCION.md).
- [Manual de diseño y servicios](docs/SERVICIOS.md).
- [Manual para leer o imprimir en el navegador](docs/SERVICIOS.html).
- [Documentación en PDF](docs/Documentacion_JXSTech_EV03.pdf).
- [Especificación OpenAPI 3.0.3](docs/openapi.json).
- [Colección de Postman con 36 solicitudes](postman/JXSTech_EV03.postman_collection.json).

Hay 24 operaciones: disponibilidad; registro, login, sesión y logout; creación, listado, consulta, actualización, baja lógica y reactivación de clientes y productos; consulta de existencias e historial y registro de movimientos; listado, consulta, registro y anulación de ventas.

La base de la API es http://localhost:3001/api. Los módulos comerciales requieren Authorization: Bearer <token>. El login entrega un token con duración de 8 horas; el servidor guarda su hash. El cierre de sesión invalida ese token.

## Reglas de negocio

- Categorías reloj y audifonos; SKU único. Stock inicial cero.
- Toda entrada o salida deja un movimiento con motivo, operador y saldos.
- Precios y totales en pesos colombianos enteros. El servidor calcula la venta con los precios del catálogo.
- Una venta requiere cliente y productos activos, stock suficiente y referencia única.
- Venta, detalles y movimientos se confirman en una transacción. Si falla una línea, se revierten todos los cambios.
- La anulación conserva la venta y restituye las existencias una sola vez.
- Las bajas son lógicas. Un producto requiere stock cero para desactivarse y puede reactivarse.
- Las ventas conservan los datos y precios históricos.

Esta versión académica local asigna los mismos permisos a todos los operadores registrados y escucha en 127.0.0.1. Registra el medio de pago como dato; no integra pasarelas de pago, impuestos, envíos ni facturación electrónica.

## Pruebas

Desde backend, con `.env` configurado:

```powershell
npm.cmd test
```

La suite ejecuta solicitudes HTTP contra MongoDB real. Genera una base temporal con prefijo jxstech_ev03_test_ y elimina únicamente esa base al terminar. No usa DB_NAME como destino de pruebas ni borra EV01 o EV03. El usuario de Atlas debe poder crear y eliminar esas bases temporales.

Se aprobaron 38 casos de integración. La colección también se ejecutó con Newman: 36 solicitudes y 82 comprobaciones aprobadas, sin fallos. Consulta el [informe de verificación](docs/VERIFICACION.md), [resultados de integración](docs/resultados-pruebas.json) y [resultados de Postman/Newman](docs/resultados-postman.json). La colección permite repetir la demostración y genera datos ficticios nuevos. Sigue la guía antes de ejecutarla.

El aprendiz también ejecutó la colección completa en Postman: 82 comprobaciones aprobadas y 0 errores. La captura del resumen está en `Capturas/Resumen_pruebas_EV03.jpeg`.

## Estructura

- backend/src: módulos HTTP, validaciones, sesiones, transacciones y acceso a datos.
- backend/test: pruebas de integración.
- backend/server.js e iniciar.js: inicio y cierre del servidor.
- backend/package.json y package-lock.json: dependencias y versiones reproducibles.
- backend/.env.example: plantilla sin credenciales reales.
- frontend/index.html: demostración de registro y login.
- docs: diseño, servicios, contratos, guía e informes.
- postman: colección de solicitudes.
- ENLACE_REPOSITORIO.txt: enlace de la versión entregada.

## Versionamiento y entrega

Se conserva el historial de EV01. La ampliación está en la rama aa5-ev03-jxstech:

[Código correspondiente a EV03 en GitHub](https://github.com/Sergiotech2026xl/GA7-AA5-EV01/tree/aa5-ev03-jxstech).

La rama debe estar publicada y el enlace debe comprobarse antes de enviar la evidencia. Para descargar esa versión con su historial:

```powershell
git clone --branch aa5-ev03-jxstech https://github.com/Sergiotech2026xl/GA7-AA5-EV01.git JXSTech-EV03
```

El ZIP se denomina SERGIO_MURILLO_AA5_EV03.zip. Incluye código, documentación y enlace del repositorio. Excluye `.env`, node_modules y el directorio interno .git; el historial se conserva en GitHub. La preparación del ZIP no confirma el envío en Zajuna.
