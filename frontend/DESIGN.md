---
name: Plataforma UACH
description: Plataforma académica de la Universidad de los Altos de Chiapas — cercana, clara y con movimiento sobrio.
colors:
  canvas: "#F4F7F7"
  surface: "#FFFFFF"
  subtle: "#E8F0F0"
  teal: "#117873"
  teal-dark: "#0C5958"
  emerald: "#17684F"
  petrol: "#083B46"
  ink: "#264143"
  muted: "#526D6F"
  soft: "#7A9496"
  status-overdue: "#B91C1C"
  status-overdue-bg: "#FEF2F2"
  status-due: "#B45309"
  status-due-bg: "#FFFBEB"
  status-done: "#17684F"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  heading:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  caption:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "20px"
  card-featured:
    backgroundColor: "{colors.petrol}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "24px"
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.teal-dark}"
  nav-item-active:
    backgroundColor: "rgba(17, 120, 115, 0.10)"
    textColor: "{colors.teal-dark}"
    rounded: "{rounded.md}"
  chip:
    backgroundColor: "{colors.subtle}"
    textColor: "{colors.teal-dark}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
---

# Sistema visual — Plataforma UACH

Guía para mantener consistentes los estilos globales. Las fuentes de verdad en código son:

| Qué | Dónde |
| --- | --- |
| Colores, sombras, curvas, fuente | `tailwind.config.ts` (`uach.*`, `shadow-uach-*`, `fontFamily`) |
| Variables de movimiento y clases de interacción | `src/app/globals.css` (bloque "Sistema de movimiento") |
| Curvas para `motion` (JS) | `src/lib/motion.ts` (`EASE_OUT`, `EASE_IN_OUT`, `EASE_DRAWER`, `SLIDE_TRANSITION`) |
| Tokens de componentes del dashboard | `src/components/dashboard/tone.ts` (`CARD`, `FOCUS_RING`, `TONE_*`, `URGENCY_*`) |

Si cambias un valor, cámbialo en su fuente y actualiza este documento.

## Overview

Interfaz de trabajo (no de marketing): el alumno entra a resolver algo. La marca vive en los detalles —paleta institucional, tipografía cuidada, movimiento preciso— no en decoración. Tono cercano y útil ("Lo que sigue", "Estás al día 🎉"), nunca burocrático.

Principios:
1. **Lo urgente primero.** Fechas y atrasos antes que cualquier otra cosa.
2. **Familiaridad sobre sorpresa.** Patrones conocidos de Classroom/Moodle.
3. **Igual de bien en celular que en PC.** Mobile first, áreas táctiles de 44px.
4. **Sobrio.** Un solo bloque protagonista por pantalla; el resto, superficies limpias.

## Colors

Estrategia **restringida**: neutros teñidos de la paleta + teal como único acento de acción, y **un** bloque petrol por pantalla para lo más importante. No se agregan colores de marca nuevos.

| Token Tailwind | Hex | Uso |
| --- | --- | --- |
| `uach-canvas` | `#F4F7F7` | Fondo de página |
| `uach-surface` | `#FFFFFF` | Tarjetas, sidebar, popovers |
| `uach-subtle` | `#E8F0F0` | Pills, fondos secundarios |
| `uach-teal` | `#117873` | Acción primaria, selección, foco, indicador activo |
| `uach-tealDark` | `#0C5958` | Hover de acción, texto activo |
| `uach-emerald` | `#17684F` | Éxito / entregado |
| `uach-petrol` | `#083B46` | Títulos, bloque destacado, tooltips |
| `uach-ink` | `#264143` | Texto principal |

**Texto secundario:** `text-uach-ink/75`. No bajes de 75 % en texto pequeño: ink al 60 % no pasa AA (4.5:1). Usa `/60` solo en iconos decorativos.

**Estados** (semánticos, no de marca; siempre suaves):

| Estado | Texto | Fondo |
| --- | --- | --- |
| Vencido | `text-red-700` | `bg-red-50` |
| Por vencer (hoy/mañana) | `text-amber-700` / `text-amber-800` | `bg-amber-50` |
| Entregado / al día | `text-uach-emerald` | `bg-uach-emerald/10` |

Sobre fondo petrol, usa variantes claras: `text-red-200`, `text-amber-100`, `text-white/70–85`.

