import { useState } from 'react'
import DisposicionAutenticacion from './disposicion-autenticacion.jsx'

function RestablecerContrasena() {
  // Guarda la contraseña nueva ingresada en el primer campo.
  const [contrasena, setContrasena] = useState('')
  // Guarda el segundo ingreso para comprobar que coincida con la contraseña.
  const [confirmacion, setConfirmacion] = useState('')
  // Contiene el mensaje que se presenta después de validar el formulario.
  const [aviso, setAviso] = useState('')
  // Indica si el aviso corresponde a un error de validación.
  const [hayError, setHayError] = useState(false)

  // Comprueba los campos y evita continuar si las contraseñas no coinciden.
  function gestionarEnvio(evento) {
    evento.preventDefault()

    if (contrasena !== confirmacion) {
      setHayError(true)
      setAviso('Las contraseñas no coinciden. Verifica los dos campos.')
      return
    }

    // Lee el token de recuperación incluido en la dirección enviada por correo.
    const tokenRecuperacion = new URLSearchParams(window.location.search).get('token')
    setHayError(false)

    // El token solo se podrá validar y la contraseña guardar cuando exista un backend.
    setAviso(
      tokenRecuperacion
        ? 'El enlace contiene un token, pero todavía no se ha validado ni se ha cambiado la contraseña. Falta conectar el backend.'
        : 'No se encontró un token en el enlace. Abre el enlace de recuperación que recibiste por correo.',
    )
  }

  // Actualiza la contraseña nueva según lo que se escribe en el primer campo.
  function actualizarContrasena(evento) {
    setContrasena(evento.target.value)
  }

  // Actualiza el texto de confirmación escrito en el segundo campo.
  function actualizarConfirmacion(evento) {
    setConfirmacion(evento.target.value)
  }

  return (
    <DisposicionAutenticacion
      icono={
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="5" y="10" width="14" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          <path d="M12 14v3" />
        </svg>
      }
      titulo="Crea una nueva contraseña"
      descripcion="Elige una contraseña segura para volver a acceder a tu cuenta."
      pie={
        <p>
          ¿No tienes un enlace?{' '}
          <a href="/recuperacion-contrasena">Solicita uno nuevo</a>
        </p>
      }
    >
      <form className="formulario-autenticacion" onSubmit={gestionarEnvio}>
        <label htmlFor="contrasena-nueva">Nueva contraseña</label>
        <input
          id="contrasena-nueva"
          name="contrasena"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          minLength={8}
          value={contrasena}
          onChange={actualizarContrasena}
          required
        />

        <label htmlFor="confirmacion-contrasena">Confirma la contraseña</label>
        <input
          id="confirmacion-contrasena"
          name="confirmacion-contrasena"
          type="password"
          autoComplete="new-password"
          placeholder="Escribe la contraseña de nuevo"
          minLength={8}
          value={confirmacion}
          onChange={actualizarConfirmacion}
          required
        />

        <p className="texto-guia">Usa al menos 8 caracteres.</p>
        <button type="submit">Guardar nueva contraseña</button>
        {aviso && (
          <p className={`aviso-formulario${hayError ? ' aviso-error' : ''}`} role={hayError ? 'alert' : 'status'}>
            {aviso}
          </p>
        )}
      </form>

      <a className="enlace-volver" href="/recuperacion-contrasena">
        <span aria-hidden="true">←</span> Volver a recuperación
      </a>
    </DisposicionAutenticacion>
  )
}

export default RestablecerContrasena