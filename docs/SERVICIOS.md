# Diseño y documentación de servicios web — JXSTech

Aprendiz: Sergio Murillo.

Evidencia: GA7-220501096-AA5-EV03.

Versión: 2.0.0. Fecha: 3 de noviembre de 2026.

## Alcance y decisiones de diseño

- La API administra clientes, catálogo de relojes y audífonos inteligentes, inventario y ventas presenciales de JXSTech.
- Todos los operadores registrados tienen los mismos permisos. El registro de operadores es público en esta demostración local; la aplicación escucha únicamente en 127.0.0.1. No incluye roles diferenciados ni una tienda pública desplegada.
- El medio de pago se registra como información; esta versión no integra pasarela de pago, impuestos, descuentos, envíos ni facturación electrónica.
- Cada producto tiene SKU único, categoría reloj o audifonos, precioCOP entero positivo y stock inicial cero. El stock solo cambia mediante movimientos, ventas o anulaciones.
- Los precios se expresan en pesos colombianos enteros. El servidor calcula subtotales y total; el total máximo admitido es 1.000.000.000.000 COP. No acepta precios enviados dentro de los items de una venta.
- Cada venta requiere cliente activo, de 1 a 50 productos distintos y cantidades enteras positivas. Los productos también deben estar activos y tener existencias suficientes.
- La referencia de venta es única y se normaliza a mayúsculas. Un reintento con la misma referencia devuelve 409. Ante una respuesta perdida, consulta el listado antes de usar una referencia diferente.
- Una venta y sus movimientos se confirman juntos o se revierten juntos. La anulación también es transaccional y solo restituye el stock una vez.
- Si una anulación superara el máximo de 1.000.000 de unidades, se devuelve 409 y no se aplica ningún cambio; primero debe liberarse capacidad mediante una salida justificada.
- Las bajas son lógicas: activo pasa a false. El producto solo se desactiva con stock cero. Los listados conservan activos e inactivos; PATCH /activar permite volver a operar con ellos.
- El detalle de venta conserva los nombres, documento del cliente, SKU, nombres de producto y precios del momento. Los cambios posteriores no reescriben el historial.
- Documento y correo de clientes, nombre de usuario, SKU y referencia de venta tienen índices únicos. La unicidad también incluye registros inactivos.
- Las contraseñas usan bcrypt con costo 12. Las sesiones duran 8 horas y guardan hashes SHA-256. El cierre de sesión invalida el token y la expiración se comprueba en cada solicitud.
- JSON limitado a 32 KiB; campos desconocidos, identificadores inválidos y consultas no permitidas generan 400. Los textos se recortan y no aceptan caracteres de control.
- Los listados aceptan pagina (1 a 100.000, predeterminado 1) y limite (1 a 100, predeterminado 20). Devuelven datos, total, pagina y limite. No son una instantánea transaccional entre páginas.
- Se requiere Node.js 20.19 o posterior y MongoDB Atlas o un replica set. Un MongoDB standalone no permite las transacciones utilizadas.

## Arquitectura y persistencia

Cliente HTTP (Postman o frontend) → Express → validaciones y sesión → módulos comerciales → MongoDB.

Se mantienen JavaScript, Node.js, Express, MongoDB y bcrypt de EV01. El módulo de clientes conserva los campos del trabajo anterior en Java/MySQL; esta implementación crea servicios REST en Node.js. El frontend React anterior no está integrado en esta entrega. La página HTML incluida demuestra únicamente registro y login.

| Colección | Responsabilidad | Restricciones principales |
|---|---|---|
| usuarios | Operadores y hash de contraseña | usuario único |
| sesiones | Hash de token y expiración | tokenHash único; índice TTL |
| clientes | Datos comerciales e indicador activo | documento y correo únicos |
| productos | Catálogo, precio y saldo de stock | SKU único |
| movimientos | Variación, saldo anterior/posterior y operador | referencia a producto y venta cuando aplica |
| ventas | Cliente y detalle históricos, total y estado | referencia única |