**Color por curso** (`CourseTone`): `teal`, `petrol`, `emerald`, `tealDark`, `ink`. Ficha con iniciales = tinte al 10 % + texto del tono (`TONE_TILE`); barras y puntos = tono sólido (`TONE_BG`). Escribe las clases literales (Tailwind no detecta clases construidas con variables).

## Typography

Una sola familia: **Geist** (cargada en `app/layout.tsx`, aplicada en `body` desde `globals.css`). Escala fija en rem, sin tamaños fluidos.

| Rol | Clases |
| --- | --- |
| Saludo / título de página | `text-[28px] sm:text-4xl font-semibold tracking-[-0.025em] text-uach-petrol` |
| Título destacado (bloque petrol) | `text-2xl font-semibold tracking-tight [text-wrap:balance]` |
| Título de sección / panel | `text-base font-semibold text-uach-petrol` (sección grande: `text-lg tracking-tight`) |
| Cuerpo | `text-sm text-uach-ink` (resumen bajo el saludo: `text-[15px]`) |
| Metadatos | `text-xs text-uach-ink/75` |

- Números, fechas y calificaciones: siempre `tabular-nums`.
- Tracking mínimo `-0.04em`; usa `-0.015em` a `-0.025em` en títulos.
- **Nada de etiquetas pequeñas encima de un título** (eyebrow/kicker). El título habla solo; el contexto va debajo.

## Layout

- Contenedor: `mx-auto max-w-7xl px-4 sm:px-6`, `pb-28` en móvil (barra inferior) y `lg:pb-10`.
- Ritmo vertical entre bloques: `space-y-6 lg:space-y-8`; separación entre tarjetas: `gap-4`.
- **Bento**, no cuadrícula de cajas idénticas: un bloque protagonista más ancho y paneles de distinto tamaño. Dashboard: `md:grid-cols-2` → `xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]`.
- Toda grilla declara `grid-cols-1` en móvil (equivale a `minmax(0,1fr)`), si no el contenido largo desborda.
- Breakpoints: sidebar fija desde `lg` (1024px); debajo, barra inferior + cajón "Más".
- Verificar siempre en **360, 768 y 1280 px**.

## Elevation & Depth

Profundidad mínima: se declara **borde o sombra**, casi nunca ambos fuertes.

| Nivel | Valor |
| --- | --- |
| Tarjeta | `border border-uach-ink/[0.08]` + `shadow-[0_1px_2px_rgba(8,59,70,0.04)]` (constante `CARD`) |
| Hover de tarjeta | `0 10px 24px -12px rgba(8,59,70,0.18)` + borde teal 22 % (clase `.lift`) |
| Popover / modal | `shadow-uach-modal` + borde 8 % |

Prohibido: glassmorphism, gradientes decorativos, sombras duras desplazadas, halos de color.

## Shapes

- Tarjetas y paneles: `rounded-2xl` (16px).
- Botones, ítems de navegación, filas clicables: `rounded-xl` (12px).
- Controles pequeños, tooltips: `rounded-lg` (8px).
- Pills y puntos de estado: `rounded-full`.
- Iconos: **lucide-react, trazo 1.5** (`strokeWidth={1.5}`; 1.75–2 solo en iconos de 16px o menos). Sin emojis como iconos; los emojis solo acompañan texto cercano ("👋", "🎉").

## Components

Constantes en `src/components/dashboard/tone.ts`; reutilízalas en lugar de copiar clases.

- **Tarjeta:** `${CARD} p-5`. Si es clicable: `lift` + `FOCUS_RING`.
- **Bloque destacado:** `rounded-2xl bg-uach-petrol p-5 sm:p-6 text-white`. Uno por pantalla.
- **Botón primario:** `press inline-flex h-11 items-center gap-2 rounded-xl bg-uach-teal px-5 text-sm font-semibold text-white hover:bg-uach-tealDark` (sobre petrol: `hover:bg-uach-teal/85`).
- **Enlace de acción en panel:** `text-sm font-medium text-uach-teal hover:text-uach-tealDark`.
- **Fila de lista clicable:** `press-soft flex min-h-[44px] items-center gap-3 rounded-xl px-2 py-2 hover:bg-uach-canvas`.
- **Ítem de navegación activo:** fondo `bg-uach-teal/10`, texto `text-uach-tealDark`, indicador con `layoutId` que se desliza.
- **Barra de progreso:** `<ProgressBar value tone label />` (`primitives.tsx`) — `role="progressbar"`, se llena con `scaleX`.
- **Números vivos:** `<CountUp value />` — cuenta ~600ms; los lectores de pantalla leen el valor final.
- **Ficha de curso:** `<CourseTile name tone size />`.
- **Foco:** `FOCUS_RING` = `focus-visible:ring-[3px] ring-uach-teal/40` con offset. Nunca quitar el foco sin reemplazo.
- **Estados vacíos:** con personalidad y una salida ("Todo leído 👌…", "Tu semestre empieza aquí" + botón). Nunca solo "No hay datos".
- **Datos de ejemplo:** mientras no haya backend, muestra el chip "Datos de ejemplo".
- **Áreas táctiles:** mínimo 44px en móvil (`h-11`, `min-h-[44px]`).

