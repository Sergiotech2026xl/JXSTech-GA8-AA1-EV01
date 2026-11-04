# Requerimientos e historias de usuario — JXS Tech

Evidencia: GA8-220501096-AA1-EV01.

Este documento describe el alcance implementado y verificado en la aplicación integrada. Debe leerse junto con el README, los diagramas y los informes de pruebas.

## Actor principal

Operador de la tienda: usuario autenticado que administra clientes, productos, inventario y ventas.

Los operadores registrados tienen los mismos permisos en esta versión académica.

## Requerimientos funcionales e historias de usuario

| ID | Historia de usuario | Criterio de aceptación | Implementación |
|---|---|---|---|
| HU01 | Como operador, quiero registrar una cuenta para acceder al sistema. | Acepta credenciales válidas, rechaza usuarios duplicados y almacena un hash de la contraseña. | Acceso.jsx y auth.js |
| HU02 | Como operador, quiero iniciar y cerrar sesión para controlar mi acceso. | Credenciales válidas permiten entrar; el cierre invalida el token y las solicitudes sin sesión son rechazadas. | App.jsx, api.js y auth.js |
| HU03 | Como operador, quiero registrar y consultar clientes para utilizarlos en las ventas. | Guarda los seis campos obligatorios y permite consultarlos después de recargar. Documento y correo son únicos. | GestionClientes.jsx, ClienteForm.jsx, ClienteTable.jsx y clientes.js |
| HU04 | Como operador, quiero editar clientes para mantener su información actualizada. | Los cambios válidos se guardan y permanecen al recargar. | Módulo de clientes |
| HU05 | Como operador, quiero desactivar y reactivar clientes para controlar su disponibilidad. | Conserva sus datos y referencias históricas; un cliente inactivo no puede utilizarse en nuevas ventas. | clientes.js y ventas.js |
| HU06 | Como operador, quiero registrar y consultar productos para mantener el catálogo. | Guarda SKU, nombre, categoría, marca, descripción opcional y precio. El SKU es único y el stock inicial es cero. | GestionProductos.jsx, ProductoForm.jsx y productos.js |
| HU07 | Como operador, quiero editar productos para actualizar el catálogo. | Guarda los datos válidos y conserva en las ventas anteriores los precios históricos. | productos.js y ventas.js |
| HU08 | Como operador, quiero desactivar y reactivar productos. | Solo permite desactivar productos con stock cero y bloquea nuevas ventas de productos inactivos. | productos.js y ventas.js |
| HU09 | Como operador, quiero registrar entradas y salidas para controlar las existencias. | Acepta cantidades enteras positivas y motivo obligatorio. Rechaza salidas superiores al stock. | GestionInventario.jsx e inventario.js |
| HU10 | Como operador, quiero consultar el historial para conocer los cambios de inventario. | Cada movimiento conserva producto, tipo, variación, motivo, operador, fecha y saldos. | inventario.js |
| HU11 | Como operador, quiero registrar ventas para descontar los productos vendidos. | Requiere cliente activo, productos activos, cantidades válidas, stock suficiente y referencia única. El servidor calcula el total. | GestionVentas.jsx, VentaForm.jsx, ventas.js e inventario.js |
| HU12 | Como operador, quiero consultar el detalle de una venta para revisar su información histórica. | Muestra cliente, productos, cantidades, precios, total, fecha, medio de pago y estado. | GestionVentas.jsx y ventas.js |
| HU13 | Como operador, quiero anular una venta para restituir sus unidades. | Exige un motivo, conserva la venta y devuelve el stock una sola vez. | ventas.js e inventario.js |
| HU14 | Como operador, quiero navegar entre los módulos para realizar mi trabajo. | El menú permite abrir Clientes, Productos, Inventario y Ventas, y cerrar sesión. | App.jsx y Sidebar.jsx |

## Requerimientos de calidad

