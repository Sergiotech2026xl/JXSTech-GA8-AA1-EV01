export default function Sidebar({
  onCerrarSesion,
  onNavegar,
  pantalla = 'clientes',
}) {
  return (
    <aside className="sidebar">
      <nav className="menu" aria-label="Menú principal">
        <button
          type="button"
          className={pantalla === 'clientes' ? 'activo' : ''}
          onClick={() => onNavegar('clientes')}
        >
          Clientes
        </button>

        <button
          type="button"
          className={pantalla === 'productos' ? 'activo' : ''}
          onClick={() => onNavegar('productos')}
        >
          Productos
        </button>

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