import { useState } from 'react'

const VACIO = {
  nombre: '',
  apellido: '',
  documento: '',
  correo: '',
  telefono: '',
  direccion: '',
}

const CAMPOS = [
  { nombre: 'nombre', etiqueta: 'Nombre', min: 2, max: 60 },
  { nombre: 'apellido', etiqueta: 'Apellido', min: 2, max: 60 },
  { nombre: 'documento', etiqueta: 'Documento', min: 5, max: 20 },
  {
    nombre: 'correo',
    etiqueta: 'Correo electrónico',
    tipo: 'email',
    min: 5,
    max: 120,
  },
  {
    nombre: 'telefono',
    etiqueta: 'Teléfono',
    tipo: 'tel',
    min: 7,
    max: 20,
  },
  { nombre: 'direccion', etiqueta: 'Dirección', min: 5, max: 150 },
]

export default function ClienteForm({
  clienteEditando,
  onGuardar,
  onCancelar,
  ocupado,
}) {
  const [datos, setDatos] = useState(() => {
    const iniciales = { ...VACIO }

    if (clienteEditando) {
      for (const campo of CAMPOS) {
        iniciales[campo.nombre] = clienteEditando[campo.nombre] || ''
      }
    }

    return iniciales
  })

  const [error, setError] = useState('')

  function cambiar(evento) {
    const { name, value } = evento.target

    setDatos((anteriores) => ({
      ...anteriores,
      [name]: value,
    }))
  }

  async function enviar(evento) {
    evento.preventDefault()
    setError('')

    const limpios = Object.fromEntries(
      Object.entries(datos).map(([campo, valor]) => [campo, valor.trim()]),
    )

    for (const campo of CAMPOS) {
      if (
        limpios[campo.nombre].length < campo.min ||
        limpios[campo.nombre].length > campo.max
      ) {
        setError(
          `${campo.etiqueta}: escribe entre ${campo.min} y ${campo.max} caracteres.`,
        )
        return
      }
    }

    if (!/^[a-zA-Z0-9-]+$/.test(limpios.documento)) {
      setError('El documento solo admite letras, números y guiones.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpios.correo)) {
      setError('Escribe un correo electrónico válido.')
      return
    }

    if (!/^\+?[\d ()-]+$/.test(limpios.telefono)) {
      setError('Escribe un teléfono válido.')
      return
    }

    limpios.correo = limpios.correo.toLowerCase()

    const guardado = await onGuardar(limpios)

    // Conserva los datos escritos si el servidor rechaza el registro.
    if (guardado) {
      setDatos({ ...VACIO })
    }
  }

  return (
    <section className="formulario-card">
      <h3>{clienteEditando ? 'Editar cliente' : 'Registrar cliente'}</h3>

      <form onSubmit={enviar}>
        <div className="form-grid">
          {CAMPOS.map((campo) => (
            <div className="campo" key={campo.nombre}>
              <label htmlFor={`cliente-${campo.nombre}`}>
                {campo.etiqueta}
              </label>

              <input
                id={`cliente-${campo.nombre}`}
                name={campo.nombre}
                type={campo.tipo || 'text'}
                value={datos[campo.nombre]}
                onChange={cambiar}
                minLength={campo.min}
                maxLength={campo.max}
                disabled={ocupado}
                required
              />
            </div>
          ))}
        </div>

        {error && <p className="mensaje-error" role="alert">{error}</p>}

        <button
          type="submit"
          className="boton-guardar"
          disabled={ocupado}
        >
          {ocupado
            ? 'Procesando…'
            : clienteEditando
              ? 'Actualizar cliente'
              : 'Guardar cliente'}
        </button>

        {clienteEditando && (
          <button
            type="button"
            className="boton-editar"
            onClick={onCancelar}
            disabled={ocupado}
          >
            Cancelar edición
          </button>
        )}
      </form>
    </section>
  )
}