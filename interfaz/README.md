# JXS Tech — Aplicación web integrada

Aprendiz: Sergio Murillo  
Evidencia: GA8-220501096-AA1-EV01  
Actividad: Desarrollar software a partir de la integración de sus módulos componentes.

## Descripción

Aplicación web para la gestión comercial de una tienda de relojes y audífonos inteligentes.

Integra autenticación de operadores, clientes, productos, inventario, ventas y anulaciones. La interfaz React consume una API desarrollada con Node.js y Express. Los datos se almacenan en MongoDB.

## Funciones implementadas

- Registro, inicio y cierre de sesión de operadores.
- Validación de la sesión al recargar la aplicación.
- Registro, consulta, edición, desactivación y reactivación de clientes.
- Registro, consulta, edición, desactivación y reactivación de productos.
- Registro de entradas y salidas de inventario.
- Consulta de existencias e historial de movimientos.
- Registro de ventas con uno o varios productos.
- Consulta del detalle histórico de las ventas.
- Anulación de ventas con restitución de existencias.
- Validaciones en la interfaz y en el servidor.
- Listados con paginación.

## Arquitectura

La aplicación se organiza en tres capas:

1. Presentación: React, componentes JSX y CSS dentro de `interfaz/src`.
2. Aplicación y reglas del negocio: rutas y módulos de Express dentro de `backend/src`.
3. Persistencia: MongoDB, índices y transacciones, mediante el controlador oficial de MongoDB.

Durante el desarrollo, Vite dirige las solicitudes `/api` al backend mediante un proxy.

En la ejecución compilada, Express sirve los archivos de `interfaz/dist` y atiende los servicios `/api` desde el mismo puerto.

## Requisitos

- Node.js y npm. Entorno verificado: Node.js 24.21.0 y npm 11.19.0.
- MongoDB Atlas o una instalación de MongoDB con replica set.
- Acceso de red y permisos sobre la base de datos configurada.
- Navegador web.
- Git para el control de versiones.

MongoDB sin replica set no permite ejecutar las transacciones que utiliza este proyecto.

## Instalación

Abrir una terminal en la carpeta principal del proyecto.

Instalar las dependencias del backend:

```powershell
cd backend
npm.cmd ci
Copy-Item .env.example .env
```

Editar `backend/.env` y configurar una conexión propia:

```dotenv
PORT=3001
MONGODB_URI="CONEXION_PRIVADA_DE_MONGODB"
DB_NAME=jxstech_ga8
```

El valor de ejemplo debe sustituirse por una conexión válida. El archivo `.env` contiene información privada y está excluido del repositorio.

Instalar las dependencias del frontend y compilar:

```powershell
cd ../interfaz
npm.cmd ci
npm.cmd run build
```

## Ejecución de la versión compilada

Desde `interfaz`, entrar al backend e iniciar el servidor:

```powershell
cd ../backend
npm.cmd start
```

Abrir en el navegador:

http://localhost:3001/

El backend sirve la interfaz compilada y los servicios web.

Si la entrega incluye `interfaz/dist`, puede utilizarse esa compilación. El comando `npm.cmd run build` permite regenerarla.

Para verificar la disponibilidad de la API y la conexión con MongoDB:

http://localhost:3001/api/salud

La dirección localhost corresponde al computador donde se ejecuta el servidor.

## Primer acceso

1. Abrir la aplicación.
2. Seleccionar "Registrar operador".
3. Crear un usuario de entre 3 y 30 caracteres, utilizando letras, números o guion bajo.
4. Elegir una contraseña de al menos 8 caracteres, sin superar 72 bytes.
5. Iniciar sesión con las credenciales creadas.

Los operadores registrados tienen los mismos permisos en esta versión académica.

La base configurada para GA8 es independiente de las bases utilizadas en evidencias anteriores. Los usuarios de otra base no se transfieren automáticamente.

## Ambiente de desarrollo

Iniciar el backend en una terminal:

```powershell
cd backend
npm.cmd start
```

En otra terminal, desde la carpeta principal:

```powershell
cd interfaz
npm.cmd run dev
```

Abrir:

http://localhost:5173/

El proxy de Vite conecta las solicitudes `/api` con el backend del puerto 3001.

## Base de datos

El inicio del backend prepara las colecciones e índices necesarios:

- usuarios
- sesiones
- clientes
- productos
- movimientos
- ventas

Se crean índices únicos para usuario, token de sesión, documento y correo del cliente, SKU y referencia de venta.

Los documentos se generan al utilizar los módulos. No se requiere importar datos de las pruebas manuales para iniciar una instalación nueva.

