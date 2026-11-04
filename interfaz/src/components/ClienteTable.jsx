export default function ClienteTable({
  clientes,
  onEditar,
  onCambiarEstado,
  ocupado,
}) {
  return (
    <section className="formulario-card" style={{ maxWidth: '100%' }}>
      <h3>Clientes registrados</h3>

      {clientes.length === 0 ? (
        <p>No hay clientes registrados.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Documento</th>
                <th>Correo</th>
                <th>Teléfono</th>
                <th>Dirección</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente._id}>
                  <td>{cliente.nombre} {cliente.apellido}</td>
                  <td>{cliente.documento}</td>
                  <td>{cliente.correo}</td>
                  <td>{cliente.telefono}</td>
                  <td>{cliente.direccion}</td>
                  <td>{cliente.activo ? 'Activo' : 'Inactivo'}</td>

                  <td>
                    <button
                      type="button"
                      className="boton-editar"
                      onClick={() => onEditar(cliente)}
                      disabled={ocupado || !cliente.activo}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className={
                        cliente.activo ? 'boton-eliminar' : 'boton-editar'
                      }
                      onClick={() => onCambiarEstado(cliente)}
                      disabled={ocupado}
                    >
                      {cliente.activo ? 'Desactivar' : 'Reactivar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}