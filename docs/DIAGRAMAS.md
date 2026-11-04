# Diagramas de JXS Tech

Evidencia: GA8-220501096-AA1-EV01.

Los diagramas describen la aplicación integrada desarrollada con React, Node.js, Express y MongoDB.

## 1. Diagrama de clases del dominio

Representa las entidades del negocio y sus relaciones.

Es un modelo conceptual: la implementación utiliza documentos de MongoDB y módulos funcionales de JavaScript. No supone que cada entidad tenga una clase JavaScript declarada.

```mermaid
classDiagram
    class Usuario {
        ObjectId _id
        String usuario
        String passwordHash
        Date fechaRegistro
    }

    class Sesion {
        ObjectId _id
        ObjectId usuarioId
        String usuario
        String tokenHash
        Date expira
    }

    class Cliente {
        ObjectId _id
        String nombre
        String apellido
        String documento
        String correo
        String telefono
        String direccion
        Boolean activo
        Number revision
        Date fechaRegistro
    }

    class Producto {
        ObjectId _id
        String sku
        String nombre
        String categoria
        String marca
        String descripcion
        Number precioCOP
        Number stock
        Boolean activo
        Date fechaRegistro
    }

    class Movimiento {
        ObjectId _id
        ObjectId productoId
        ObjectId operadorId
        ObjectId ventaId
        String sku
        String tipo
        Number variacion
        Number stockAnterior
        Number stockPosterior
        String motivo
        Date fecha
    }

    class Venta {
        ObjectId _id
        String referencia
        ObjectId clienteId
        ObjectId operadorId
        String medioPago
        Number totalCOP
        String moneda
        String estado
        Date fecha
        String motivoAnulacion
        Date fechaAnulacion
        ObjectId anuladaPor
    }

    class DetalleVenta {
        ObjectId productoId
        String sku
        String nombre
        Number cantidad
        Number precioUnitarioCOP
        Number subtotalCOP
    }

    class ClienteHistorico {
        String nombre
        String apellido
        String documento
    }

    Usuario "1" --> "0..*" Sesion : mantiene
    Usuario "1" --> "0..*" Venta : registra
    Usuario "1" --> "0..*" Movimiento : registra
    Cliente "1" --> "0..*" Venta : asociado a
    Producto "1" --> "0..*" Movimiento : tiene
    Venta "1" *-- "1..50" DetalleVenta : contiene
    Venta "1" *-- "1" ClienteHistorico : conserva
    Producto "1" <-- "0..*" DetalleVenta : referencia
    Venta "0..1" <-- "0..*" Movimiento : relacionado con
```

Los detalles y los datos históricos del cliente se guardan dentro del documento de venta.

La referencia de una venta en un movimiento es opcional: las entradas y salidas manuales no necesitan una venta asociada.

Las bajas lógicas conservan las referencias históricas.

## 2. Diagrama de paquetes

Muestra la organización del código por carpetas y sus dependencias principales. Cada agrupación representa un paquete lógico de archivos.

```mermaid
flowchart TB
    subgraph INTERFAZ["interfaz/src"]
        APP["App.jsx y Gestion*.jsx"]
        COMPONENTES["components: acceso, formularios, tablas, cabecera y menu"]
        API["api.js"]
        ESTILOS["App.css e index.css"]
    end

    subgraph BACKEND["backend/src"]
        RUTAS["app.js"]
        AUTH["auth.js"]
        CLIENTES["clientes.js"]
        PRODUCTOS["productos.js"]
        INVENTARIO["inventario.js"]
        VENTAS["ventas.js"]
        COMUN["common.js"]
        DATOS["database.js"]
    end

    subgraph PRUEBAS["backend/test"]
        UNITARIAS["unitarias.test.js"]
        INTEGRACION["integracion.js"]
    end

    subgraph DOCUMENTACION["docs"]
        MANUALES["Documentacion, diagramas e informes"]
    end

    APP --> COMPONENTES
    APP --> API
    COMPONENTES --> API
    APP --> ESTILOS

    API -->|"HTTP /api"| RUTAS

    RUTAS --> AUTH
    RUTAS --> CLIENTES
    RUTAS --> PRODUCTOS
    RUTAS --> INVENTARIO
    RUTAS --> VENTAS

    AUTH --> COMUN
    CLIENTES --> COMUN
    PRODUCTOS --> COMUN
    INVENTARIO --> COMUN
    VENTAS --> COMUN
    VENTAS --> INVENTARIO

    DATOS -->|"Inyecta contexto de persistencia al iniciar"| RUTAS
    UNITARIAS -.->|"Prueba modulos aislados"| BACKEND
    INTEGRACION -.->|"Prueba API y persistencia"| RUTAS
```

