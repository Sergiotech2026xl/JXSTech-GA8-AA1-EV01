import { useState } from 'react'

const moneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export default function VentaForm({
  clientes,
  productos,
  onGuardar,
  ocupado,
}) {
  const [referencia, setReferencia] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [medioPago, setMedioPago] = useState('efectivo')
  const [productoId, setProductoId] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  function agregar() {
    setError('')
    const producto = productos.find((dato) => dato._id === productoId)
    const unidades = Number(cantidad)

    if (!producto) {
      setError('Selecciona un producto.')
      return
    }

    if (
      !Number.isSafeInteger(unidades) ||
      unidades < 1 ||
      unidades > 1000000
    ) {
      setError('La cantidad debe ser un entero entre 1 y 1.000.000.')
      return
    }

    const existente = items.find((item) => item.productoId === productoId)

    if (existente && existente.cantidad + unidades > 1000000) {
      setError('La cantidad acumulada supera el máximo permitido.')
      return
    }

    if (!existente && items.length >= 50) {
      setError('La venta admite máximo 50 productos distintos.')
      return
    }

    setItems((anteriores) => (
      existente
        ? anteriores.map((item) => (
            item.productoId === productoId
              ? { ...item, cantidad: item.cantidad + unidades }
              : item
          ))
        : [
            ...anteriores,
            {
              productoId,
              sku: producto.sku,
              nombre: producto.nombre,
              precioCOP: producto.precioCOP,
              cantidad: unidades,
            },
          ]
    ))

    setProductoId('')
    setCantidad('1')
  }

  async function enviar(evento) {
    evento.preventDefault()
    setError('')

    const codigo = referencia.trim().toUpperCase()

    if (!/^[A-Z0-9_-]{3,64}$/.test(codigo)) {
      setError('La referencia debe tener entre 3 y 64 letras, números o guiones.')
      return
    }

    if (items.length === 0) {
      setError('Agrega al menos un producto a la venta.')
      return
    }

    const guardada = await onGuardar({
      referencia: codigo,
      clienteId,
      medioPago,
      items: items.map((item) => ({
        productoId: item.productoId,
        cantidad: item.cantidad,
      })),
    })

    if (guardada) {
      setReferencia('')
      setClienteId('')
      setItems([])
      setProductoId('')
      setCantidad('1')
    }
  }

  const estimado = items.reduce(
    (total, item) => total + item.precioCOP * item.cantidad,
    0,
  )

  return (
    <section className="formulario-card">
      <h3>Registrar venta</h3>

      <form onSubmit={enviar}>
        <div className="form-grid">
          <div className="campo">
            <label htmlFor="venta-referencia">Referencia única</label>
            <input
              id="venta-referencia"
              value={referencia}
              onChange={(evento) => setReferencia(evento.target.value)}
              minLength={3}
              maxLength={64}
              disabled={ocupado}
              required
            />
          </div>

          <div className="campo">
            <label htmlFor="venta-cliente">Cliente</label>
            <select
              id="venta-cliente"
              value={clienteId}
              onChange={(evento) => setClienteId(evento.target.value)}
              disabled={ocupado}
              required
            >
              <option value="">Selecciona un cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente._id} value={cliente._id}>
                  {cliente.nombre} {cliente.apellido} — {cliente.documento}
                </option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="venta-pago">Medio de pago</label>
            <select
              id="venta-pago"
              value={medioPago}
              onChange={(evento) => setMedioPago(evento.target.value)}
              disabled={ocupado}
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
          </div>

          <div className="campo">
            <label htmlFor="venta-producto">Producto para agregar</label>
            <select
              id="venta-producto"
              value={productoId}
              onChange={(evento) => setProductoId(evento.target.value)}
              disabled={ocupado}
            >
              <option value="">Selecciona un producto</option>
              {productos.map((producto) => (
                <option key={producto._id} value={producto._id}>
                  {producto.sku} — {producto.nombre}
                  {' '}({producto.stock} disponibles)
                </option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="venta-cantidad">Cantidad para agregar</label>
            <input
              id="venta-cantidad"
              type="number"
              min="1"
              max="1000000"
              step="1"
              value={cantidad}
              onChange={(evento) => setCantidad(evento.target.value)}
              disabled={ocupado}
            />
          </div>
        </div>

        <button
          type="button"
          className="boton-guardar"
          onClick={agregar}
          disabled={ocupado}
        >
          Agregar producto
        </button>

        {error && <p className="mensaje-error" role="alert">{error}</p>}

        <ul>
          {items.map((item) => (
            <li key={item.productoId} style={{ margin: '15px 20px' }}>
              {item.sku} — {item.nombre} · {item.cantidad} unidades ·
              {' '}{moneda.format(item.precioCOP * item.cantidad)}
              {' '}
              <button
                type="button"
                className="boton-eliminar"
                disabled={ocupado}
                onClick={() => setItems((anteriores) => (
                  anteriores.filter((dato) => dato.productoId !== item.productoId)
                ))}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>

        <p>Total estimado: {moneda.format(estimado)}</p>
        <p>El servidor confirma el total con los precios vigentes.</p>

        <button
          type="submit"
          className="boton-guardar"
          disabled={ocupado || items.length === 0}
        >
          {ocupado ? 'Procesando…' : 'Registrar venta'}
        </button>
      </form>
    </section>
  )
}