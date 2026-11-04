import { useState } from 'react'
import './App.css'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ClienteForm from './components/ClienteForm'
import ClienteTable from './components/ClienteTable'

// Componente principal de la aplicación JXS Tech.
function App() {
  // Estado que almacena la lista de clientes registrados.
  const [clientes, setClientes] = useState([])

  // Guarda temporalmente el cliente que se está editando.
  const [clienteEditando, setClienteEditando] = useState(null)

  // Agrega un nuevo cliente a la lista.
  function agregarCliente(nuevoCliente) {
    setClientes([...clientes, nuevoCliente])
  }

  // Elimina un cliente según su identificador.
 // Elimina un cliente después de solicitar confirmación.
function eliminarCliente(id) {
  const confirmar = window.confirm(
    '¿Está seguro de que desea eliminar este cliente?'
  )

  if (confirmar) {
    setClientes(
      clientes.filter((cliente) => cliente.id !== id)
    )
  }
}

  // Selecciona el cliente que se desea editar.
  function editarCliente(cliente) {
    setClienteEditando(cliente)
  }
// Cancela la edición del cliente seleccionado.
function cancelarEdicion() {
  setClienteEditando(null)
}
  // Actualiza la información de un cliente existente.
  function actualizarCliente(clienteActualizado) {
    setClientes(
      clientes.map((cliente) =>
        cliente.id === clienteActualizado.id
          ? clienteActualizado
          : cliente
      )
    )

    // Finaliza el modo de edición.
    setClienteEditando(null)
  }

  return (
    <div className="app">
      <Header />

      <div className="layout">
        <Sidebar />

        <main className="contenido">
          <h2>Gestión de clientes</h2>
          <p>Administra los clientes registrados en el sistema.</p>

          <ClienteForm
  onAgregarCliente={agregarCliente}
  clienteEditando={clienteEditando}
  onActualizarCliente={actualizarCliente}
  onCancelarEdicion={cancelarEdicion}
/>
          <ClienteTable
            clientes={clientes}
            onEliminarCliente={eliminarCliente}
            onEditarCliente={editarCliente}
          />
        </main>
      </div>
    </div>
  )
}

export default App