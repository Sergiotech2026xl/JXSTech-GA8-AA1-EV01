import { useEffect, useState } from 'react'
import './App.css'
import Header from './components/Header'
import Acceso from './components/Acceso'
import GestionClientes from './GestionClientes'
import GestionProductos from './GestionProductos'
import GestionInventario from './GestionInventario'
import { borrarToken, obtenerToken, solicitar } from './api'
import GestionVentas from './GestionVentas'

const PANTALLAS = {
  clientes: GestionClientes,
  productos: GestionProductos,
  inventario: GestionInventario,
  ventas: GestionVentas,
}

export default function App() {
  const [autenticado, setAutenticado] = useState(false)
  const [comprobando, setComprobando] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [pantalla, setPantalla] = useState('clientes')

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

  const Pantalla = PANTALLAS[pantalla] || GestionClientes

  return (
    <>
      {mensaje && <p role="status">{mensaje}</p>}

      {autenticado ? (
        <Pantalla
          onCerrarSesion={cerrarSesion}
          onNavegar={setPantalla}
        />
      ) : (
        <div className="app">
          <Header />
          <Acceso onEntrar={entrar} />
        </div>
      )}
    </>
  )
}