| ID | Requerimiento | Evidencia |
|---|---|---|
| RNF01 | Persistencia de la información en MongoDB. | Datos conservados al recargar y pruebas de integración. |
| RNF02 | Validación en el servidor de campos permitidos, formatos, límites e identificadores. | common.js y validaciones de cada módulo. |
| RNF03 | Protección de los servicios comerciales mediante sesiones. | Middleware de autenticación y pruebas sin token, con token vencido y después del logout. |
| RNF04 | Consistencia de ventas, anulaciones y movimientos mediante transacciones. | database.js y pruebas de reversión y concurrencia. |
| RNF05 | Organización modular y reutilización de componentes. | Componentes React, api.js, common.js y función mover de inventario. |
| RNF06 | Instalación reproducible. | package-lock.json de cada aplicación, npm ci y plantilla .env.example. |
| RNF07 | Control de versiones. | Historial de commits del repositorio Git. |
| RNF08 | Verificación del código y de su funcionamiento. | Lint, compilación, 18 pruebas unitarias y 38 pruebas de integración aprobadas. |

## Correspondencia entre capas y tecnologías

| Capa | Responsabilidad | Tecnologías y dependencias |
|---|---|---|
| Presentación | Formularios, tablas, navegación, mensajes y estado de la interfaz. | React, React DOM, JSX y CSS. |
| Comunicación | Solicitudes HTTP y envío del token de sesión. | Fetch del navegador y api.js. |
| Aplicación | Servicios web, autenticación, validación y reglas comerciales. | Node.js, Express y bcryptjs. |
| Persistencia | Colecciones, índices, consultas y transacciones. | MongoDB y controlador oficial mongodb. |
| Configuración | Lectura de variables del entorno. | dotenv. |
| Desarrollo y verificación | Servidor de desarrollo, compilación, revisión y pruebas. | Vite, ESLint, node:test y node:assert. |

## Organización y decisiones de diseño

- Separación por responsabilidades entre presentación, reglas del negocio y persistencia.
- Componentes de interfaz reutilizables para formularios, tablas, cabecera y menú.
- Cliente HTTP compartido para evitar duplicar la comunicación y el manejo de tokens.
- Middleware para centralizar la protección de las rutas comerciales.
- Contexto de persistencia recibido por los módulos mediante inyección de dependencias.
- Validaciones comunes centralizadas en common.js.
- Operación de movimiento de inventario reutilizada por ventas y anulaciones.
- Transacciones para confirmar o revertir conjuntamente las operaciones relacionadas.
- Desactivación lógica para conservar referencias y datos históricos.

Estas decisiones corresponden al código implementado; no se declara un patrón de repositorio ni una arquitectura de microservicios.

## Metodología de desarrollo aplicada

Se utilizó un proceso incremental:

1. Revisar los servicios y la interfaz de evidencias anteriores.
2. Preparar una copia independiente y su repositorio Git.
3. Integrar autenticación y clientes.
4. Integrar productos.
5. Integrar inventario e historial.
6. Integrar ventas y anulaciones.
7. Comprobar cada incremento mediante recorridos manuales.
8. Ejecutar revisión de código, compilación y pruebas automáticas.
9. Documentar la instalación, los ambientes, los diagramas y los resultados.

No se atribuyen ceremonias o roles de Scrum que no fueron realizados.

## Verificación y trazabilidad

Las historias se verifican mediante la combinación de:

- Pruebas unitarias: reglas aisladas de los módulos, sin conexión a MongoDB.
- Pruebas de integración: solicitudes HTTP y persistencia real, incluidas operaciones concurrentes y reversión de transacciones.
- Pruebas manuales: interacción desde la interfaz React.
- Ejecución compilada: interfaz y API servidas desde localhost:3001.

Los nombres individuales de los casos y sus resultados se encuentran en:

- docs/resultados-unitarias-ga8.txt
- docs/resultados-integracion-ga8.json

## Límites del alcance

- El medio de pago se registra como información; no se realiza un cobro bancario.
- No se implementan facturación electrónica, impuestos ni envíos.
- La ejecución comprobada es local.
- No se han establecido resultados de rendimiento, disponibilidad o carga que no hayan sido medidos.