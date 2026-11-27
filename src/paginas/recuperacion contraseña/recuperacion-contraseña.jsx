import { useState } from 'react'
import DisposicionAutenticacion from './disposicion-autenticacion.jsx'

function RecuperacionContrasena() {
  // Conserva el correo que la persona escribe en el campo del formulario.
  const [correo, setCorreo] = useState('')
  // Muestra el resultado informativo después de intentar enviar el formulario.
  const [aviso, setAviso] = useState('')

  // Evita la recarga de la página y muestra que todavía falta conectar el backend.
  function gestionarEnvio(evento) {
    evento.preventDefault()

    // Este aviso evita afirmar que se envió un correo antes de conectar el backend.
    setAviso(
      'El formulario está listo, pero todavía no está conectado al servicio de correo. No se envió ningún enlace.',
    )
  }

  // Actualiza el estado del correo con el texto que se acaba de escribir.
  function actualizarCorreo(evento) {
    setCorreo(evento.target.value)
  }

  return (
    <DisposicionAutenticacion
      icono={
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M3.5 6.5h17v11h-17z" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      }
      titulo="Recupera tu cuenta"
      descripcion="Escribe el correo asociado a tu cuenta y te enviaremos las instrucciones para crear una nueva contraseña."
      pie={
        <p>
          ¿Ya recibiste el enlace?{' '}
          <a href="/restablecer-contrasena">Restablece tu contraseña</a>
        </p>
      }
    >
      <form className="formulario-autenticacion" onSubmit={gestionarEnvio}>
        <label htmlFor="correo-recuperacion">Correo electrónico</label>
        <input
          id="correo-recuperacion"
          name="correo"
          type="email"
          autoComplete="email"
          placeholder="nombre@ejemplo.com"
          value={correo}
          onChange={actualizarCorreo}
          required
        />
        <button type="submit">Enviar instrucciones</button>
        {aviso && <p className="aviso-formulario" role="status">{aviso}</p>}
      </form>

      <a className="enlace-volver" href="/">
        <span aria-hidden="true">←</span> Volver al inicio
      </a>
    </DisposicionAutenticacion>
  )
}

export default RecuperacionContrasena