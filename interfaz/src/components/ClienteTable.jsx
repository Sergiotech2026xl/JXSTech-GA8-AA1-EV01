// Componente encargado de mostrar los clientes registrados.
function ClienteTable({
  clientes,
  onEliminarCliente,
  onEditarCliente,
}) {
  return (
    <section className="tabla-card">
      <h3>Clientes registrados</h3>

      {clientes.length === 0 ? (
        <p className="sin-clientes">
          No hay clientes registrados.
        </p>
      ) : (
        <table className="tabla-clientes">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Documento</th>
              <th>Correo</th>
              <th>Teléfono</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {clientes.map((cliente) => (
              <tr key={cliente.id}>
                <td>{cliente.nombre}</td>
                <td>{cliente.documento}</td>
                <td>{cliente.correo}</td>
                <td>{cliente.telefono}</td>

                <td>
                  <button
                    className="boton-editar"
                    type="button"
                    onClick={() => onEditarCliente(cliente)}
                  >
                    Editar
                  </button>

                  <button
                    className="boton-eliminar"
                    type="button"
                    onClick={() => onEliminarCliente(cliente.id)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

export default ClienteTable