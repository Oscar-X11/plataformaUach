import { ChevronDown } from "lucide-react";

export const metadata = { title: "Centro de ayuda" };

interface Question {
  q: string;
  a: React.ReactNode;
}

const SECTIONS: { id: string; title: string; questions: Question[] }[] = [
  {
    id: "cuenta",
    title: "Tu cuenta",
    questions: [
      {
        q: "¿Cómo entro por primera vez?",
        a: (
          <>
            La escuela crea tu cuenta al importar la lista oficial de alumnos. Tu usuario es tu matrícula y la contraseña
            inicial te la da Servicios Escolares. Al entrar, la plataforma te pide cambiarla por una propia.
          </>
        ),
      },
      {
        q: "Olvidé mi contraseña",
        a: (
          <>
            La plataforma no usa correo, así que no hay enlace de recuperación. Acude a la administración: te generan una
            contraseña temporal y la cambias al entrar. Al restablecerla se cierran tus sesiones abiertas.
          </>
        ),
      },
      {
        q: "¿Cómo cambio mi contraseña o mi foto?",
        a: <>En «Mi perfil». Al cambiar la contraseña se cierran las sesiones abiertas en otros dispositivos.</>,
      },
      {
        q: "¿Cuánto dura mi sesión?",
        a: (
          <>
            Mientras uses la plataforma, la sesión se renueva sola. Si la dejas sin usar 8 horas, tendrás que volver a
            entrar. En una computadora compartida, cierra sesión desde el menú de tu nombre.
          </>
        ),
      },
    ],
  },
  {
    id: "alumnos",
    title: "Alumnos",
    questions: [
      {
        q: "¿Cómo me uno a una clase?",
        a: <>En «Mis cursos», con el código de invitación que te comparte tu docente.</>,
      },
      {
        q: "¿Cómo entrego una tarea?",
        a: (
          <>
            Abre la tarea, adjunta tus archivos (hasta 5, de 10 MB cada uno) y pulsa «Entregar». Puedes anular la entrega
            para corregirla mientras no esté calificada. Si entregas después de la fecha, queda como «Entregada tarde».
          </>
        ),
      },
      {
        q: "Una tarea o un cuestionario aparece bloqueado",
        a: (
          <>
            Tu docente puso una condición: se abre en una fecha o después de que completes otra actividad. El candado
            indica cuál. En cuanto la cumples, se desbloquea.
          </>
        ),
      },
      {
        q: "¿Cómo se calcula mi calificación?",
        a: (
          <>
            Es un promedio ponderado de tareas y cuestionarios (por omisión, 60 % y 40 %; tu docente puede cambiarlo).
            Solo cuenta lo ya calificado y devuelto. La preparatoria aprueba con 6; licenciaturas e ingenierías, con 7.
            Lo ves en la pestaña «Calificaciones» de cada clase.
          </>
        ),
      },
      {
        q: "¿Qué significa «Tu progreso»?",
        a: (
          <>
            Cuántas actividades de la clase completaste: tareas entregadas, cuestionarios enviados y materiales abiertos.
            Si tienes dos o más actividades vencidas sin entregar o tu promedio baja del aprobatorio, tu docente lo verá
            como alerta para apoyarte.
          </>
        ),
      },
    ],
  },
  {
    id: "docentes",
    title: "Docentes",
    questions: [
      {
        q: "¿Cómo califico con rúbrica?",
        a: (
          <>
            En la tarea, pulsa «Crear rúbrica» y define criterios con sus niveles y puntos. La tarea vale la suma del mejor
            nivel de cada criterio. Al revisar una entrega, elige un nivel por criterio y la calificación se calcula sola.
            Una vez que calificas con ella, la rúbrica ya no se puede cambiar.
          </>
        ),
      },
      {
        q: "¿Cómo pongo condiciones a una actividad?",
        a: (
          <>
            Al crear o editar una tarea, en «Condiciones de acceso» elige desde qué fecha se ve y si requiere completar otra
            tarea o cuestionario. En los cuestionarios, el requisito está en los ajustes. No se permiten ciclos (A pide B y
            B pide A).
          </>
        ),
      },
      {
        q: "¿Cómo cambio los pesos de la calificación final?",
        a: <>En «Calificaciones», pulsa «Cambiar pesos». Tareas y cuestionarios suman 100 %.</>,
      },
      {
        q: "¿Dónde veo a los alumnos en riesgo?",
        a: (
          <>
            En la pestaña «Seguimiento»: avance, actividades vencidas, calificación final y última actividad de cada
            alumno, más la bitácora de la clase. También te avisa si dos alumnos entregaron el mismo archivo.
          </>
        ),
      },
      {
        q: "¿Puedo usar la misma clase el siguiente periodo?",
        a: (
          <>
            Sí: «Reutilizar clase», en el encabezado. Copia temas, material, tareas con su rúbrica y cuestionarios. Las
            tareas quedan sin fecha y los cuestionarios como borrador; no se copian alumnos.
          </>
        ),
      },
      {
        q: "El periodo cerró y no puedo cambiar una calificación",
        a: <>Es intencional: con el periodo cerrado las calificaciones quedan fijas. Si hace falta, la administración puede reabrirlo.</>,
      },
    ],
  },
  {
    id: "general",
    title: "Uso general",
    questions: [
      {
        q: "¿Cómo busco algo rápido?",
        a: (
          <>
            Usa el buscador de la barra superior o el atajo <kbd className="rounded bg-uach-canvas px-1">Ctrl</kbd> +{" "}
            <kbd className="rounded bg-uach-canvas px-1">K</kbd>. Encuentra clases, tareas, cuestionarios y material.
          </>
        ),
      },
      {
        q: "¿Puedo instalarla en mi celular?",
        a: (
          <>
            Sí. En Android, abre la plataforma en Chrome, menú y «Instalar app». En iPhone, en Safari pulsa «Compartir» y
            luego «Agregar a pantalla de inicio». Se abre como una app, pero necesita conexión a internet.
          </>
        ),
      },
      {
        q: "¿A quién acudo si algo no funciona?",
        a: (
          <>
            A tu docente si es algo de una clase, o a la administración escolar:{" "}
            <a href="mailto:uach@uach.edu.mx" className="font-medium text-uach-teal hover:text-uach-tealDark">
              uach@uach.edu.mx
            </a>{" "}
            · <a href="tel:+529676747700" className="font-medium text-uach-teal hover:text-uach-tealDark">967 674 7700</a>.
          </>
        ),
      },
    ],
  },
];

export default function AyudaPage() {
  return (
    <article className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol sm:text-3xl">Centro de ayuda</h1>
        <p className="mt-2 text-sm text-uach-ink/75">Respuestas a las dudas más comunes sobre la plataforma.</p>
        <nav aria-label="Secciones de la ayuda" className="mt-4 flex flex-wrap gap-2">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-full bg-uach-surface px-3 py-1.5 text-sm font-medium text-uach-ink/80 ring-1 ring-uach-ink/10 hover:text-uach-ink"
            >
              {section.title}
            </a>
          ))}
        </nav>
      </header>

      {SECTIONS.map((section) => (
        <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-6">
          <h2 id={`${section.id}-title`} className="mb-3 text-lg font-semibold text-uach-ink">{section.title}</h2>
          <div className="divide-y divide-uach-ink/[0.06] rounded-2xl bg-uach-surface ring-1 ring-uach-ink/[0.06]">
            {section.questions.map((item) => (
              <details key={item.q} className="group">
                <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-uach-ink [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-uach-ink/50 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="px-4 pb-4 text-sm leading-relaxed text-uach-ink/80">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}
