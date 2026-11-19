"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** Curvas compartidas con globals.css, en formato de motion. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

/** Desplazamiento de indicadores (layoutId): ease-in-out, 220ms. */
export const SLIDE_TRANSITION = { duration: 0.22, ease: EASE_IN_OUT };

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * La entrada escalonada del dashboard solo se reproduce en la primera carga
 * de la sesión de navegación; al volver desde otra sección, aparece directo.
 */
let firstLoadConsumed = false;

export function useFirstLoad() {
  // En el primer render (SSR + hidratación) siempre es true, así coinciden.
  const [isFirst] = useState(() => !firstLoadConsumed);
  useEffect(() => {
    firstLoadConsumed = true;
  }, []);
  return isFirst;
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Cuenta de 0 al valor en ~600ms con ease-out. El servidor renderiza el valor
 * final; en el cliente se reinicia a 0 antes de pintar, sin parpadeo.
 */
export function useCountUp(target: number, { enabled = true, duration = 600 } = {}) {
  const [value, setValue] = useState(target);
  const frame = useRef<number>();

  useIsomorphicLayoutEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      setValue(target);
      return;
    }
    const start = performance.now();
    setValue(0);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(target * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, enabled, duration]);

  return value;
}
