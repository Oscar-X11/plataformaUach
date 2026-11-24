"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { BookOpen, ClipboardCheck, ClipboardList, FileText, LoaderCircle, Search, User, type LucideIcon } from "lucide-react";
import { api } from "@/lib/api";

interface SearchHit {
  id: string;
  kind: "course" | "assignment" | "quiz" | "material" | "user";
  title: string;
  subtitle: string;
  href: string;
}

const ICONS: Record<SearchHit["kind"], LucideIcon> = {
  course: BookOpen,
  assignment: ClipboardList,
  quiz: ClipboardCheck,
  material: FileText,
  user: User,
};

const FOCUS = "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-uach-teal/40";

/**
 * Búsqueda global (Ctrl+K o /): clases, tareas, cuestionarios y material del
 * usuario; usuarios para la administración. Combobox accesible con flechas.
 */
export function GlobalSearch() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [searched, setSearched] = useState("");

  function open() {
    dialogRef.current?.showModal();
    requestAnimationFrame(() => inputRef.current?.select());
  }
  const close = () => dialogRef.current?.close();

  // Atajos: Ctrl/Cmd+K en cualquier lugar; «/» fuera de campos de texto.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, select, [contenteditable='true']");
      if ((event.key === "k" && (event.ctrlKey || event.metaKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Cerrar con clic fuera del cuadro.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) dialog.close();
    };
    dialog.addEventListener("click", onClick);
    return () => dialog.removeEventListener("click", onClick);
  }, []);

  // Consulta con espera corta para no hacer una petición por tecla.
  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setResults([]);
      setSearched("");
      return;
    }
    let alive = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api<{ results: SearchHit[] }>(`/search?q=${encodeURIComponent(text)}`);
        if (!alive) return;
        setResults(data.results);
        setActive(0);
        setSearched(text);
      } catch {
        if (alive) setResults([]);
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  function go(hit: SearchHit) {
    close();
    router.push(hit.href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(results[active]);
    }
  }

  const optionId = (index: number) => `${listId}-opt-${index}`;

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Buscar (Ctrl+K)"
        className={`press-soft flex h-10 items-center gap-2 rounded-xl border border-uach-ink/10 bg-uach-surface px-3 text-sm text-uach-ink/60 transition-colors hover:text-uach-ink sm:w-64 ${FOCUS}`}
      >
        <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="hidden flex-1 text-left sm:inline">Buscar…</span>
        <kbd className="hidden rounded-md bg-uach-canvas px-1.5 py-0.5 font-sans text-[11px] text-uach-ink/60 sm:inline">Ctrl K</kbd>
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Búsqueda"
        className="mt-[10vh] w-[min(36rem,calc(100vw-2rem))] rounded-2xl bg-uach-surface p-0 text-uach-ink shadow-xl backdrop:bg-uach-ink/40"
      >
        <div className="flex items-center gap-2 border-b border-uach-ink/[0.08] px-4">
          <Search className="h-5 w-5 shrink-0 text-uach-ink/50" strokeWidth={1.75} aria-hidden />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls={listId}
            aria-activedescendant={results.length ? optionId(active) : undefined}
            aria-autocomplete="list"
            aria-label="Buscar clases, tareas, cuestionarios y material"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            maxLength={80}
            placeholder="Clases, tareas, cuestionarios, material…"
            className="h-14 flex-1 bg-transparent text-base text-uach-ink placeholder:text-uach-ink/50 focus:outline-none"
          />
          {loading && <LoaderCircle className="h-4 w-4 animate-spin text-uach-ink/50" aria-hidden />}
        </div>

        <ul id={listId} role="listbox" aria-label="Resultados" className="max-h-[60vh] overflow-y-auto p-2">
          {results.map((hit, index) => {
            const Icon = ICONS[hit.kind];
            const selected = index === active;
            return (
              <li
                key={`${hit.kind}-${hit.id}`}
                id={optionId(index)}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(index)}
                onClick={() => go(hit)}
                className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl px-3 py-2 ${selected ? "bg-uach-teal/10" : ""}`}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-uach-canvas text-uach-teal">
                  <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-uach-ink">{hit.title}</span>
                  <span className="block truncate text-xs text-uach-ink/75">{hit.subtitle}</span>
                </span>
              </li>
            );
          })}
        </ul>
        {!loading && searched && results.length === 0 && (
          <p className="px-4 pb-5 text-center text-sm text-uach-ink/75">Sin resultados para «{searched}».</p>
        )}
        {query.trim().length < 2 && (
          <p className="px-4 pb-5 text-center text-xs text-uach-ink/60">Escribe al menos 2 letras. Esc para cerrar.</p>
        )}
        <p className="sr-only" aria-live="polite">
          {searched ? `${results.length} resultados` : ""}
        </p>
      </dialog>
    </>
  );
}
