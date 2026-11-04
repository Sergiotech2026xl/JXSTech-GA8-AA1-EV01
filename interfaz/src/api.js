// Conserva el token mientras esta pestaña permanezca abierta.
const CLAVE = 'jxstech_token'

export function obtenerToken() {
  return sessionStorage.getItem(CLAVE)
}

export function guardarToken(token) {
  sessionStorage.setItem(CLAVE, token)
}

export function borrarToken() {
  sessionStorage.removeItem(CLAVE)
}

// Comunicación compartida con los servicios del backend.
export async function solicitar(
  ruta,
  { metodo = 'GET', datos, autenticada = true } = {},
) {
  const headers = {}

  if (datos !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const token = obtenerToken()

  if (autenticada && token) {
    headers.Authorization = `Bearer ${token}`
  }

  let respuesta

  try {
    respuesta = await fetch(`/api${ruta}`, {
      method: metodo,
      headers,
      body: datos === undefined ? undefined : JSON.stringify(datos),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor.')
  }

  const contenido = await respuesta.json().catch(() => ({}))

  if (!respuesta.ok) {
    if (respuesta.status === 401 && autenticada) {
      borrarToken()
      window.dispatchEvent(new Event('jxstech-sesion-expirada'))
    }

    throw new Error(
      contenido.mensaje || `Error de solicitud: ${respuesta.status}`,
    )
  }

  return contenido
}