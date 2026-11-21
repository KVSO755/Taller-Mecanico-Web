# 09 · Sistema visual base

**Fecha:** 21/11/2026 14:07
**Feature / área:** Diseño — base para todas las pantallas

## Qué se trabajó
- Tokens del tema en `src/index.css` con `@theme` de Tailwind v4: fondo, tinta, cobalto, amarillo de "lo actual",
  línea y colores de estado (pendiente, confirmada, cancelada, neutro) con sus tintes suaves.
- Fuentes Barlow y Barlow Condensed autoalojadas en `public/fonts/` (sin depender de Google en producción).
- Clases propias: `.etiqueta`, `.placa`, `.titulo-pagina`, `.titulo-seccion`, `.campo`, `.tabla`, `.ficha`, `.enlace`.
- Detalles del navegador: foco visible, selección en amarillo, cursor y barras de desplazamiento con la paleta,
  números tabulares y respeto a "reducir movimiento".

## Archivos
- `src/index.css`
- `public/fonts/*.woff2` (Barlow 400/700 y Barlow Condensed 400/700, latin y latin-ext)

## Decisiones y notas
- Radio único de 2 px y sin sombras: la elevación se marca con borde y regla superior de 2 px.
- Solo se cargan los pesos 400 y 700 para no aumentar el peso de la página.

## Siguiente paso
- Componentes base de F01 (botones, campos, alertas, estados de lista).
