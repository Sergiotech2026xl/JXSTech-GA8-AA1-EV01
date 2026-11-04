import { useEffect, useState } from 'react'
import './App.css'
import Header from './components/Header'
import Acceso from './components/Acceso'
import GestionClientes from './GestionClientes'
import GestionProductos from './GestionProductos'
import { borrarToken, obtenerToken, solicitar } from './api'

export default function App() {
  const [autenticado, setAutenticado] = useState(false)
  const [comprobando, setComprobando] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [pantalla, setPantalla] = useState('clientes')

  // Valida en el servidor la sesión guardada en esta pestaña.
  useEffect(() => {
    let activo = true

    function expirarSesion() {
      setAutenticado(false)
      setPantalla('clientes')
      setMensaje('La sesión terminó. Inicia sesión nuevamente.')
    }

    window.addEventListener('jxstech-sesion-expirada', expirarSesion)

    async function comprobarSesion() {
      try {
        if (obtenerToken()) {
          await solicitar('/usuarios/sesion')
          if (activo) setAutenticado(true)
        }
      } catch (error) {
        if (activo) setMensaje(error.message)
      } finally {
        if (activo) setComprobando(false)
      }
    }

    comprobarSesion()

    return () => {
      activo = false
      window.removeEventListener('jxstech-sesion-expirada', expirarSesion)
    }
  }, [])

  function entrar() {
    setMensaje('')
    setPantalla('clientes')
    setAutenticado(true)
  }

  // Invalida la sesión en el servidor y elimina el token local.
  async function cerrarSesion() {
    try {
      await solicitar('/usuarios/logout', { metodo: 'POST' })
      borrarToken()
      setAutenticado(false)
      setPantalla('clientes')
      setMensaje('Sesión cerrada correctamente.')
    } catch (error) {
      setMensaje(error.message)
    }
  }

  if (comprobando) {
    return <p role="status">Comprobando sesión…</p>
  }

  return (
    <>
      {mensaje && <p role="status">{mensaje}</p>}

      {autenticado ? (
        pantalla === 'productos' ? (
          <GestionProductos
            onCerrarSesion={cerrarSesion}
            onNavegar={setPantalla}
          />
        ) : (
          <GestionClientes
            onCerrarSesion={cerrarSesion}
            onNavegar={setPantalla}
          />
        )
      ) : (
        <div className="app">
          <Header />
          <Acceso onEntrar={entrar} />
        </div>
      )}
    </>
  )
}