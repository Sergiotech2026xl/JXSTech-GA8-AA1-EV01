const OPCIONES = [
  { id: 'clientes', nombre: 'Clientes' },
  { id: 'productos', nombre: 'Productos' },
  { id: 'inventario', nombre: 'Inventario' },
  { id: 'ventas', nombre: 'Ventas' },
]

export default function Sidebar({
  onCerrarSesion,
  onNavegar,
  pantalla = 'clientes',
}) {
  return (
    <aside className="sidebar">
      <nav className="menu" aria-label="Menú principal">
        {OPCIONES.map((opcion) => (
          <button
            key={opcion.id}
            type="button"
            className={pantalla === opcion.id ? 'activo' : ''}
            onClick={() => onNavegar(opcion.id)}
          >
            {opcion.nombre}
          </button>
        ))}

        <button
          type="button"
          className="cerrar-sesion"
          onClick={onCerrarSesion}
        >
          Cerrar sesión
        </button>
      </nav>
    </aside>
  )
}