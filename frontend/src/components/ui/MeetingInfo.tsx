/** Partes del texto: los enlaces http(s) se separan para volverlos clicables. */
const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g;

/**
 * Aula o lugar y horario escrito por el docente o el grupo ("Lunes 8:00, salón 12" o un
 * enlace de Meet/Zoom). Los enlaces se abren en otra pestaña; el resto es texto.
 * No usar dentro de otro <a> (por ejemplo, una tarjeta que ya es enlace).
 */
export function MeetingInfo({ text, linkClassName = "" }: { text: string; linkClassName?: string }) {
  const parts = text.split(URL_PATTERN);
  return (
    <span className="min-w-0 break-words">
      {parts.map((part, index) =>
        // split con un grupo de captura deja los enlaces en las posiciones impares.
        index % 2 === 1 ? (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline underline-offset-2 ${linkClassName}`}
          >
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </span>
  );
}
