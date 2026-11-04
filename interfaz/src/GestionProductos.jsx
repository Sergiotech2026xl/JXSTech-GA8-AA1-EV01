import { useEffect, useState } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ProductoForm from './components/ProductoForm'
import { solicitar } from './api'

const moneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export default function GestionProductos({ onCerrarSesion, onNavegar }) {
  const [productos, setProductos] = useState([])
  const [editando, setEditando] = useState(null)
  const [pagina, setPagina] = useState(1)
  const [total, setTotal] = useState(0)
  const [version, setVersion] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true

    async function cargar() {
      setCargando(true)
      setError('')

      try {
        const resultado = await solicitar(
          `/productos?pagina=${pagina}&limite=20`,
        )
        if (activo) {
          setProductos(resultado.datos)
          setTotal(resultado.total)
        }
      } catch (error) {
        if (activo) setError(error.message)
      } finally {
        if (activo) setCargando(false)
      }
    }

    cargar()
    return () => { activo = false }
  }, [pagina, version])

  async function guardar(datos) {
    setOcupado(true)
    setMensaje('')
    setError('')

    try {
      const resultado = await solicitar(
        editando ? `/productos/${editando._id}` : '/productos',
        { metodo: editando ? 'PUT' : 'POST', datos },
      )
      setEditando(null)
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

  async function cambiarEstado(producto) {
    const accion = producto.activo ? 'desactivar' : 'reactivar'
    if (!window.confirm(`¿Deseas ${accion} el producto ${producto.nombre}?`)) {
      return
    }

    setOcupado(true)
    setMensaje('')
    setError('')

    try {
      const resultado = await solicitar(
        producto.activo
          ? `/productos/${producto._id}`
          : `/productos/${producto._id}/activar`,
        { metodo: producto.activo ? 'DELETE' : 'PATCH' },
      )
      setEditando(null)
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
          pantalla="productos"
        />

        <main className="contenido">
          <h2>Gestión de productos</h2>
          <p>Los productos se registran con existencias en cero.</p>
          {mensaje && <p role="status">{mensaje}</p>}
          {error && <p className="mensaje-error" role="alert">{error}</p>}

          <ProductoForm
            key={editando?._id || 'nuevo'}
            producto={editando}
            onGuardar={guardar}
            onCancelar={() => setEditando(null)}
            ocupado={ocupado}
          />

          <section className="formulario-card" style={{ maxWidth: '100%' }}>
            <h3>Productos registrados</h3>

            {cargando ? (
              <p role="status">Cargando productos…</p>
            ) : error && productos.length === 0 ? (
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
                {productos.length === 0 ? (
                  <p>No hay productos registrados.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', textAlign: 'left' }}>
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Producto</th>
                          <th>Categoría</th>
                          <th>Marca</th>
                          <th>Precio</th>
                          <th>Existencias</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productos.map((producto) => (
                          <tr key={producto._id}>
                            <td>{producto.sku}</td>
                            <td>{producto.nombre}</td>
                            <td>{producto.categoria === 'reloj' ? 'Reloj' : 'Audífonos'}</td>
                            <td>{producto.marca}</td>
                            <td>{moneda.format(producto.precioCOP)}</td>
                            <td>{producto.stock}</td>
                            <td>{producto.activo ? 'Activo' : 'Inactivo'}</td>
                            <td>
                              <button
                                type="button"
                                className="boton-editar"
                                onClick={() => setEditando(producto)}
                                disabled={ocupado || !producto.activo}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="boton-eliminar"
                                onClick={() => cambiarEstado(producto)}
                                disabled={ocupado}
                              >
                                {producto.activo ? 'Desactivar' : 'Reactivar'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <p>Página {pagina} · Total: {total} productos</p>
                <button
                  type="button"
                  className="boton-editar"
                  disabled={pagina === 1 || ocupado}
                  onClick={() => {
                    setEditando(null)
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
                    setEditando(null)
                    setPagina((valor) => valor + 1)
                  }}
                >
                  Siguiente
                </button>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}