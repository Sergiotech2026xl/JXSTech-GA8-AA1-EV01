# JXS Tech - Componente Front-End

## Evidencia
GA7-220501096-AA4-EV03  
Componente front-end del proyecto formativo y proyectos de clase.

## Descripción

JXS Tech es un sistema de gestión comercial desarrollado como parte del proyecto formativo del SENA.

En esta evidencia se desarrolló el módulo front-end de gestión de clientes utilizando React, JavaScript, JSX, CSS y Vite.

El módulo permite registrar, consultar, editar y eliminar clientes mediante una interfaz web.

## Tecnologías utilizadas

- React
- JavaScript
- JSX
- CSS
- Vite
- Node.js
- Git
- GitHub
- Visual Studio Code

## Funcionalidades

El módulo de clientes permite:

- Registrar clientes.
- Mostrar los clientes registrados.
- Editar la información de un cliente.
- Actualizar los datos registrados.
- Cancelar una edición.
- Eliminar clientes.
- Confirmar antes de eliminar un cliente.
- Validar la información ingresada en el formulario.
- Mostrar mensajes de error cuando los datos no son válidos.

## Validaciones implementadas

### Nombre
- Campo obligatorio.
- Mínimo 3 caracteres.
- Máximo 60 caracteres.
- Solo permite letras y espacios.

### Documento
- Campo obligatorio.
- Solo permite números.
- Entre 6 y 15 dígitos.

### Correo electrónico
- Campo obligatorio.
- Validación de formato de correo.
- Máximo 100 caracteres.

### Teléfono
- Campo obligatorio.
- Solo permite números.
- Entre 7 y 10 dígitos.

## Estructura principal del proyecto

```text
src/
│
├── components/
│   ├── ClienteForm.jsx
│   ├── ClienteTable.jsx
│   ├── Header.jsx
│   └── Sidebar.jsx
│
├── App.jsx
├── App.css
├── index.css
└── main.jsx