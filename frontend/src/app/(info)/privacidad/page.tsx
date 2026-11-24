export const metadata = { title: "Aviso de privacidad" };

/**
 * Aviso de privacidad simplificado e integral. BORRADOR redactado con los datos
 * que trata la plataforma: debe revisarlo el área jurídica de la universidad
 * antes de considerarse oficial.
 */
export default function PrivacidadPage() {
  const h2 = "mt-8 text-lg font-semibold text-uach-ink";
  const p = "mt-2 text-sm leading-relaxed text-uach-ink/85";
  const ul = "mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-uach-ink/85";

  return (
    <article>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol sm:text-3xl">Aviso de privacidad</h1>
        <p className="mt-2 text-sm text-uach-ink/75">Plataforma institucional de la Universidad de los Altos de Chiapas</p>
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Borrador pendiente de revisión jurídica. Describe con exactitud lo que hace la plataforma, pero la versión
          oficial la publicará la universidad.
        </p>
      </header>

      <h2 className={h2}>Responsable</h2>
      <p className={p}>
        La Universidad de los Altos de Chiapas (UACH), con domicilio en Periférico Sur No. 1016, Barrio de María
        Auxiliadora, San Cristóbal de Las Casas, Chiapas, es responsable del tratamiento de los datos personales que se
        recaban en esta plataforma, conforme a la legislación mexicana en materia de protección de datos personales.
      </p>

      <h2 className={h2}>Datos que se tratan</h2>
      <ul className={ul}>
        <li>Identificación: nombre completo, matrícula o número de empleado y fotografía de perfil (opcional).</li>
        <li>Académicos: nivel, carrera, clases en las que participas, cuatrimestre o semestre.</li>
        <li>
          Trabajo escolar: archivos que entregas, respuestas a cuestionarios y encuestas, calificaciones, comentarios de
          tus docentes, publicaciones y comentarios en el tablón, material que compartes en el repositorio.
        </li>
        <li>
          Actividad en la plataforma: inicios de sesión, entregas, calificaciones, publicaciones y materiales que abres,
          con su fecha y hora.
        </li>
      </ul>
      <p className={p}>
        No se recaban datos sensibles, financieros ni de contacto: la plataforma no usa correo electrónico ni número de
        teléfono.
      </p>

      <h2 className={h2}>Para qué se usan</h2>
      <ul className={ul}>
        <li>Darte acceso a tus clases, tareas, cuestionarios, materiales y calificaciones.</li>
        <li>Que tus docentes califiquen, den seguimiento a tu avance y detecten a tiempo a quien necesita apoyo.</li>
        <li>Calcular calificaciones finales y generar reportes académicos para la administración escolar.</li>
        <li>Mantener la seguridad de las cuentas y aclarar cualquier incidencia (bitácora de actividad).</li>
      </ul>
      <p className={p}>Los datos no se usan con fines comerciales ni publicitarios.</p>

      <h2 className={h2}>Quién puede verlos</h2>
      <ul className={ul}>
        <li>Tus docentes: tus entregas, respuestas, calificaciones y avance en sus clases.</li>
        <li>Tus compañeros de clase: solo tu nombre y lo que publiques en el tablón; no ven tu matrícula.</li>
        <li>La administración escolar: lo necesario para gestionar cuentas, clases y reportes.</li>
      </ul>
      <p className={p}>
        No se transfieren datos a terceros, salvo cuando lo exija una autoridad competente conforme a la ley.
      </p>

      <h2 className={h2}>Cuánto tiempo se guardan</h2>
      <p className={p}>
        El registro de actividad se borra automáticamente a los 180 días. El trabajo escolar y las calificaciones se
        conservan mientras sean necesarios para la historia académica, conforme a las políticas de la universidad.
      </p>

      <h2 className={h2}>Cookies</h2>
      <p className={p}>
        La plataforma usa una sola cookie, necesaria para mantener tu sesión iniciada. No se usan cookies de publicidad ni
        de análisis, ni herramientas de rastreo de terceros.
      </p>

      <h2 className={h2}>Tus derechos (ARCO)</h2>
      <p className={p}>
        Puedes solicitar el acceso, la rectificación o la cancelación de tus datos personales, u oponerte a su
        tratamiento, escribiendo a{" "}
        <a href="mailto:uach@uach.edu.mx" className="font-medium text-uach-teal hover:text-uach-tealDark">
          uach@uach.edu.mx
        </a>{" "}
        o en las oficinas de la universidad. Indica tu nombre, tu matrícula o número de empleado y qué solicitas.
      </p>

      <h2 className={h2}>Cambios a este aviso</h2>
      <p className={p}>Cualquier cambio se publicará en esta misma página.</p>
      <p className="mt-6 text-xs text-uach-ink/60">Última actualización: 23 de noviembre de 2026.</p>
    </article>
  );
}