`database.js` crea la conexión, los índices y la función de transacciones.

Los módulos reciben el contexto de persistencia por parámetro. Ventas reutiliza la operación de inventario para descontar y restituir existencias.

## 3. Diagrama de componentes

Representa los componentes que colaboran durante la ejecución.

```mermaid
flowchart LR
    OPERADOR["Operador"]

    subgraph NAVEGADOR["Navegador"]
        REACT["Interfaz React compilada"]
        SESION["sessionStorage: token"]
        CLIENTEHTTP["Cliente HTTP compartido: api.js"]
    end

    subgraph SERVIDOR["Servidor Node.js y Express"]
        ESTATICOS["Servicio de archivos interfaz/dist"]
        ACCESO["Autenticacion y validacion de sesiones"]
        CLIENTES["Componente de clientes"]
        PRODUCTOS["Componente de productos"]
        INVENTARIO["Componente de inventario"]
        VENTAS["Componente de ventas y anulaciones"]
        PERSISTENCIA["Conexion, indices y transacciones"]
    end

    MONGO[("MongoDB Atlas o replica set")]

    OPERADOR --> REACT
    ESTATICOS -->|"HTML, CSS y JavaScript"| REACT
    REACT <--> SESION
    REACT --> CLIENTEHTTP

    CLIENTEHTTP -->|"Registro, login, sesion y logout"| ACCESO
    CLIENTEHTTP -->|"Solicitudes con Bearer token"| CLIENTES
    CLIENTEHTTP -->|"Solicitudes con Bearer token"| PRODUCTOS
    CLIENTEHTTP -->|"Solicitudes con Bearer token"| INVENTARIO
    CLIENTEHTTP -->|"Solicitudes con Bearer token"| VENTAS

    ACCESO -.->|"Protege"| CLIENTES
    ACCESO -.->|"Protege"| PRODUCTOS
    ACCESO -.->|"Protege"| INVENTARIO
    ACCESO -.->|"Protege"| VENTAS

    VENTAS -->|"Reutiliza movimientos"| INVENTARIO

    ACCESO --> PERSISTENCIA
    CLIENTES --> PERSISTENCIA
    PRODUCTOS --> PERSISTENCIA
    INVENTARIO --> PERSISTENCIA
    VENTAS --> PERSISTENCIA
    PERSISTENCIA <--> MONGO
```

En la versión compilada, la interfaz y la API se sirven desde el puerto 3001.

Durante el desarrollo, Vite sirve la interfaz en el puerto 5173 y redirige `/api` al backend del puerto 3001.

## 4. Mapa de navegación

Describe las pantallas y acciones disponibles para el operador.

```mermaid
flowchart TD
    INICIO["Abrir JXS Tech"]
    ACCESO["Iniciar sesion"]
    REGISTRO["Registrar operador"]
    MENU["Menu de la aplicacion"]
    CLIENTES["Gestion de clientes"]
    PRODUCTOS["Gestion de productos"]
    INVENTARIO["Gestion de inventario"]
    VENTAS["Gestion de ventas"]
    SALIR["Cerrar sesion"]

    INICIO -->|"Sin sesion valida"| ACCESO
    INICIO -->|"Sesion validada por la API"| CLIENTES
    ACCESO --> REGISTRO
    REGISTRO -->|"Cuenta creada"| ACCESO
    ACCESO -->|"Credenciales correctas"| CLIENTES

    CLIENTES <--> MENU
    PRODUCTOS <--> MENU
    INVENTARIO <--> MENU
    VENTAS <--> MENU
    MENU --> SALIR
    SALIR --> ACCESO

    CLIENTES --> C1["Registrar, consultar y editar"]
    CLIENTES --> C2["Desactivar y reactivar"]

    PRODUCTOS --> P1["Registrar, consultar y editar"]
    PRODUCTOS --> P2["Desactivar y reactivar"]

    INVENTARIO --> I1["Registrar entrada o salida"]
    INVENTARIO --> I2["Consultar existencias e historial"]

    VENTAS --> V1["Seleccionar cliente y agregar productos"]
    V1 --> V2["Registrar venta"]
    VENTAS --> V3["Consultar detalle historico"]
    VENTAS --> V4["Anular venta con motivo"]
```

El menú está disponible en las cuatro pantallas comerciales.

La navegación se controla mediante el estado de React. Al recargar con una sesión válida, la aplicación abre inicialmente Clientes.

El servidor exige una sesión válida para acceder a los servicios comerciales.