Las relaciones usan ObjectId. Cada movimiento de venta apunta a ventaId y productoId; cada venta apunta a clienteId y operadorId. No hay eliminación física de clientes, productos o ventas. Las transacciones de MongoDB mantienen los cambios entre colecciones y resuelven conflictos de escrituras simultáneas.

## Convenciones

Dirección base: `http://localhost:3001/api`.

Cuerpos: `Content-Type: application/json`.

Autenticación en módulos comerciales: `Authorization: Bearer <token>`. El token se obtiene en login y es privado.

Identificadores: cadenas hexadecimales de 24 caracteres. Fechas: ISO 8601 en UTC. Las fechas, identificadores, saldos y totales los genera el servidor. Los ejemplos usan datos ficticios.

Errores: `{"mensaje":"Descripción del error."}`.

| Código | Significado |
|---|---|
| 400 | Datos, JSON o parámetros inválidos. |
| 401 | Credenciales incorrectas, falta de token, sesión inválida o expirada. |
| 404 | Ruta o registro no encontrado; según la operación, también un registro inactivo. |
| 409 | Duplicado, stock insuficiente, registro inactivo o conflicto de estado. |
| 413 | El cuerpo supera los 32 KiB. |
| 429 | Más de 30 solicitudes de registro/login combinadas por IP en 15 minutos. |
| 500 | Error interno; la respuesta no incluye datos privados. |

## Catálogo de servicios

| N.º | Método | Ruta | Propósito |
|---|---|---|---|
| 1 | GET | /api/salud | Consultar disponibilidad |
| 2 | POST | /api/usuarios/registro | Registrar operador |
| 3 | POST | /api/usuarios/login | Iniciar sesión |
| 4 | GET | /api/usuarios/sesion | Consultar sesión |
| 5 | POST | /api/usuarios/logout | Cerrar sesión |
| 6 | POST | /api/clientes | Registrar cliente |
| 7 | GET | /api/clientes | Listar clientes |
| 8 | GET | /api/clientes/{id} | Consultar cliente |
| 9 | PUT | /api/clientes/{id} | Actualizar cliente |
| 10 | DELETE | /api/clientes/{id} | Desactivar cliente |
| 11 | PATCH | /api/clientes/{id}/activar | Activar cliente |
| 12 | POST | /api/productos | Registrar producto |
| 13 | GET | /api/productos | Listar productos |
| 14 | GET | /api/productos/{id} | Consultar producto |
| 15 | PUT | /api/productos/{id} | Actualizar producto |
| 16 | DELETE | /api/productos/{id} | Desactivar producto |
| 17 | PATCH | /api/productos/{id}/activar | Activar producto |
| 18 | GET | /api/inventario | Consultar existencias |
| 19 | GET | /api/inventario/movimientos | Consultar historial de inventario |
| 20 | POST | /api/inventario/movimientos | Registrar entrada o salida |
| 21 | GET | /api/ventas | Listar ventas |
| 22 | GET | /api/ventas/{id} | Consultar venta |
| 23 | POST | /api/ventas | Registrar venta |
| 24 | PATCH | /api/ventas/{id}/anular | Anular venta |

## 1. Consultar disponibilidad

`GET /api/salud`

Comprueba que la API puede comunicarse con MongoDB.

Autenticación: pública; no requiere token.

Cuerpo de entrada: no requiere.

Respuesta correcta: **200**. Modelo: `Salud`. Objeto con estado, proyecto y version.

Errores previstos: 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## 2. Registrar operador

`POST /api/usuarios/registro`

Crea una cuenta de operador y guarda un hash bcrypt de la contraseña. Todos los operadores registrados tienen acceso a los módulos comerciales de esta versión académica local.

Autenticación: pública; no requiere token.

Datos de entrada:

