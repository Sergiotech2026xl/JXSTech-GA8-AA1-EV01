import { useEffect, useState } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import VentaForm from './components/VentaForm'
import { listarTodos, solicitar } from './api'

const moneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export default function GestionVentas({ onCerrarSesion, onNavegar }) {
  const [clientes, setClientes] = useState([])
  const [productos, setProductos] = useState([])
  const [ventas, setVentas] = useState([])
  const [detalle, setDetalle] = useState(null)
  const [pagina, setPagina] = useState(1)
  const [total, setTotal] = useState(0)
  const [version, setVersion] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [errorCarga, setErrorCarga] = useState('')

  useEffect(() => {
    let activo = true

    async function cargar() {
      setCargando(true)
      setErrorCarga('')

      try {
        const [listaClientes, listaProductos, listado] = await Promise.all([
          listarTodos('/clientes'),
          listarTodos('/productos'),
          solicitar(`/ventas?pagina=${pagina}&limite=20`),
        ])

        if (activo) {
          setClientes(listaClientes.filter((cliente) => cliente.activo))
          setProductos(listaProductos.filter((producto) => producto.activo))
          setVentas(listado.datos)
          setTotal(listado.total)
        }
      } catch (error) {
        if (activo) setErrorCarga(error.message)
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
      const resultado = await solicitar('/ventas', {
        metodo: 'POST',
        datos,
      })

      setMensaje(
        `${resultado.mensaje} Total: ${moneda.format(resultado.datos.totalCOP)}.`,
      )
      setDetalle(resultado.datos)
      setPagina(1)
      setVersion((valor) => valor + 1)
      return true
    } catch (error) {
      setError(error.message)
      return false
    } finally {
      setOcupado(false)
    }
  }

  async function consultar(venta) {
    setOcupado(true)
    setError('')

    try {
      const resultado = await solicitar(`/ventas/${venta._id}`)
      setDetalle(resultado.datos)
    } catch (error) {
      setError(error.message)
    } finally {
      setOcupado(false)
    }
  }

  async function anular(venta) {
    const motivo = window.prompt(
      `Motivo para anular la venta ${venta.referencia} (5 a 200 caracteres):`,
    )

    if (motivo === null) return

    if (motivo.trim().length < 5 || motivo.trim().length > 200) {
      setError('El motivo debe tener entre 5 y 200 caracteres.')
      return
    }

    setOcupado(true)
    setMensaje('')
    setError('')

    try {
      const resultado = await solicitar(`/ventas/${venta._id}/anular`, {
        metodo: 'PATCH',
        datos: { motivo: motivo.trim() },
      })

      setMensaje(resultado.mensaje)
      setDetalle(resultado.datos)
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
          pantalla="ventas"
        />

        <main className="contenido">
          <h2>Gestión de ventas</h2>
          <p>Las ventas descuentan inventario; sus anulaciones restituyen unidades.</p>
          {mensaje && <p role="status">{mensaje}</p>}
          {error && <p className="mensaje-error" role="alert">{error}</p>}

          {errorCarga ? (
            <>
              <p className="mensaje-error" role="alert">{errorCarga}</p>
              <button
                type="button"
                className="boton-editar"
                disabled={ocupado}
                onClick={() => setVersion((valor) => valor + 1)}
              >
                Reintentar carga
              </button>
            </>
          ) : (
            <>
              {cargando && <p role="status">Actualizando datos…</p>}

              <VentaForm
                clientes={clientes}
                productos={productos}
                onGuardar={guardar}
                ocupado={ocupado || cargando}
              />

              <section className="formulario-card" style={{ maxWidth: '100%' }}>
                <h3>Ventas registradas</h3>

                {ventas.length === 0 ? (
                  <p>No hay ventas registradas.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', textAlign: 'left' }}>
                      <thead>
                        <tr>
                          <th>Referencia</th>
                          <th>Cliente</th>
                          <th>Total</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventas.map((venta) => (
                          <tr key={venta._id}>
                            <td>{venta.referencia}</td>
                            <td>{venta.cliente.nombre} {venta.cliente.apellido}</td>
                            <td>{moneda.format(venta.totalCOP)}</td>
                            <td>{venta.estado}</td>
                            <td>
                              <button
                                type="button"
                                className="boton-editar"
                                disabled={ocupado || cargando}
                                onClick={() => consultar(venta)}
                              >
                                Ver detalle
                              </button>
                              <button
                                type="button"
                                className="boton-eliminar"
                                disabled={ocupado || cargando || venta.estado !== 'registrada'}
                                onClick={() => anular(venta)}
                              >
                                Anular
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <p>Página {pagina} · Total: {total} ventas</p>
                <button
                  type="button"
                  className="boton-editar"
                  disabled={pagina === 1 || ocupado || cargando}
                  onClick={() => setPagina((valor) => valor - 1)}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="boton-editar"
                  disabled={pagina * 20 >= total || ocupado || cargando}
                  onClick={() => setPagina((valor) => valor + 1)}
                >
                  Siguiente
                </button>
              </section>
            </>
          )}

          {detalle && (
            <section className="formulario-card">
              <h3>Detalle de venta: {detalle.referencia}</h3>
              <p>Fecha: {new Date(detalle.fecha).toLocaleString('es-CO')}</p>
              <p>Cliente: {detalle.cliente.nombre} {detalle.cliente.apellido}</p>
              <p>Documento: {detalle.cliente.documento}</p>
              <p>Medio de pago: {detalle.medioPago}</p>
              <p>Estado: {detalle.estado}</p>

              <ul>
                {detalle.items.map((item) => (
                  <li key={item.productoId} style={{ margin: '12px 20px' }}>
                    {item.sku} — {item.nombre} ·
                    {' '}{item.cantidad} × {moneda.format(item.precioUnitarioCOP)}
                    {' '}= {moneda.format(item.subtotalCOP)}
                  </li>
                ))}
              </ul>

              <p>Total: {moneda.format(detalle.totalCOP)}</p>
              {detalle.motivoAnulacion && (
                <p>Motivo de anulación: {detalle.motivoAnulacion}</p>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  )
}