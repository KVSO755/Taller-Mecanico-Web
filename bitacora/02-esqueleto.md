# 02 · Esqueleto del proyecto

**Fecha:** 21/11/2026
**Feature / área:** Infraestructura

## Qué se trabajó
- Proyecto Vite + React (JavaScript) con Tailwind CSS v4 (`@tailwindcss/vite`), React Router 7 y supabase-js 2.
- Linter oxlint (el que trae la plantilla actual de Vite).

## Archivos
- `src/lib/supabase.js` — cliente de Supabase; solo usa la anon/publishable key de `.env.local` y falla con un mensaje claro si falta.
- `src/utils/fechas.js` — formato de fechas en `America/Tijuana`.
- `.env.example` — variables necesarias (sin valores).
- `vercel.json` — rewrite SPA para que las rutas de React Router funcionen al recargar.
- `.gitignore` — excluye `.env.local`, `node_modules`, `dist`.

## Decisiones y notas
- La `service_role` nunca va en el frontend.
- React Router se fijó en v7 (ya existe v8) para no cambiar de API a mitad del proyecto.

## Siguiente paso
- SQL de Supabase: tablas, funciones y políticas.