| Campo | Tipo y restricciones | Obligatorio |
|---|---|---|
| usuario | string; 3 a 30 caracteres | Sí |
| password | string; 8 a 72 caracteres; Máximo 72 bytes UTF-8. | Sí |

Ejemplo de solicitud:

```json
{
  "usuario": "operador_demo",
  "password": "PruebaSena2026"
}
```

Respuesta correcta: **201**. Modelo: `Mensaje`. Objeto con mensaje.

Errores previstos: 400, 409, 413, 429, 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## 3. Iniciar sesión

`POST /api/usuarios/login`

Comprueba las credenciales y entrega un token de 64 caracteres válido durante 8 horas. MongoDB conserva únicamente el hash SHA-256 del token.

Autenticación: pública; no requiere token.

Datos de entrada:

| Campo | Tipo y restricciones | Obligatorio |
|---|---|---|
| usuario | string; 3 a 30 caracteres; Se recortan espacios externos y se convierte a minúsculas. | Sí |
| password | string; 1 a 72 caracteres; Registro: mínimo 8 caracteres. Máximo 72 bytes UTF-8; en login basta con que no esté vacía. | Sí |

Ejemplo de solicitud:

```json
{
  "usuario": "operador_demo",
  "password": "PruebaSena2026"
}
```

Respuesta correcta: **200**. Modelo: `Login`. Objeto con mensaje, token, tipo y expira.

Errores previstos: 400, 401, 413, 429, 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## 4. Consultar sesión

`GET /api/usuarios/sesion`

Devuelve el identificador y el nombre del operador autenticado.

Autenticación: token Bearer de operador.

Cuerpo de entrada: no requiere.

Respuesta correcta: **200**. Modelo: `Sesion`. Objeto datos con _id y usuario.

Errores previstos: 401, 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## 5. Cerrar sesión

`POST /api/usuarios/logout`

Elimina la sesión del token enviado. Los siguientes usos de ese token serán rechazados.

Autenticación: token Bearer de operador.

Cuerpo de entrada: no requiere.

Respuesta correcta: **200**. Modelo: `Mensaje`. Objeto con mensaje.

Errores previstos: 401, 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## 6. Registrar cliente

`POST /api/clientes`

Guarda los mismos campos comerciales del módulo de clientes desarrollado en evidencias anteriores.

Autenticación: token Bearer de operador.

Datos de entrada:

| Campo | Tipo y restricciones | Obligatorio |
|---|---|---|
| nombre | string; 2 a 60 caracteres | Sí |
| apellido | string; 2 a 60 caracteres | Sí |
| documento | string; 5 a 20 caracteres | Sí |
| correo | string; 5 a 120 caracteres | Sí |
| telefono | string; 7 a 20 caracteres | Sí |
| direccion | string; 5 a 150 caracteres | Sí |

Ejemplo de solicitud:

```json
{
  "nombre": "Laura",
  "apellido": "Prueba",
  "documento": "1000123456",
  "correo": "laura@example.com",
  "telefono": "3001234567",
  "direccion": "Calle 10 numero 20"
}
```

Respuesta correcta: **201**. Modelo: `DatosCliente`. Objeto con datos del registro; en operaciones de escritura incluye mensaje.

Errores previstos: 400, 401, 409, 413, 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## 7. Listar clientes

`GET /api/clientes`

Devuelve registros activos e inactivos en una lista paginada, ordenada por identificador descendente.

Autenticación: token Bearer de operador.

Consulta opcional: `pagina` y `limite`.

Cuerpo de entrada: no requiere.

Respuesta correcta: **200**. Modelo: `ListaCliente`. Objeto con datos (arreglo de registros), total, pagina y limite.

Errores previstos: 400, 401, 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## 8. Consultar cliente

`GET /api/clientes/{id}`

Busca un registro por identificador, incluyendo registros desactivados.

Autenticación: token Bearer de operador.

Parámetro de ruta: `id`, ObjectId de 24 caracteres hexadecimales.

Cuerpo de entrada: no requiere.

