"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/errors";
import "./globals.css";

/** Falla del layout raíz (error.tsx no alcanza a mostrarse). También avisa al administrador. */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    reportClientError(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <main className="grid min-h-screen place-items-center px-4">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-semibold text-uach-petrol">Algo salió mal</h1>
            <p className="mt-2 text-sm text-uach-muted">
              Ocurrió un error inesperado y ya se avisó al administrador. Inténtalo de nuevo en un momento.
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
      </body>
    </html>
  );
}
