import { useEffect, useState } from 'react'
import './App.css'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ClienteForm from './components/ClienteForm'
import ClienteTable from './components/ClienteTable'
import { solicitar } from './api'

export default function GestionClientes({ onCerrarSesion, onNavegar }) {
  const [clientes, setClientes] = useState([])
  const [clienteEditando, setClienteEditando] = useState(null)
  const [pagina, setPagina] = useState(1)
  const [total, setTotal] = useState(0)
  const [version, setVersion] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  // Consulta una página de clientes directamente en la API.
  useEffect(() => {
    let activo = true

    async function cargar() {
      setCargando(true)
      setError('')

      try {
        const resultado = await solicitar(
          `/clientes?pagina=${pagina}&limite=20`,
        )

        if (activo) {
          setClientes(resultado.datos)
          setTotal(resultado.total)
        }
      } catch (error) {
        if (activo) setError(error.message)
      } finally {
        if (activo) setCargando(false)
      }
    }

    cargar()

    return () => {
      activo = false
    }
  }, [pagina, version])

  // Guarda únicamente los campos que admite el backend.
  async function guardarCliente(datos) {
    setOcupado(true)
    setMensaje('')
    setError('')

    try {
      const resultado = await solicitar(
        clienteEditando ? `/clientes/${clienteEditando._id}` : '/clientes',
        {
          metodo: clienteEditando ? 'PUT' : 'POST',
          datos,
        },
      )

      setClienteEditando(null)
      setMensaje(resultado.mensaje)
      setVersion((valor) => valor + 1)
      return true
    } catch (error) {
      setError(error.message)
      return false
    } finally {
      setOcupado(false)
    }
  }

  async function cambiarEstado(cliente) {
    const accion = cliente.activo ? 'desactivar' : 'reactivar'

    if (!window.confirm(
      `¿Deseas ${accion} al cliente ${cliente.nombre} ${cliente.apellido}?`,
    )) {
      return
    }

    setOcupado(true)
    setMensaje('')
    setError('')

    try {
      const resultado = await solicitar(
        cliente.activo
          ? `/clientes/${cliente._id}`
          : `/clientes/${cliente._id}/activar`,
        { metodo: cliente.activo ? 'DELETE' : 'PATCH' },
      )

      setClienteEditando(null)
      setMensaje(resultado.mensaje)
      setVersion((valor) => valor + 1)
    } catch (error) {
      setError(error.message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="app">
      <Header />

      <div className="layout">
        <Sidebar
  onCerrarSesion={onCerrarSesion}
  onNavegar={onNavegar}
  pantalla="clientes"
/>

        <main className="contenido">
          <h2>Gestión de clientes</h2>
          <p>Registra y consulta los clientes de JXS Tech.</p>

          {mensaje && <p role="status">{mensaje}</p>}
          {error && <p className="mensaje-error" role="alert">{error}</p>}

          <ClienteForm
            key={clienteEditando?._id || 'nuevo'}
            clienteEditando={clienteEditando}
            onGuardar={guardarCliente}
            onCancelar={() => setClienteEditando(null)}
            ocupado={ocupado}
          />

          {cargando ? (
            <p role="status">Cargando clientes…</p>
          ) : error ? (
            <button
              type="button"
              className="boton-editar"
              onClick={() => setVersion((valor) => valor + 1)}
              disabled={ocupado}
            >
              Actualizar listado
            </button>
          ) : (
            <>
              <ClienteTable
                clientes={clientes}
                onEditar={setClienteEditando}
                onCambiarEstado={cambiarEstado}
                ocupado={ocupado}
              />

              <p>Página {pagina} · Total: {total} clientes</p>

              <button
                type="button"
                className="boton-editar"
                disabled={pagina === 1 || ocupado}
                onClick={() => {
                  setClienteEditando(null)
                  setPagina((valor) => valor - 1)
                }}
              >
                Anterior
              </button>

              <button
                type="button"
                className="boton-editar"
                disabled={pagina * 20 >= total || ocupado}
                onClick={() => {
                  setClienteEditando(null)
                  setPagina((valor) => valor + 1)
                }}
              >
                Siguiente
              </button>
            </>
          )}
        </main>
      </div>
    </div>
  )
}