Respuesta correcta: **200**. Modelo: `DatosCliente`. Objeto con datos del registro; en operaciones de escritura incluye mensaje.

Errores previstos: 400, 401, 404, 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## 9. Actualizar cliente

`PUT /api/clientes/{id}`

Actualiza todos los campos del cliente activo; el documento y el correo deben conservar su unicidad.

Autenticación: token Bearer de operador.

Parámetro de ruta: `id`, ObjectId de 24 caracteres hexadecimales.

Datos de entrada:

| Campo | Tipo y restricciones | Obligatorio |
|---|---|---|
| nombre | string; 2 a 60 caracteres | Sí |
| apellido | string; 2 a 60 caracteres | Sí |
| documento | string; 5 a 20 caracteres | Sí |
| correo | string; 5 a 120 caracteres | Sí |
| telefono | string; 7 a 20 caracteres | Sí |
| direccion | string; 5 a 150 caracteres | Sí |

Ejemplo de solicitud:

```json
{
  "nombre": "Laura",
  "apellido": "Prueba",
  "documento": "1000123456",
  "correo": "laura@example.com",
  "telefono": "3001234567",
  "direccion": "Calle 10 numero 20"
}
```

Respuesta correcta: **200**. Modelo: `DatosCliente`. Objeto con datos del registro; en operaciones de escritura incluye mensaje.

Errores previstos: 400, 401, 404, 409, 413, 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## 10. Desactivar cliente

`DELETE /api/clientes/{id}`

Baja lógica del cliente. Conserva el registro y bloquea ventas nuevas para ese cliente.

Autenticación: token Bearer de operador.

Parámetro de ruta: `id`, ObjectId de 24 caracteres hexadecimales.

Cuerpo de entrada: no requiere.

Respuesta correcta: **200**. Modelo: `DatosCliente`. Objeto con datos del registro; en operaciones de escritura incluye mensaje.

Errores previstos: 400, 401, 404, 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## 11. Activar cliente

`PATCH /api/clientes/{id}/activar`

Reactiva el registro conservando su identificador e historial. Si ya está activo, responde 200.

Autenticación: token Bearer de operador.

Parámetro de ruta: `id`, ObjectId de 24 caracteres hexadecimales.

Cuerpo de entrada: no requiere.

Respuesta correcta: **200**. Modelo: `DatosCliente`. Objeto con datos del registro; en operaciones de escritura incluye mensaje.

Errores previstos: 400, 401, 404, 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## 12. Registrar producto

`POST /api/productos`

Crea un reloj o audífonos inteligentes. El stock inicial es cero; se modifica mediante inventario y ventas.

Autenticación: token Bearer de operador.

Datos de entrada:

| Campo | Tipo y restricciones | Obligatorio |
|---|---|---|
| sku | string; 3 a 40 caracteres; Se convierte a mayúsculas; es único. | Sí |
| nombre | string; 3 a 100 caracteres | Sí |
| categoria | reloj / audifonos | Sí |
| marca | string; 2 a 60 caracteres | Sí |
| descripcion | string; 0 a 500 caracteres | No |
| precioCOP | integer; 1 a 1000000000 | Sí |

Ejemplo de solicitud:

```json
{
  "sku": "REL-001",
  "nombre": "Reloj inteligente",
  "categoria": "reloj",
  "marca": "Demo",
  "descripcion": "Producto de demostración",
  "precioCOP": 150000
}
```

Respuesta correcta: **201**. Modelo: `DatosProducto`. Objeto con datos del registro; en operaciones de escritura incluye mensaje.

Errores previstos: 400, 401, 409, 413, 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## 13. Listar productos

`GET /api/productos`

Devuelve registros activos e inactivos en una lista paginada, ordenada por identificador descendente.

Autenticación: token Bearer de operador.

Consulta opcional: `pagina` y `limite`.

Cuerpo de entrada: no requiere.

