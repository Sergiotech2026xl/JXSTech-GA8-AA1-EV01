import { useEffect, useState } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import { solicitar } from './api'

export default function GestionInventario({ onCerrarSesion, onNavegar }) {
  const [productos, setProductos] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [paginaProductos, setPaginaProductos] = useState(1)
  const [paginaMovimientos, setPaginaMovimientos] = useState(1)
  const [totalProductos, setTotalProductos] = useState(0)
  const [totalMovimientos, setTotalMovimientos] = useState(0)
  const [version, setVersion] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [errorCarga, setErrorCarga] = useState('')
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [productoId, setProductoId] = useState('')
  const [tipo, setTipo] = useState('entrada')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')

  // Consulta existencias e historial desde el backend.
  useEffect(() => {
    let activo = true

    async function cargar() {
      setCargando(true)
      setErrorCarga('')

      try {
        const [existencias, historial] = await Promise.all([
          solicitar(`/inventario?pagina=${paginaProductos}&limite=20`),
          solicitar(
            `/inventario/movimientos?pagina=${paginaMovimientos}&limite=20`,
          ),
        ])

        if (activo) {
          setProductos(existencias.datos)
          setTotalProductos(existencias.total)
          setMovimientos(historial.datos)
          setTotalMovimientos(historial.total)
        }
      } catch (error) {
        if (activo) setErrorCarga(error.message)
      } finally {
        if (activo) setCargando(false)
      }
    }

    cargar()
    return () => { activo = false }
  }, [paginaProductos, paginaMovimientos, version])

  async function registrar(evento) {
    evento.preventDefault()
    setError('')
    setMensaje('')

    const unidades = Number(cantidad)
    const razon = motivo.trim()

    if (!Number.isSafeInteger(unidades) || unidades < 1 || unidades > 1000000) {
      setError('La cantidad debe ser un entero entre 1 y 1.000.000.')
      return
    }

    if (razon.length < 5 || razon.length > 200) {
      setError('El motivo debe tener entre 5 y 200 caracteres.')
      return
    }

    setOcupado(true)

    try {
      const resultado = await solicitar('/inventario/movimientos', {
        metodo: 'POST',
        datos: {
          productoId,
          tipo,
          cantidad: unidades,
          motivo: razon,
        },
      })

      setMensaje(
        `${resultado.mensaje} Existencias resultantes: ${resultado.datos.stockPosterior}.`,
      )
      setCantidad('')
      setMotivo('')
      setPaginaMovimientos(1)
      setVersion((valor) => valor + 1)
    } catch (error) {
      setError(error.message)
    } finally {
      setOcupado(false)
    }
  }

  function cambiarPaginaProductos(cambio) {
    setProductoId('')
    setPaginaProductos((valor) => valor + cambio)
  }

  return (
    <div className="app">
      <Header />

      <div className="layout">
        <Sidebar
          onCerrarSesion={onCerrarSesion}
          onNavegar={onNavegar}
          pantalla="inventario"
        />

        <main className="contenido">
          <h2>Gestión de inventario</h2>
          <p>Registra entradas y salidas con su motivo y consulta el historial.</p>

          {mensaje && <p role="status">{mensaje}</p>}
          {error && <p className="mensaje-error" role="alert">{error}</p>}

          {cargando ? (
            <p role="status">Cargando inventario…</p>
          ) : errorCarga ? (
            <>
              <p className="mensaje-error" role="alert">{errorCarga}</p>
              <button
                type="button"
                className="boton-editar"
                onClick={() => setVersion((valor) => valor + 1)}
              >
                Reintentar
              </button>
            </>
          ) : (
            <>
              <section className="formulario-card">
                <h3>Registrar movimiento</h3>

                <form onSubmit={registrar}>
                  <div className="form-grid">
                    <div className="campo">
                      <label htmlFor="movimiento-producto">Producto</label>
                      <select
                        id="movimiento-producto"
                        value={productoId}
                        onChange={(evento) => setProductoId(evento.target.value)}
                        disabled={ocupado}
                        required
                      >
                        <option value="">Selecciona un producto</option>
                        {productos.filter((producto) => producto.activo).map(
                          (producto) => (
                            <option key={producto._id} value={producto._id}>
                              {producto.sku} — {producto.nombre}
                              {' '}({producto.stock} disponibles)
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div className="campo">
                      <label htmlFor="movimiento-tipo">Tipo de movimiento</label>
                      <select
                        id="movimiento-tipo"
                        value={tipo}
                        onChange={(evento) => setTipo(evento.target.value)}
                        disabled={ocupado}
                      >
                        <option value="entrada">Entrada de unidades</option>
                        <option value="salida">Salida de unidades</option>
                      </select>
                    </div>

                    <div className="campo">
                      <label htmlFor="movimiento-cantidad">Cantidad</label>
                      <input
                        id="movimiento-cantidad"
                        type="number"
                        min="1"
                        max="1000000"
                        step="1"
                        value={cantidad}
                        onChange={(evento) => setCantidad(evento.target.value)}
                        disabled={ocupado}
                        required
                      />
                    </div>

                    <div className="campo">
                      <label htmlFor="movimiento-motivo">Motivo</label>
                      <input
                        id="movimiento-motivo"
                        value={motivo}
                        onChange={(evento) => setMotivo(evento.target.value)}
                        minLength={5}
                        maxLength={200}
                        disabled={ocupado}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="boton-guardar"
                    disabled={ocupado}
                  >
                    {ocupado ? 'Procesando…' : 'Registrar movimiento'}
                  </button>
                </form>
              </section>

              <section className="formulario-card" style={{ maxWidth: '100%' }}>
                <h3>Existencias</h3>
                <p>El selector del formulario usa los productos de esta página.</p>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', textAlign: 'left' }}>
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Producto</th>
                        <th>Existencias</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productos.map((producto) => (
                        <tr key={producto._id}>
                          <td>{producto.sku}</td>
                          <td>{producto.nombre}</td>
                          <td>{producto.stock}</td>
                          <td>{producto.activo ? 'Activo' : 'Inactivo'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {productos.length === 0 && <p>No hay productos registrados.</p>}
                <p>Página {paginaProductos} · Total: {totalProductos} productos</p>

                <button
                  type="button"
                  className="boton-editar"
                  disabled={paginaProductos === 1 || ocupado}
                  onClick={() => cambiarPaginaProductos(-1)}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="boton-editar"
                  disabled={paginaProductos * 20 >= totalProductos || ocupado}
                  onClick={() => cambiarPaginaProductos(1)}
                >
                  Siguiente
                </button>
              </section>

              <section className="formulario-card" style={{ maxWidth: '100%' }}>
                <h3>Historial de movimientos</h3>

                {movimientos.length === 0 ? (
                  <p>No hay movimientos registrados.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', textAlign: 'left' }}>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>SKU</th>
                          <th>Tipo</th>
                          <th>Variación</th>
                          <th>Saldo anterior</th>
                          <th>Saldo posterior</th>
                          <th>Motivo</th>
                          <th>Operador</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movimientos.map((movimiento) => (
                          <tr key={movimiento._id}>
                            <td>{new Date(movimiento.fecha).toLocaleString('es-CO')}</td>
                            <td>{movimiento.sku}</td>
                            <td>{movimiento.tipo}</td>
                            <td>{movimiento.variacion}</td>
                            <td>{movimiento.stockAnterior}</td>
                            <td>{movimiento.stockPosterior}</td>
                            <td>{movimiento.motivo}</td>
                            <td>{movimiento.operadorId}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <p>Página {paginaMovimientos} · Total: {totalMovimientos} movimientos</p>
                <button
                  type="button"
                  className="boton-editar"
                  disabled={paginaMovimientos === 1 || ocupado}
                  onClick={() => setPaginaMovimientos((valor) => valor - 1)}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="boton-editar"
                  disabled={paginaMovimientos * 20 >= totalMovimientos || ocupado}
                  onClick={() => setPaginaMovimientos((valor) => valor + 1)}
                >
                  Siguiente
                </button>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}