## Reglas del negocio

- Los productos se registran con existencias en cero.
- Las existencias cambian mediante movimientos de inventario, ventas y anulaciones.
- Cada movimiento conserva su motivo, operador y saldos anterior y posterior.
- No se permiten salidas superiores a las existencias disponibles.
- No se permite desactivar productos con existencias.
- Las ventas requieren clientes y productos activos.
- La referencia de venta es única.
- El servidor calcula los precios y totales en pesos colombianos enteros.
- Una venta y sus movimientos se procesan dentro de una transacción.
- La anulación conserva la venta y restituye las unidades una sola vez.
- Clientes y productos utilizan desactivación lógica.
- Las ventas conservan los datos del cliente y los precios del momento del registro.

## Seguridad

- Contraseñas almacenadas mediante hash con bcrypt.
- Tokens de sesión aleatorios; el servidor almacena su hash.
- Sesiones con vencimiento y cierre de sesión que invalida el token.
- Token del navegador almacenado en sessionStorage.
- Autorización mediante Bearer token para los módulos comerciales.
- Validación de campos permitidos, formatos, identificadores y límites.
- Restricción de intentos en las operaciones de registro e inicio de sesión.
- Límite del tamaño de las solicitudes JSON.
- Credenciales privadas excluidas de Git.

La configuración de ejecución incluida escucha en la interfaz local del computador.

## Ambiente y pruebas

### Pruebas unitarias

Desde `backend`:

```powershell
npm.cmd run test:unitarias
```

Ejecutan reglas aisladas de autenticación, clientes, productos, inventario, ventas y validaciones compartidas. Utilizan colaboradores simulados sin conectarse a MongoDB.

Resultado verificado: 18 aprobadas y 0 fallidas.

Informe: `docs/resultados-unitarias-ga8.txt`.

### Pruebas de integración

Desde `backend`, con una conexión válida en `.env`:

```powershell
npm.cmd test
```

Ejecutan solicitudes HTTP contra MongoDB real.

Cada ejecución crea una base temporal independiente con prefijo `jxstech_ev03_test_` y elimina únicamente esa base al finalizar. El prefijo proviene de la suite reutilizada de la evidencia anterior.

La cuenta de MongoDB debe tener permisos para crear y eliminar esa base temporal.

Resultado verificado en GA8: 38 casos aprobados.

Informe: `docs/resultados-integracion-ga8.json`.

### Verificación del frontend

Desde `interfaz`:

```powershell
npm.cmd run lint
npm.cmd run build
```

Ambas verificaciones finalizaron correctamente.

### Recorrido manual comprobado

- Registro y acceso de operador.
- Registro, edición, desactivación y reactivación de cliente.
- Registro, edición y cambio de estado de producto.
- Rechazo de SKU duplicado.
- Entrada de 10 unidades y salida de 2.
- Rechazo de salida de 20 unidades cuando solo existen 8.
- Venta de 2 unidades a 160.000 COP: total de 320.000 COP.
- Descuento de inventario de 8 a 6 unidades.
- Anulación con restitución de 6 a 8 unidades.
- Conservación del historial y de los datos al recargar.
- Ejecución de la interfaz compilada desde el puerto 3001.

## Organización del proyecto

- `backend/src`: módulos de la API, validaciones, seguridad y persistencia.
- `backend/test`: pruebas unitarias y de integración.
- `backend/.env.example`: plantilla de configuración sin credenciales.
- `interfaz/src/components`: formularios, tablas, cabecera y menú reutilizables.
- `interfaz/src/Gestion*.jsx`: pantallas de los módulos comerciales.
- `interfaz/src/api.js`: comunicación compartida con la API.
- `interfaz/dist`: resultado de la compilación.
- `frontend`: demostración de acceso conservada de la evidencia anterior; no es la interfaz utilizada en GA8.
- `docs`: documentación e informes de pruebas.
- `postman`: colección de servicios de la evidencia anterior.

## Desarrollo y control de versiones

El trabajo se realizó de forma incremental: autenticación, clientes, productos, inventario y ventas.

Cada incremento se comprobó mediante recorridos funcionales y se registró en Git. Se reutilizaron los servicios existentes y se integraron con componentes de React.

## Alcance

La aplicación registra el medio de pago como dato. No procesa pagos bancarios ni incluye pasarelas, facturación electrónica, impuestos o envíos.

La documentación de servicios y la colección de Postman heredadas corresponden al backend de la evidencia anterior. Las instrucciones de instalación y ejecución de GA8 son las de este README.