Respuesta correcta: **200**. Modelo: `ListaProducto`. Objeto con datos (arreglo de registros), total, pagina y limite.

Errores previstos: 400, 401, 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## 14. Consultar producto

`GET /api/productos/{id}`

Busca un registro por identificador, incluyendo registros desactivados.

Autenticación: token Bearer de operador.

Parámetro de ruta: `id`, ObjectId de 24 caracteres hexadecimales.

Cuerpo de entrada: no requiere.

Respuesta correcta: **200**. Modelo: `DatosProducto`. Objeto con datos del registro; en operaciones de escritura incluye mensaje.

Errores previstos: 400, 401, 404, 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## 15. Actualizar producto

`PUT /api/productos/{id}`

Actualiza los datos del catálogo de un producto activo. No recibe stock. Conserva los precios históricos de las ventas.

Autenticación: token Bearer de operador.

Parámetro de ruta: `id`, ObjectId de 24 caracteres hexadecimales.

Datos de entrada:

| Campo | Tipo y restricciones | Obligatorio |
|---|---|---|
| sku | string; 3 a 40 caracteres; Se convierte a mayúsculas; es único. | Sí |
| nombre | string; 3 a 100 caracteres | Sí |
| categoria | reloj / audifonos | Sí |
| marca | string; 2 a 60 caracteres | Sí |
| descripcion | string; 0 a 500 caracteres | No |
| precioCOP | integer; 1 a 1000000000 | Sí |

Ejemplo de solicitud:

```json
{
  "sku": "REL-001",
  "nombre": "Reloj inteligente",
  "categoria": "reloj",
  "marca": "Demo",
  "descripcion": "Producto de demostración",
  "precioCOP": 150000
}
```

Respuesta correcta: **200**. Modelo: `DatosProducto`. Objeto con datos del registro; en operaciones de escritura incluye mensaje.

Errores previstos: 400, 401, 404, 409, 413, 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## 16. Desactivar producto

`DELETE /api/productos/{id}`

Baja lógica del producto. Requiere stock igual a cero; conserva el historial.

Autenticación: token Bearer de operador.

Parámetro de ruta: `id`, ObjectId de 24 caracteres hexadecimales.

Cuerpo de entrada: no requiere.

Respuesta correcta: **200**. Modelo: `DatosProducto`. Objeto con datos del registro; en operaciones de escritura incluye mensaje.

Errores previstos: 400, 401, 404, 409, 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## 17. Activar producto

`PATCH /api/productos/{id}/activar`

Reactiva el registro conservando su identificador e historial. Si ya está activo, responde 200.

Autenticación: token Bearer de operador.

Parámetro de ruta: `id`, ObjectId de 24 caracteres hexadecimales.

Cuerpo de entrada: no requiere.

Respuesta correcta: **200**. Modelo: `DatosProducto`. Objeto con datos del registro; en operaciones de escritura incluye mensaje.

Errores previstos: 400, 401, 404, 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## 18. Consultar existencias

`GET /api/inventario`

Lista los productos con sus existencias actuales, incluidos los inactivos, con paginación.

Autenticación: token Bearer de operador.

Consulta opcional: `pagina` y `limite`.

Cuerpo de entrada: no requiere.

Respuesta correcta: **200**. Modelo: `ListaProducto`. Objeto con datos (arreglo de registros), total, pagina y limite.

Errores previstos: 400, 401, 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## 19. Consultar historial de inventario

`GET /api/inventario/movimientos`

Lista entradas, salidas, ventas y anulaciones. Acepta productoId como filtro opcional y ordena por fecha descendente.

Autenticación: token Bearer de operador.

Consulta opcional: `pagina` y `limite`.

Filtro opcional adicional: `productoId`.

Cuerpo de entrada: no requiere.

Respuesta correcta: **200**. Modelo: `ListaMovimiento`. Objeto con datos (arreglo de registros), total, pagina y limite.

Errores previstos: 400, 401, 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## 20. Registrar entrada o salida

