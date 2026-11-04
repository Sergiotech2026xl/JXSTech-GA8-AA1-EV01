import { useState } from 'react'

const VACIO = {
  sku: '',
  nombre: '',
  categoria: 'reloj',
  marca: '',
  descripcion: '',
  precioCOP: '',
}

export default function ProductoForm({
  producto,
  onGuardar,
  onCancelar,
  ocupado,
}) {
  const [datos, setDatos] = useState(() => (
    producto
      ? {
          sku: producto.sku,
          nombre: producto.nombre,
          categoria: producto.categoria,
          marca: producto.marca,
          descripcion: producto.descripcion || '',
          precioCOP: String(producto.precioCOP),
        }
      : { ...VACIO }
  ))
  const [error, setError] = useState('')

  function cambiar(evento) {
    const { name, value } = evento.target
    setDatos((anteriores) => ({ ...anteriores, [name]: value }))
  }

  async function enviar(evento) {
    evento.preventDefault()
    setError('')

    const nuevos = {
      sku: datos.sku.trim().toUpperCase(),
      nombre: datos.nombre.trim(),
      categoria: datos.categoria,
      marca: datos.marca.trim(),
      descripcion: datos.descripcion.trim(),
      precioCOP: Number(datos.precioCOP),
    }

    if (!/^[A-Z0-9_-]{3,40}$/.test(nuevos.sku)) {
      setError('El SKU debe tener de 3 a 40 letras, números, guiones o guiones bajos.')
      return
    }

    if (nuevos.nombre.length < 3 || nuevos.marca.length < 2) {
      setError('Revisa el nombre y la marca del producto.')
      return
    }

    if (
      !Number.isSafeInteger(nuevos.precioCOP) ||
      nuevos.precioCOP < 1 ||
      nuevos.precioCOP > 1000000000
    ) {
      setError('El precio debe ser un entero entre 1 y 1.000.000.000 pesos.')
      return
    }

    if (await onGuardar(nuevos)) {
      setDatos({ ...VACIO })
    }
  }

  return (
    <section className="formulario-card">
      <h3>{producto ? 'Editar producto' : 'Registrar producto'}</h3>

      <form onSubmit={enviar}>
        <div className="form-grid">
          {[
            { nombre: 'sku', etiqueta: 'SKU / Código del producto', min: 3, max: 40 },
            { nombre: 'nombre', etiqueta: 'Nombre', min: 3, max: 100 },
            { nombre: 'marca', etiqueta: 'Marca', min: 2, max: 60 },
          ].map((campo) => (
            <div className="campo" key={campo.nombre}>
              <label htmlFor={`producto-${campo.nombre}`}>
                {campo.etiqueta}
              </label>
              <input
                id={`producto-${campo.nombre}`}
                name={campo.nombre}
                value={datos[campo.nombre]}
                onChange={cambiar}
                minLength={campo.min}
                maxLength={campo.max}
                disabled={ocupado}
                required
              />
            </div>
          ))}

          <div className="campo">
            <label htmlFor="producto-categoria">Categoría</label>
            <select
              id="producto-categoria"
              name="categoria"
              value={datos.categoria}
              onChange={cambiar}
              disabled={ocupado}
            >
              <option value="reloj">Reloj inteligente</option>
              <option value="audifonos">Audífonos inteligentes</option>
            </select>
          </div>

          <div className="campo">
            <label htmlFor="producto-precio">Precio en pesos colombianos</label>
            <input
              id="producto-precio"
              name="precioCOP"
              type="number"
              min="1"
              max="1000000000"
              step="1"
              value={datos.precioCOP}
              onChange={cambiar}
              disabled={ocupado}
              required
            />
          </div>

          <div className="campo">
            <label htmlFor="producto-descripcion">Descripción opcional</label>
            <input
              id="producto-descripcion"
              name="descripcion"
              value={datos.descripcion}
              onChange={cambiar}
              maxLength={500}
              disabled={ocupado}
            />
          </div>
        </div>

        {error && <p className="mensaje-error" role="alert">{error}</p>}

        <button className="boton-guardar" disabled={ocupado}>
          {ocupado ? 'Procesando…' : producto ? 'Actualizar producto' : 'Guardar producto'}
        </button>

        {producto && (
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