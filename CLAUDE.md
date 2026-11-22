# TallerApp — guía para el asistente de IA

Sistema web de gestión para un taller mecánico pequeño (Tijuana). Roles: **cliente**, **empleado**, **admin**. Interfaz y textos **en español (México)**. Responde siempre en español.

## Stack y comandos

- React 19 + Vite · Tailwind CSS v4 (`@theme` en `src/index.css`) · React Router 7 · supabase-js 2 · Supabase (Auth + PostgreSQL + RLS).
- `npm run dev` (http://localhost:5173) · `npm run build` · `npm run lint` (oxlint).
- Después de cualquier cambio en `src/`: correr `npm run build` y `npm run lint`; ambos deben pasar sin errores.

## Dónde está cada cosa

- Mapa completo: `GUIA_DEL_PROYECTO.md`. Specs (fuente de verdad): `specs/` (F01–F11 en `specs/features/`).
- Rutas: `src/App.jsx` (páginas con `React.lazy`). Menú por rol: `src/components/Layout.jsx`.
- Pantallas: `src/pages/{auth,cliente,taller,admin}/`. Componentes: `src/components/`. Utilidades: `src/utils/`.
- Datos: `src/services/*.js` — **las páginas nunca llaman a Supabase directo**, siempre por un servicio.
- Errores para el usuario: `src/services/errores.js` (`traducirError`). Los errores de negocio de la BD llegan con code `P0001` y mensaje en español listo para mostrar.
- Base de datos: `supabase/` → `schema.sql` → `functions.sql` → `policies.sql` → `seed.sql` → `tests.sql` (en ese orden, en el SQL Editor de Supabase).

## Convenciones (respétalas en cualquier cambio)

1. **Diseño:** usa el sistema de `DESIGN.md`. Colores solo con tokens (`bg-cobalto`, `text-tinta`, `text-tenue`, `bg-amarillo` solo para "lo actual", `pendiente`, `confirmada`, `cancelada`, `neutro`…); nada de `slate-`/`blue-`/`gray-`. Clases propias: `.etiqueta`, `.placa`, `.titulo-pagina`, `.titulo-seccion`, `.campo`, `.tabla`, `.ficha`, `.enlace`. Radio 2 px, sin sombras.
2. **Componentes existentes primero:** `Boton` (variantes primario/secundario/peligro/fantasma/claro, prop `cargando`, `compacto`), `clasesBoton` para `<Link>`, `Input`, `CampoSelect`, `Alerta`, `EstadoLista` (cargando/vacía/error con Reintentar), `BadgeEstatus`, `EncabezadoPagina`, `ProgresoOrden`.
3. **Listas:** siempre los 4 estados (cargando, con datos, vacía con mensaje, error con "Reintentar").
4. **Formularios:** validación con mensaje bajo el campo, `maxLength` según los límites de la BD, botón deshabilitado mientras envía.
5. **Fechas y horas:** zona `America/Tijuana` con `src/utils/fechas.js` y `src/utils/horarios.js`. Moneda con `src/utils/moneda.js`.
6. **Responsivo:** debe funcionar en celular (≥ 390 px) y escritorio; controles de 44 px en celular; sin scroll horizontal.
7. **Accesibilidad:** label en cada campo, foco visible, estado comunicado con texto (no solo color).

## Seguridad (no negociable)

- La seguridad real vive en la BD: RLS + permisos por columna + funciones RPC `SECURITY DEFINER` con `set search_path = public` que validan `mi_rol()`. **No** relajes políticas ni grants para que algo "funcione".
- En el frontend solo va la llave pública (`VITE_SUPABASE_ANON_KEY` en `.env.local`). Nunca `service_role`.
- **Nunca** escribas credenciales, contraseñas, llaves ni la URL del proyecto Supabase en archivos del repo (el repositorio es público).
- No uses `dangerouslySetInnerHTML`. La CSP de `vercel.json` no permite scripts externos ni inline.

## Si el cambio toca la base de datos

- Edita el archivo SQL correspondiente de forma **re-ejecutable** (`create or replace`, `if not exists`, `drop policy if exists`).
- Avisa al usuario qué archivos debe volver a correr en Supabase y en qué orden (y luego `tests.sql`).
- Si cambia una regla, actualiza la spec en `specs/` (SDD: la spec manda).

## Cómo hacer un cambio pequeño

1. Lee la spec de la feature y el archivo a cambiar antes de editar.
2. Haz el cambio mínimo, siguiendo las convenciones de arriba.
3. Corre `npm run build` y `npm run lint`.
4. Di exactamente qué archivos cambiaste y cómo probarlo en el navegador (ruta, cuenta de demo con su rol y pasos).
5. No hagas commit ni push a menos que el usuario lo pida.

## Cuentas de demo

`admin@example.com`, `empleado@example.com`, `cliente1@example.com`, `cliente2@example.com`. Las contraseñas **no** están en el repo; las tiene el usuario.
