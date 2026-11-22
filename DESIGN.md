---
name: TallerApp
description: Manual de servicio para el taller mecánico — cada vehículo, cita y orden es una pieza con folio propio y el avance es una secuencia de llamadas numeradas.
colors:
  fondo: "#f6f7f4"
  superficie: "#ffffff"
  tinta: "#1b1f24"
  tenue: "#4b5563"
  linea: "#c7ccd1"
  cobalto: "#1d3fa8"
  cobalto-oscuro: "#163285"
  cobalto-suave: "#e8edfa"
  cobalto-claro: "#cbd7f6"
  amarillo-llamada: "#f2b705"
  pendiente: "#9a6700"
  pendiente-suave: "#fbf3dc"
  confirmada: "#1e6b3a"
  confirmada-suave: "#e6f2ea"
  cancelada: "#b42318"
  cancelada-oscuro: "#8e1b12"
  cancelada-suave: "#fce9e7"
  neutro: "#6b7280"
  neutro-suave: "#eceef0"
typography:
  titulo-pagina:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.01em"
  titulo-pagina-movil:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.01em"
  marca:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.02em"
  progreso-etiqueta:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: "12px"
    letterSpacing: "0.08em"
  titulo-seccion:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.04em"
  placa:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.04em"
  etiqueta:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: "16px"
    letterSpacing: "0.12em"
  cuerpo:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
rounded:
  base: "2px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  boton-primario:
    backgroundColor: "{colors.cobalto}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.base}"
    padding: "0 20px"
    height: "44px"
  boton-primario-hover:
    backgroundColor: "{colors.cobalto-oscuro}"
  boton-secundario:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.base}"
    padding: "0 20px"
    height: "44px"
  boton-secundario-hover:
    backgroundColor: "{colors.neutro-suave}"
  boton-peligro:
    backgroundColor: "{colors.cancelada}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.base}"
    padding: "0 20px"
    height: "44px"
  boton-peligro-hover:
    backgroundColor: "{colors.cancelada-oscuro}"
  boton-fantasma:
    backgroundColor: "transparent"
    textColor: "{colors.cobalto}"
    rounded: "{rounded.base}"
    padding: "0 20px"
    height: "44px"
  boton-fantasma-hover:
    backgroundColor: "{colors.cobalto-suave}"
  campo:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.base}"
    padding: "8px 12px"
    height: "44px"
  ficha:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.base}"
    padding: "16px"
  estado-pendiente:
    backgroundColor: "{colors.pendiente-suave}"
    textColor: "{colors.pendiente}"
    rounded: "{rounded.base}"
    padding: "4px 8px"
  estado-confirmada:
    backgroundColor: "{colors.confirmada-suave}"
    textColor: "{colors.confirmada}"
    rounded: "{rounded.base}"
    padding: "4px 8px"
  estado-cancelada:
    backgroundColor: "{colors.cancelada-suave}"
    textColor: "{colors.cancelada}"
    rounded: "{rounded.base}"
    padding: "4px 8px"
  estado-atendida:
    backgroundColor: "{colors.neutro-suave}"
    textColor: "{colors.tenue}"
    rounded: "{rounded.base}"
    padding: "4px 8px"
  riel:
    backgroundColor: "{colors.cobalto}"
    textColor: "{colors.superficie}"
    width: "240px"
---

# Design System: TallerApp

## Overview

**Creative North Star: "El Manual de Servicio"**

El taller se lee como un catálogo de despiece: cada vehículo, cita y orden es una pieza con número propio (placa, folio `#0005`, cita `#003`) y el avance de una orden es una secuencia de llamadas numeradas unidas por una línea guía. La interfaz es plana, de línea fina y densa en información útil; se parece más a una lámina técnica impresa que a un panel de métricas.

El color es plano y escaso. Un cobalto sólido define el shell (riel en escritorio, barra superior en celular); el amarillo llamada aparece únicamente para "lo actual": el paso en curso, el ítem de menú activo, la selección de texto. No hay degradados ni sombras difusas: la elevación es un borde, y las piezas importantes llevan una regla superior de 2px en tinta, como un encabezado de tabla de refacciones. Radios de 2px en todo.

