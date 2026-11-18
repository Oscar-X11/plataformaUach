"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-[60vh] place-items-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-uach-petrol">Algo salió mal</h1>
        <p className="mt-2 text-sm text-uach-muted">
          Ocurrió un error inesperado. Inténtalo de nuevo; si persiste, contacta a soporte.
        </p>
        {error.digest && <p className="mt-2 font-mono text-xs text-uach-soft">Ref: {error.digest}</p>}
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-uach-teal px-4 py-2 text-sm font-semibold text-white hover:bg-uach-tealDark"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
