import { useEffect, useState } from 'react'

// Componente encargado de registrar y editar la información de un cliente.
function ClienteForm({
  onAgregarCliente,
  clienteEditando,
  onActualizarCliente,
  onCancelarEdicion,
}) {
  // Estados que almacenan temporalmente los datos escritos por el usuario.
  const [nombre, setNombre] = useState('')
  const [documento, setDocumento] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')

  // Estado que almacena los mensajes de validación.
  const [errores, setErrores] = useState({})

  // Carga en el formulario los datos del cliente seleccionado para editar.
  useEffect(() => {
    if (clienteEditando) {
      setNombre(clienteEditando.nombre)
      setDocumento(clienteEditando.documento)
      setCorreo(clienteEditando.correo)
      setTelefono(clienteEditando.telefono)
      setErrores({})
    }
  }, [clienteEditando])

  // Valida la información ingresada antes de guardar o actualizar.
  function validarFormulario() {
    const nuevosErrores = {}

    // Validación del nombre.
    if (!nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es obligatorio.'
    } else if (nombre.trim().length < 3) {
      nuevosErrores.nombre = 'El nombre debe tener mínimo 3 caracteres.'
    } else if (nombre.trim().length > 60) {
      nuevosErrores.nombre = 'El nombre no puede superar 60 caracteres.'
    } else if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/.test(nombre.trim())) {
      nuevosErrores.nombre =
        'El nombre solo puede contener letras y espacios.'
    }

    // Validación del documento.
    if (!documento.trim()) {
      nuevosErrores.documento = 'El documento es obligatorio.'
    } else if (!/^\d+$/.test(documento)) {
      nuevosErrores.documento =
        'El documento solo puede contener números.'
    } else if (documento.length < 6 || documento.length > 15) {
      nuevosErrores.documento =
        'El documento debe tener entre 6 y 15 dígitos.'
    }

    // Validación del correo.
    if (!correo.trim()) {
      nuevosErrores.correo = 'El correo electrónico es obligatorio.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      nuevosErrores.correo =
        'Ingrese un correo electrónico válido.'
    } else if (correo.length > 100) {
      nuevosErrores.correo =
        'El correo no puede superar los 100 caracteres.'
    }

    // Validación del teléfono.
    if (!telefono.trim()) {
      nuevosErrores.telefono = 'El teléfono es obligatorio.'
    } else if (!/^\d+$/.test(telefono)) {
      nuevosErrores.telefono =
        'El teléfono solo puede contener números.'
    } else if (telefono.length < 7 || telefono.length > 10) {
      nuevosErrores.telefono =
        'El teléfono debe tener entre 7 y 10 dígitos.'
    }

    return nuevosErrores
  }

  // Se ejecuta cuando el usuario envía el formulario.
  function guardarCliente(evento) {
    evento.preventDefault()

    const nuevosErrores = validarFormulario()

    // Si existen errores, se detiene el registro.
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores)
      return
    }

    setErrores({})

    if (clienteEditando) {
      // Mantiene el mismo ID y actualiza la información.
      const clienteActualizado = {
        id: clienteEditando.id,
        nombre: nombre.trim(),
        documento,
        correo: correo.trim(),
        telefono,
      }

      onActualizarCliente(clienteActualizado)
    } else {
      // Crea un cliente nuevo.
      const nuevoCliente = {
        id: Date.now(),
        nombre: nombre.trim(),
        documento,
        correo: correo.trim(),
        telefono,
      }

      onAgregarCliente(nuevoCliente)
    }

    // Limpia los campos después de guardar o actualizar.
    setNombre('')
    setDocumento('')
    setCorreo('')
    setTelefono('')
  }

  // Cancela la edición y limpia los campos del formulario.
  function cancelarEdicion() {
    setNombre('')
    setDocumento('')
    setCorreo('')
    setTelefono('')
    setErrores({})

    onCancelarEdicion()
  }

  return (
    <section className="formulario-card">
      <h3>
        {clienteEditando ? 'Editar cliente' : 'Registrar cliente'}
      </h3>

      <form onSubmit={guardarCliente} noValidate>
        <div className="form-grid">
          <div className="campo">
            <label htmlFor="nombre">Nombre</label>

            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              placeholder="Ej. Juan Pérez"
              maxLength="60"
            />

            {errores.nombre && (
              <span className="mensaje-error">
                {errores.nombre}
              </span>
            )}
          </div>

          <div className="campo">
            <label htmlFor="documento">Documento</label>

            <input
              id="documento"
              type="text"
              value={documento}
              onChange={(evento) =>
                setDocumento(evento.target.value)
              }
              placeholder="Ej. 1020304050"
              maxLength="15"
            />

            {errores.documento && (
              <span className="mensaje-error">
                {errores.documento}
              </span>
            )}
          </div>

          <div className="campo">
            <label htmlFor="correo">Correo electrónico</label>

            <input
              id="correo"
              type="email"
              value={correo}
              onChange={(evento) => setCorreo(evento.target.value)}
              placeholder="Ej. cliente@correo.com"
              maxLength="100"
            />

            {errores.correo && (
              <span className="mensaje-error">
                {errores.correo}
              </span>
            )}
          </div>

          <div className="campo">
            <label htmlFor="telefono">Teléfono</label>

            <input
              id="telefono"
              type="text"
              value={telefono}
              onChange={(evento) =>
                setTelefono(evento.target.value)
              }
              placeholder="Ej. 3001234567"
              maxLength="10"
            />

            {errores.telefono && (
              <span className="mensaje-error">
                {errores.telefono}
              </span>
            )}
          </div>
        </div>

        <button className="boton-guardar" type="submit">
          {clienteEditando
            ? 'Actualizar cliente'
            : 'Guardar cliente'}
        </button>

        {clienteEditando && (
          <button
            className="boton-cancelar"
            type="button"
            onClick={cancelarEdicion}
          >
            Cancelar edición
          </button>
        )}
      </form>
    </section>
  )
}

export default ClienteForm