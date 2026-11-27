import RecuperacionContrasena from './paginas/recuperacion contraseña/recuperacion-contraseña.jsx'
import RestablecerContrasena from './paginas/recuperacion contraseña/restablecer-contraseña.jsx'
import './paginas/recuperacion contraseña/estilos-autenticacion.css'

function Aplicacion() {
  // Guarda la dirección actual para decidir cuál pantalla de recuperación mostrar.
  const rutaActual = window.location.pathname.replace(/\/+$/, '') || '/'

  if (rutaActual === '/restablecer-contrasena') {
    return <RestablecerContrasena />
  }

  return <RecuperacionContrasena />
}

export default Aplicacion
