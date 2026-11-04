// Componente que muestra el menú lateral de navegación de JXS Tech.
function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="menu">
        <button type="button">Panel</button>
        <button type="button" className="activo">Clientes</button>
        <button type="button">Productos</button>
        <button type="button">Ventas</button>
        <button type="button">Reportes</button>
        <button type="button" className="cerrar-sesion">
          Cerrar sesión
        </button>
      </nav>
    </aside>
  )
}

export default Sidebar