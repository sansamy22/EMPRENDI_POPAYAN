// Comparte la estructura visual entre las pantallas de recuperación y restablecimiento.
function DisposicionAutenticacion({
  icono, // Elemento visual que identifica la pantalla.
  titulo, // Encabezado principal de la tarjeta.
  descripcion, // Explicación breve debajo del encabezado.
  children: contenido, // Formulario o contenido específico de cada pantalla.
  pie, // Enlaces de ayuda ubicados al final de la tarjeta.
}) {
  return (
    <main className="pagina-autenticacion">
      <header className="barra-superior">
        <a className="marca" href="/" aria-label="Emprendi Popayán, inicio">
          <span className="iniciales-marca" aria-hidden="true">EP</span>
          <span>Emprendi <strong>Popayán</strong></span>
        </a>
        <span className="nota-barra">Centro de ayuda</span>
      </header>

      <div className="contenido-autenticacion">
        <section className="tarjeta-autenticacion" aria-labelledby="titulo-autenticacion">
          <div className="icono-autenticacion" aria-hidden="true">{icono}</div>
          <p className="etiqueta-seccion">Acceso a tu cuenta</p>
          <h1 id="titulo-autenticacion">{titulo}</h1>
          <p className="descripcion-autenticacion">{descripcion}</p>
          {contenido}
          <div className="pie-tarjeta">{pie}</div>
        </section>

        <p className="texto-secundario">Emprende, conecta y crece en Popayán.</p>
      </div>
    </main>
  )
}

export default DisposicionAutenticacion
