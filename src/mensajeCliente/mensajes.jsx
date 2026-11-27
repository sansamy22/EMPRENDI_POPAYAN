import "./mensajes.css";

export default function Mensajes() {
  return (
    <div className="mensajes-wrapper">
      <header className="topbar">
        <h1>EmprendiPOP · Mensajes y clientes potenciales</h1>
        <span className="badge">Panel Emprendedor</span>
      </header>

      <main className="layout">
        {/* Bandeja de mensajes */}
        <aside className="inbox">
          <div className="inbox-top">
            <h2>Bandeja de mensajes</h2>
            <div className="filters">
              <button type="button" className="active">Nuevos</button>
              <button type="button">Pendientes</button>
              <button type="button">Respondidos</button>
            </div>
          </div>

          <ul className="chat-list">
            <li className="chat-item active">
              <strong>
                Camila Muñoz <span className="tag new">Nuevo</span>{" "}
                <span className="tag lead">★ Interesado</span>
              </strong>
              <p>Hola, ¿tienen disponibilidad hoy en Popayán?</p>
            </li>
            <li className="chat-item">
              <strong>
                Laura Valencia <span className="tag pending">Pendiente</span>
              </strong>
              <p>Quedo atenta a la ubicación del local.</p>
            </li>
            <li className="chat-item">
              <strong>
                Santiago Gómez <span className="tag done">Respondido</span>
              </strong>
              <p>Gracias por enviarme el catálogo.</p>
            </li>
          </ul>
        </aside>

        {/* Conversación activa */}
        <section className="chat">
          <div className="chat-header">
            <div>
              <h3>Camila Muñoz</h3>
              <small>Cliente potencial · Popayán</small>
            </div>
            <div className="actions">
              <button type="button" className="btn-lead">★ Interesado</button>
              <button type="button">Bloquear</button>
              <button type="button" className="btn-danger">Reportar</button>
            </div>
          </div>

          <div className="messages">
            <div className="msg in">
              Hola, ¿tienen disponibilidad hoy y dónde están ubicados?
            </div>
            <div className="msg out">
              Hola, gracias por escribirnos. ¿Qué producto te interesa?
            </div>
          </div>

          <div className="tools">
            <div className="row">
              <button type="button" className="btn-tool">📄 Enviar catálogo</button>
              <button type="button" className="btn-tool">📍 Enviar ubicación</button>
              <button type="button" className="btn-tool">🕒 Enviar horario</button>
            </div>

            <div className="row">
              <button type="button" className="chip">
                Hola, gracias por escribirnos. ¿Qué producto te interesa?
              </button>
              <button type="button" className="chip">
                Sí, tenemos disponibilidad.
              </button>
              <button type="button" className="chip">
                Nuestro horario de atención es…
              </button>
              <button type="button" className="chip">
                Te comparto la ubicación.
              </button>
              <button type="button" className="chip">
                El valor del producto es…
              </button>
            </div>

            <form className="composer" onSubmit={(e) => e.preventDefault()}>
              <input type="text" placeholder="Escribe un mensaje..." />
              <button type="submit">Enviar</button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}