## Motion

Filosofía (Emil Kowalski): el movimiento comunica estado, nunca decora. Variables en `globals.css`:

| Variable | Valor | Uso |
| --- | --- | --- |
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Entradas, salidas, interacciones (por defecto) |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | Algo que se desplaza en pantalla (indicadores, sidebar) |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | Cajones/hojas |
| `--dur-fast` | 150ms | Press, hover, tooltips |
| `--dur-base` | 200ms | Transiciones de UI, cambio de sección |
| `--dur-enter` | 350ms | Entradas de bloques |
| `--dur-count` | 600ms | Barras y conteos (únicos > 300ms, porque explican un dato) |

Clases listas:

| Clase | Efecto |
| --- | --- |
| `.press` / `.press-soft` | `scale(0.97)` / `scale(0.98)` al presionar |
| `.lift` | `translateY(-2px)` + sombra, solo con `(hover: hover) and (pointer: fine)` |
| `[data-enter] .enter` + `style={{"--i": n}}` | Entrada escalonada (50ms) — solo primera carga (`useFirstLoad`) |
| `.page-enter` | Fade + 8px al cambiar de sección |
| `.bar-fill` + `--p` | Barra que se llena con `scaleX` |
| `.ping-once` | Un solo pulso (punto "no leído") |
| `.check-draw` | Check que se dibuja con `stroke-dashoffset` |
| `.celebrate` | Pulso teal único al completar |
| `.shimmer` | Brillo de skeleton |

Reglas:
- Animar solo `transform` y `opacity` (`clip-path`/`box-shadow` puntuales). Nunca `width`, `height`, `top`, `left`. Excepción documentada: `padding-left` del contenido al colapsar la sidebar.
- Nunca desde `scale(0)`: parte de `scale(0.95)` + opacity 0.
- Nunca `ease-in` ni `transition: all`. Especifica propiedades: `transition-[background-color,transform]`.
- Popovers crecen desde su disparador (`transformOrigin: "top right"`, etc.) y **salen más rápido** de lo que entran (180ms / 120ms).
- Nada infinito salvo skeletons mientras cargan; nada de rebotes; nada en acciones de teclado o que se repiten decenas de veces al día.
- `motion` solo donde CSS no alcanza: `layoutId`, `AnimatePresence`, listas que se reacomodan.
- **Movimiento reducido:** `MotionConfig reducedMotion="user"` (AppShell) + bloque `prefers-reduced-motion` en `globals.css` convierten el desplazamiento en fades. Todo componente nuevo debe respetarlo.

## Do's and Don'ts

**Sí**
- Reutilizar `CARD`, `FOCUS_RING`, `TONE_*` y las clases de movimiento.
- Un bloque petrol por pantalla para lo más importante.
- Fechas relativas y concretas ("vence en 3 h", "venció hace 2 días") en la zona `America/Mexico_City` (`lib/dashboard/format.ts`).
- Lenguaje cercano: "Lo que sigue", "Continúa donde te quedaste", "Estás al día 🎉".
- Probar en 360/768/1280 px y con movimiento reducido.

**No**
- Colores de marca nuevos, gradientes morados, glassmorphism.
- Texto secundario por debajo de ink 75 %.
- Etiquetas pequeñas encima de títulos, números de sección (01/02), filas de KPIs gigantes.
- Tarjetas idénticas como única estructura de la página.
- Barras de color en un solo costado de una tarjeta.
- Animaciones de más de 300ms en UI (salvo cajones, barras y conteos), en bucle, o que bloqueen la interacción.