`POST /api/inventario/movimientos`

Registra un ajuste justificado y modifica el saldo en una transacción. Impide existencias negativas o superiores a 1.000.000. Los tipos venta y anulacion son exclusivos del sistema.

Autenticación: token Bearer de operador.

Datos de entrada:

| Campo | Tipo y restricciones | Obligatorio |
|---|---|---|
| productoId | string; 24 caracteres hexadecimales | Sí |
| tipo | entrada / salida | Sí |
| cantidad | integer; 1 a 1000000 | Sí |
| motivo | string; 5 a 200 caracteres | Sí |

Ejemplo de solicitud:

```json
{
  "productoId": "507f1f77bcf86cd799439012",
  "tipo": "entrada",
  "cantidad": 10,
  "motivo": "Ingreso de mercancía para la tienda"
}
```

Respuesta correcta: **201**. Modelo: `DatosMovimiento`. Objeto con datos del registro; en operaciones de escritura incluye mensaje.

Errores previstos: 400, 401, 404, 409, 413, 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## 21. Listar ventas

`GET /api/ventas`

Lista ventas registradas y anuladas mediante paginación.

Autenticación: token Bearer de operador.

Consulta opcional: `pagina` y `limite`.

Cuerpo de entrada: no requiere.

Respuesta correcta: **200**. Modelo: `ListaVenta`. Objeto con datos (arreglo de registros), total, pagina y limite.

Errores previstos: 400, 401, 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## 22. Consultar venta

`GET /api/ventas/{id}`

Devuelve el detalle, los precios históricos, total, estado, cliente y operador de una venta.

Autenticación: token Bearer de operador.

Parámetro de ruta: `id`, ObjectId de 24 caracteres hexadecimales.

Cuerpo de entrada: no requiere.

Respuesta correcta: **200**. Modelo: `DatosVenta`. Objeto con datos del registro; en operaciones de escritura incluye mensaje.

Errores previstos: 400, 401, 404, 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## 23. Registrar venta

`POST /api/ventas`

Valida el cliente activo, los productos activos y el stock. Calcula el total con los precios del catálogo. Guarda venta, detalles y movimientos en una sola transacción. Si falla una línea, revierte todos los cambios. Cada referencia se puede registrar una sola vez.

Autenticación: token Bearer de operador.

Datos de entrada:

| Campo | Tipo y restricciones | Obligatorio |
|---|---|---|
| referencia | string; 3 a 64 caracteres; Identificador comercial único. Se normaliza a mayúsculas. Repetirlo devuelve 409 sin otro descuento. | Sí |
| clienteId | string; 24 caracteres hexadecimales | Sí |
| medioPago | efectivo / transferencia / tarjeta | Sí |
| items | array; 1 a 50 elementos; productoId y cantidad entera 1 a 1.000.000, sin campos adicionales | Sí |

Ejemplo de solicitud:

```json
{
  "referencia": "VENTA-001",
  "clienteId": "507f1f77bcf86cd799439011",
  "medioPago": "efectivo",
  "items": [
    {
      "productoId": "507f1f77bcf86cd799439012",
      "cantidad": 2
    }
  ]
}
```

Respuesta correcta: **201**. Modelo: `DatosVenta`. Objeto con datos del registro; en operaciones de escritura incluye mensaje.

Errores previstos: 400, 401, 404, 409, 413, 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## 24. Anular venta

`PATCH /api/ventas/{id}/anular`

Conserva la venta, registra el motivo y restituye todas las existencias en una transacción. La restitución solo puede suceder una vez. También admite productos desactivados; pueden reactivarse después.

Autenticación: token Bearer de operador.

Parámetro de ruta: `id`, ObjectId de 24 caracteres hexadecimales.

Datos de entrada:

| Campo | Tipo y restricciones | Obligatorio |
|---|---|---|
| motivo | string; 5 a 200 caracteres | Sí |