Funciona igual de bien en el mostrador (escritorio, 1440) y en el celular: mismos tokens, misma jerarquía, la retícula de agenda se pliega en lista por hora y las llamadas pasan de horizontales a verticales. Las columnas de la agenda son "3 lugares" de capacidad, sin rótulo de bahía: las citas no guardan bahía y la interfaz no afirma lo que el sistema no registra.

**Key Characteristics:**
- Placas, folios y horas como números grandes en Barlow Condensed 700, siempre tabulares.
- Elevación por borde y regla superior de 2px; cero sombras (todos los `--shadow-*` están anulados).
- Amarillo solo para lo actual; estados siempre con texto y cuadrito, nunca solo color.
- Una sola acción primaria cobalto por momento.
- Radio único de 2px (`--radius-xs` a `--radius-xl` valen lo mismo).

## Colors

Paleta de papel de taller: fondo hueso, tinta casi negra, un cobalto de uniforme y un amarillo de señal, con cuatro colores de estado funcionales.

### Primary
- **Cobalto de Uniforme** (`cobalto`, #1d3fa8): shell (riel y barra superior), botón primario, enlaces, foco sobre fondo claro, caret. Hover/activo en **Cobalto Profundo** (`cobalto-oscuro`, #163285). Tintes: **Cobalto Tenue** (`cobalto-suave`, #e8edfa) para fantasma en hover, estado "atendida/info" y alertas informativas; **Cobalto Claro** (`cobalto-claro`, #cbd7f6) para texto secundario sobre el cobalto.

### Secondary
- **Amarillo Llamada** (`amarillo-llamada`, #f2b705; en CSS `--color-amarillo`): marca de lo actual. Círculo del paso en curso en ProgresoOrden, cuadrito del ítem activo del menú, foco sobre cobalto, enlace "saltar al contenido", `::selection`.

### Neutral
- **Hueso de Mostrador** (`fondo`, #f6f7f4): fondo de página.
- **Superficie Blanca** (`superficie`, #ffffff): fichas, campos, celdas de cita.
- **Tinta de Taller** (`tinta`, #1b1f24): texto principal, reglas de 2px, paso completado.
- **Tinta Tenue** (`tenue`, #4b5563): texto secundario (7:1 sobre fondo), encabezados de tabla, placeholders.
- **Línea de Plano** (`linea`, #c7ccd1): bordes de 1px, divisores, línea guía sin completar, celdas libres punteadas.
- **Gris Neutro** (`neutro`, #6b7280) y **Gris Suave** (`neutro-suave`, #eceef0): atendida/entregado, campo deshabilitado, hover secundario.

### Estados (funcionales)
- **Pendiente** `pendiente` #9a6700 sobre `pendiente-suave` #fbf3dc (ámbar).
- **Confirmada** `confirmada` #1e6b3a sobre `confirmada-suave` #e6f2ea (verde).
- **Cancelada** `cancelada` #b42318 (hover `cancelada-oscuro` #8e1b12) sobre `cancelada-suave` #fce9e7 (rojo); también error de campo y botón peligro.
- **Atendida / entregado** `neutro` #6b7280 sobre `neutro-suave` (gris).

### Named Rules
**The Lo-Actual Rule.** El amarillo llamada marca solo lo que está en curso o seleccionado en ese momento. Nunca decora, nunca es botón, nunca es estado de cita.

**The Texto-Más-Color Rule.** Todo estado se comunica con palabra y cuadrito de 8px; el color nunca va solo.

**The Cobalto-Es-El-Shell Rule.** El cobalto sólido cubre riel y barra superior y es el color de la acción primaria; en el cuerpo de la página no se usa como relleno de área grande.

## Typography

**Display Font:** Barlow Condensed (con Barlow, ui-sans-serif, system-ui)
**Body Font:** Barlow (con ui-sans-serif, system-ui)

**Character:** Condensada de rotulación de chasis para todo lo que se identifica (títulos, placas, folios, etiquetas) y un humanista neutro para leer. Solo se cargan los pesos 400 y 700, autoalojados; todo número es tabular (`font-variant-numeric: tabular-nums` en body).

### Hierarchy
- **Título de página** (`.titulo-pagina`, 700, 1.75rem / 2.25rem desde 1024px, 1.1, +0.01em): un h1 por pantalla, dentro de `EncabezadoPagina`; la fecha va en tipo oración (Barlow 1rem, `tenue`) al lado del título en escritorio, alineada a la línea base, y debajo en celular, nunca encima.
- **Título de sección** (`.titulo-seccion`, 700, 1.125rem, 1.25, +0.04em, mayúsculas): h2 como "Agenda de hoy", "Órdenes abiertas".
- **Placa / folio** (`.placa`, 700, 1.5–2.25rem según contexto: 2xl hora, 3xl placa en celda, 4xl placa en ficha; interlineado 1; +0.04em): la pieza ancla de cada ficha; también horas de la retícula.
- **Etiqueta** (`.etiqueta`, 700, 12px/16px, +0.12em, mayúsculas): etiquetas de campo, encabezados de tabla, estados, folios chicos, "Libre", "Lleno". Es dato corto y rotulado, no un sobretítulo decorativo.
- **Cuerpo** (400, 1rem, 1.5): texto corriente; negrita 700 para nombre del cliente y datos clave; texto secundario en `tenue`. Mensajes de alerta 14px.

### Named Rules
**The Placa-Primero Rule.** En toda ficha o celda de vehículo la placa es lo más grande y va en Barlow Condensed 700; nombre y modelo van debajo en cuerpo.

**The Dos-Voces Rule.** Condensada para identificar, Barlow para leer. No se introduce una tercera familia.

## Layout

Shell de dos zonas: riel cobalto fijo de 240px a la izquierda desde 1024px (`lg`); debajo, barra superior cobalto pegajosa de 56px con menú desplegable de ancho completo. El contenido se centra en un contenedor máximo de 1360px con relleno de 16px (celular), 24px (sm y lg).

Espaciado en múltiplos de 4px sobre la escala de Tailwind: separación entre secciones de 20–24px (`space-y-5`, `space-y-6`), entre fichas de 12px (`.lista-fichas`), relleno de ficha de 12px (14px desde `md`), celdas de cita de 10px, celdas de tabla de 8px 12px. La densidad es de herramienta de trabajo: placas de 24px en fichas y celdas (`text-2xl`), 28px/36px en encabezados de detalle, 18–20px en tablas. Objetivos táctiles mínimos de 44px en celular y 40px desde 768px (botones, campos, ítems de menú de 48px).

Encabezado de pantalla (`EncabezadoPagina`): título, fecha opcional y acciones en una fila que envuelve; la fecha queda al lado del título desde 768px y debajo en celular.

Inicio del taller (referencia): encabezado con título, fecha y buscador por placa; debajo, desde `xl`, dos columnas `minmax(0,1fr)` y 420px: agenda de hoy a la izquierda, órdenes abiertas a la derecha. Por debajo de `xl` se apilan. La separación entre filas es una línea de 1px, nunca espacio vacío.

Inicio del cliente (referencia): rejilla de fichas de vehículo (1 / 2 / 3 columnas en base / `sm` / `xl`) con `items-start`, de modo que cada ficha toma su altura natural. La ficha de un vehículo con orden abierta ocupa 2 columnas desde `lg` para alojar ProgresoOrden en horizontal.

## Elevation & Depth

Sin sombras. Todos los `--shadow-*` de Tailwind están anulados en el tema. La profundidad es de papel: superficie blanca con borde de 1px `linea` sobre fondo hueso, y una regla superior de 2px en `tinta` para marcar la pieza principal (ficha, tabla, retícula). El foco usa un contorno de 2px (cobalto, o amarillo sobre cobalto) con desplazamiento de 2px.

### Named Rules
**The Borde-Es-La-Elevación Rule.** Para separar o levantar algo se usa borde de 1px, o regla de 2px en tinta para la pieza principal. Ninguna sombra, ningún desenfoque.

## Shapes

Esquinas casi rectas: 2px en botones, campos, fichas, alertas y etiquetas de estado. La única forma redonda es el círculo numerado de ProgresoOrden (llamada de despiece). Los cuadritos de estado y el marcador activo del menú son cuadrados de 8px. Las celdas y franjas libres de la agenda usan borde punteado `linea`; "Lleno" es una etiqueta sólida en tinta. Iconos propios en SVG de trazo uniforme de 1.75px con terminal cuadrado.

## Components

### Botones
Rotulados en Barlow Condensed 700, 14px, mayúsculas, +0.12em; altura 44px (40px desde `md`), relleno horizontal 20px; variante `compacto` para celdas y filas densas: 44px en celular, 36px desde `md`, relleno 12px, radio 2px, borde de 1px.
- **Primario:** relleno cobalto, texto blanco; hover y activo `cobalto-oscuro`.
- **Secundario:** blanco con borde tinta; hover `neutro-suave`, activo `linea`.
- **Peligro:** relleno `cancelada`, texto blanco; hover `cancelada-oscuro`.
- **Fantasma:** transparente, texto cobalto; hover `cobalto-suave`.
- **Claro (sobre cobalto):** transparente, borde blanco al 60%, texto blanco; hover blanco al 12%.
- Deshabilitado al 50% de opacidad; `aria-busy` mantiene opacidad plena y cursor de progreso.

### Campos
Fondo blanco, borde 1px `linea`, radio 2px, relleno 8px 12px, altura 44px (40px en `md`); etiqueta sobre el campo en `.etiqueta`. El campo de fecha lleva texto en `tinta` e icono del selector en cobalto, siempre visible (esquema claro, `accent-color` cobalto). Hover oscurece el borde a `neutro`; foco con contorno cobalto de 2px y borde cobalto; inválido con borde de 2px `cancelada` y mensaje en negrita rojo con icono; deshabilitado/solo lectura sobre `neutro-suave`. El select lleva chevrón propio de trazo cuadrado.

### Ficha
Superficie blanca, borde 1px `linea`, regla superior de 2px `tinta`, radio 2px, relleno 16px. Contenedor de orden o cita; encabezada por la placa y el folio en cobalto (`.etiqueta`).

### Tabla de refacciones
Regla superior de 2px en tinta; encabezados en `.etiqueta` color `tenue`; filas separadas por 1px `linea`; celdas con 12px de relleno.

### Estado (BadgeEstatus)
Cuadrito de 8px más texto en `.etiqueta`, sobre tinte claro del propio color (pendiente, confirmada, cancelada, atendida/gris, azul informativo), radio 2px, relleno 4px 8px. El texto sale de `etiquetaTaller` (3.ª persona) o `etiquetaCliente` (2.ª persona: "Pendiente de confirmar", "Cancelada por ti"), y se usa también en Próximas citas del cliente.

### Alertas
Caja con borde 1px y tinte del tipo (error, éxito, info), icono de 20px de trazo 1.75px y texto de 14px en tinta; error usa `role="alert"`, el resto `role="status"`.

### Navegación
Riel (escritorio) y panel desplegable (celular) sobre cobalto. Ítems de 48px, texto blanco 16px, relleno 24px; el activo lleva tinte blanco al 12% y cuadrito amarillo de 8px; hover blanco al 8%. Marca "TallerApp" en Barlow Condensed 700 de 32px sobre el rol en `cobalto-claro`; usuario y botón "Salir" (claro) al pie del riel.

### ProgresoOrden (componente firma)
Cinco llamadas numeradas (Recibido, Diagnóstico, Reparación, Listo, Entregado) sobre una línea guía de 2px (`linea`). El tramo completado se rellena en tinta, proporcional (`--p` = paso actual / 4). Paso completado: círculo 22px, borde y relleno tinta, número blanco. Paso actual: círculo de 24px, relleno `amarillo-llamada`, borde tinta de 2px, número 14px. Pendiente: círculo 22px, etiquetas de 11px, borde `linea`, relleno fondo, número `tenue`. Es una lista ordenada con `aria-current="step"` y texto oculto "(completado) / (paso actual) / (pendiente)". Responde al ancho del propio contenedor (container query): desde 360px, cinco columnas con la línea horizontal y etiquetas cortas; por debajo, lista vertical con etiquetas completas y línea a la izquierda.

### AgendaRejilla (componente firma)
Retícula hora × 3 lugares (capacidad de 3 citas por bloque de 1 hora; las columnas no llevan rótulo de bahía porque las citas no guardan bahía y se llenan en orden). Lista ordenada con regla superior de 2px tinta; cada hora es una fila con divisor de 1px y una columna de 72px con la hora en `.placa` 2xl. Hay tres formas de fila:
- **Hora con citas:** a la derecha, tres celdas iguales. Celda ocupada: blanco con borde 1px `linea` y relleno de 12px (placa grande, cliente y motivo, estado con texto, número de cita). Celda libre restante: borde punteado `linea`, "Libre" en `.etiqueta` `tenue` (mínimo 96px de alto). Si las tres están ocupadas, etiqueta "Lleno" sólida tinta con texto blanco bajo la hora.
- **Hora sin citas activas:** una sola franja punteada `linea` de 36px (44px en celular) a todo el ancho con "Libre · 3 lugares" centrado en `.etiqueta` `tenue`, en lugar de tres celdas vacías.
- **Día sin citas:** mensaje en `tenue` y una línea tenue por hora ("· Libre · 3 lugares"), sin celdas.

Acciones de celda (en Citas del taller): la acción principal (Confirmar o Crear orden) va primero, a ancho completo; Reprogramar (secundario) y Cancelar (peligro) van debajo en dos columnas iguales, ancladas al fondo de la celda. En celular la hora es un encabezado con sus citas apiladas y una sola línea punteada "Libre · N lugares".

## Do's and Don'ts

### Do:
- **Do** dar a cada vehículo, cita y orden un identificador visible: placa en `.placa`, folio como `Orden #0005` o `Cita #003`.
- **Do** separar con borde de 1px `linea` y marcar la pieza principal con regla superior de 2px `tinta`.
- **Do** reservar el amarillo `#f2b705` para lo actual (paso en curso, ítem activo, selección, foco sobre cobalto).
- **Do** acompañar todo estado con texto y cuadrito de 8px además del color.
- **Do** mantener radio de 2px y trazo de iconos de 1.75px con terminales cuadrados.
- **Do** dar 44px de alto táctil en celular y mostrar la acción siguiente única (Confirmar, Crear orden, Avanzar a…).
- **Do** mostrar las horas vacías de la agenda como una franja punteada única de 44px "Libre · 3 lugares", no como tres celdas vacías.
- **Do** poner en cada celda de cita la acción principal primero a ancho completo y las secundarias (Reprogramar, Cancelar) en dos columnas iguales al fondo.
- **Do** ofrecer los cuatro estados en toda lista: cargando, datos, vacía, error con "Reintentar".

### Don't:
- **Don't** usar sombras difusas, degradados ni tarjetas blancas flotantes con badges de colores y métricas grandes (panel SaaS).
- **Don't** usar el amarillo como relleno de botón, fondo de sección o color de estado.
- **Don't** introducir una tercera familia tipográfica ni pesos distintos de 400 y 700 (no están cargados).
- **Don't** redondear más de 2px; la única excepción es el círculo numerado de ProgresoOrden.
- **Don't** comunicar estado solo con color.
- **Don't** poner la fecha o un dato corto como sobretítulo sobre el h1; va al lado del título (`EncabezadoPagina`).
- **Don't** rotular las columnas de la agenda como "Bahía n": las citas no guardan bahía; son "3 lugares" de capacidad.
