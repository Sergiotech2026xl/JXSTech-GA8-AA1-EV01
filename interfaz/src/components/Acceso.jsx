import { useState } from 'react'
import { guardarToken, solicitar } from '../api'

export default function Acceso({ onEntrar }) {
  const [registro, setRegistro] = useState(false)
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    setMensaje('')
    setOcupado(true)

    try {
      const resultado = await solicitar(
        registro ? '/usuarios/registro' : '/usuarios/login',
        {
          metodo: 'POST',
          datos: { usuario, password },
          autenticada: false,
        },
      )

      setPassword('')

      if (registro) {
        setRegistro(false)
        setMensaje('Cuenta creada. Ahora inicia sesión.')
      } else {
        guardarToken(resultado.token)
        onEntrar()
      }
    } catch (error) {
      setMensaje(error.message)
    } finally {
      setOcupado(false)
    }
  }

  function cambiarModo() {
    setRegistro(!registro)
    setMensaje('')
    setPassword('')
  }

  return (
    <main className="contenido">
      <h2>{registro ? 'Registrar operador' : 'Iniciar sesión'}</h2>
      <p>Acceso al sistema de gestión comercial JXS Tech.</p>

      <form className="formulario-card" onSubmit={enviar}>
        <div className="form-grid">
          <div className="campo">
            <label htmlFor="usuario">Usuario</label>
            <input
              id="usuario"
              value={usuario}
              onChange={(evento) => setUsuario(evento.target.value)}
              autoComplete="username"
              pattern="[a-zA-Z0-9_]{3,30}"
              title="Entre 3 y 30 letras, números o guiones bajos."
              minLength={3}
              maxLength={30}
              disabled={ocupado}
              required
            />
          </div>

          <div className="campo">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(evento) => setPassword(evento.target.value)}
              autoComplete={registro ? 'new-password' : 'current-password'}
              minLength={registro ? 8 : 1}
              maxLength={72}
              disabled={ocupado}
              required
            />
          </div>
        </div>

        <p role="status" aria-live="polite">{mensaje}</p>

        <button className="boton-guardar" disabled={ocupado}>
          {ocupado ? 'Procesando…' : registro ? 'Crear cuenta' : 'Entrar'}
        </button>

        <button
          className="boton-editar"
          type="button"
          onClick={cambiarModo}
          disabled={ocupado}
        >
          {registro ? 'Volver al inicio de sesión' : 'Registrar operador'}
        </button>
      </form>
    </main>
  )
}