Ejemplo de solicitud:

```json
{
  "motivo": "El cliente cancela su compra"
}
```

Respuesta correcta: **200**. Modelo: `DatosVenta`. Objeto con datos del registro; en operaciones de escritura incluye mensaje.

Errores previstos: 400, 401, 404, 409, 413, 500. Consulta la tabla de códigos y los modelos OpenAPI para la estructura completa.

## Modelos de respuesta

Los esquemas completos, campos obligatorios, tipos y límites se encuentran en `openapi.json`.

### Cliente

- `nombre`: string, obligatorio.
- `apellido`: string, obligatorio.
- `documento`: string, obligatorio.
- `correo`: string, obligatorio.
- `telefono`: string, obligatorio.
- `direccion`: string, obligatorio.
- `_id`: string, obligatorio.
- `activo`: boolean, obligatorio.
- `fechaRegistro`: string, obligatorio.
- `fechaActualizacion`: string, opcional.
- `revision`: integer, obligatorio.

### Producto

- `sku`: string, obligatorio.
- `nombre`: string, obligatorio.
- `categoria`: reloj / audifonos, obligatorio.
- `marca`: string, obligatorio.
- `descripcion`: string, obligatorio.
- `precioCOP`: integer, obligatorio.
- `_id`: string, obligatorio.
- `stock`: integer, obligatorio.
- `activo`: boolean, obligatorio.
- `fechaRegistro`: string, obligatorio.
- `fechaActualizacion`: string, opcional.

### Movimiento

- `_id`: string, obligatorio.
- `productoId`: string, obligatorio.
- `sku`: string, obligatorio.
- `tipo`: entrada / salida / venta / anulacion, obligatorio.
- `variacion`: integer, obligatorio.
- `stockAnterior`: integer, obligatorio.
- `stockPosterior`: integer, obligatorio.
- `motivo`: string, obligatorio.
- `operadorId`: string, obligatorio.
- `fecha`: string, obligatorio.
- `ventaId`: string, opcional.

### Venta

- `_id`: string, obligatorio.
- `referencia`: string, obligatorio.
- `clienteId`: string, obligatorio.
- `cliente`: object, obligatorio.
- `items`: array, obligatorio.
- `totalCOP`: integer, obligatorio.
- `moneda`: COP, obligatorio.
- `medioPago`: efectivo / transferencia / tarjeta, obligatorio.
- `estado`: registrada / anulada, obligatorio.
- `operadorId`: string, obligatorio.
- `fecha`: string, obligatorio.
- `motivoAnulacion`: string, opcional.
- `fechaAnulacion`: string, opcional.
- `anuladaPor`: string, opcional.

## Ejemplo de flujo de venta

1. Registrar operador e iniciar sesión.
2. Registrar un cliente.
3. Registrar un reloj de 150.000 COP y audífonos de 100.000 COP.
4. Registrar entradas de 10 relojes y 5 audífonos.
5. Vender 2 relojes y 1 audífono: total 400.000 COP; quedan 8 y 4 unidades.
6. Anular la venta: el total histórico se conserva y las existencias regresan a 10 y 5.

La colección de Postman también incluye una salida manual de 1 reloj antes de la venta; por eso en esa demostración los saldos son 9 → 7 → 9 relojes.

## Validación y fuentes técnicas

La suite `backend/test/integracion.js` ejecuta solicitudes HTTP contra MongoDB real en una base temporal y verifica integridad, concurrencia y sesiones. Consulta `resultados-pruebas.json` para los resultados de la ejecución registrada. La colección de Postman permite repetir una demostración guiada; no reemplaza el informe automático.

- [Transacciones con el driver Node.js de MongoDB](https://www.mongodb.com/docs/drivers/node/current/crud/transactions/).
- [Requisitos de transacciones en MongoDB](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/).
- [API de sesiones del driver 7.8](https://mongodb.github.io/node-mongodb-native/7.8/classes/ClientSession.html).

