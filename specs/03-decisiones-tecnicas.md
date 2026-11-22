# Decisiones técnicas

Se decidieron **después** de definir el problema, las features y los datos.

| Necesidad | Herramienta | Por qué |
|---|---|---|
| Lenguaje | JavaScript | Requisito del equipo. |
| Interfaz | React + Vite | Componentes por pantalla; Vite arranca rápido. |
| Rutas | React Router 7 (`react-router`) | Rutas por rol (`/cliente`, `/taller`, `/admin`). Las páginas se cargan por sección con `React.lazy` + `Suspense` (carga diferida). |
| Estilos | Tailwind CSS v4 (`@tailwindcss/vite`) | Estilos rápidos sin escribir CSS aparte; responsivo para celular. |
| Diseño / UI | Sistema propio con Tailwind v4 `@theme` (tokens de color, tipografía y clases base en `src/index.css`) | Dirección visual «Manual de servicio», documentada en `DESIGN.md` (contexto de producto en `PRODUCT.md`). Componentes base: `Boton`, `Input`, `Alerta`, `BadgeEstatus`, `EncabezadoPagina`, `AgendaRejilla`, `ProgresoOrden`. |
| Tipografía | Barlow y Barlow Condensed, autoalojadas | Archivos en `public/fonts` (sin depender de un CDN); solo pesos 400 y 700. |
| Linter | oxlint (`npm run lint`) | Revisión rápida del código sin configuración pesada (`.oxlintrc.json`). |
| Login | Supabase Auth (correo + contraseña) | Ya maneja contraseñas, sesiones y tokens. En Supabase se desactiva **"Confirm email"** para que el registro inicie sesión de inmediato (F01). |
| Base de datos | Supabase (PostgreSQL) | Relaciones entre clientes, vehículos, citas y órdenes. |
| Permisos | Row Level Security (RLS) + `GRANT` por columna | RLS filtra filas, no columnas; por eso se revoca la escritura general y se otorgan columnas concretas (ver `02-data-model.md`). |
| Reglas críticas | Funciones SQL (`rpc`, `SECURITY DEFINER`, `set search_path = public`) | Capacidad de citas, cambios de estado y de rol se validan en un solo lugar. |
| Tareas programadas | `pg_cron` (extensión habilitada en Supabase) | Cancela cada minuto las citas pendientes que no se confirmaron a tiempo (`cancelar_citas_vencidas()`). |
| Despliegue | Vercel | La app se publica desde el repositorio público de GitHub. |

**No** se usan en el MVP: Redux/Zustand (basta con un `AuthContext` y estado local), Edge Functions, librerías de componentes de UI de terceros (el sistema de diseño es propio).

## Estructura del repositorio

```text
Taller_Mecanico/
├── specs/                     ← specs SDD
├── supabase/                  se aplican a mano en el SQL Editor, en este orden:
│   ├── schema.sql             1. tablas, tipos, triggers, pg_cron
│   ├── functions.sql          2. mi_rol, bloques_ocupados, agendar_cita, confirmar_cita, reprogramar_cita,
│   │                             cancelar_cita, crear_orden, avanzar_estatus_orden, cambiar_rol,
│   │                             cambiar_activo, cancelar_citas_vencidas
│   ├── policies.sql           3. RLS + revoke/grant por columna
│   ├── seed.sql               4. datos de demo (busca las cuentas por correo)
│   └── tests.sql              pruebas de RLS y capacidad (4 clientes al mismo bloque)
├── src/
│   ├── lib/supabase.js        cliente de Supabase
│   ├── context/AuthContext.jsx  sesión + perfil + rol
│   ├── components/            Boton, Input, Alerta, Spinner, EstadoLista, BadgeEstatus, EncabezadoPagina, AgendaRejilla,
│   │                             ProgresoOrden, FormVehiculo, HistorialServicios, ReprogramarCita, PantallaAcceso, Layout
│   ├── routes/RutaProtegida.jsx
│   ├── pages/
│   │   ├── auth/              Login, Registro
│   │   ├── cliente/           Inicio, NuevoVehiculo, DetalleVehiculo, Citas, NuevaCita
│   │   ├── taller/            Inicio, Citas, Ordenes, NuevaOrden, DetalleOrden, HistorialVehiculo
│   │   └── admin/             Empleados
│   ├── services/              auth.js, vehiculos.js, citas.js, ordenes.js, perfiles.js, errores.js
│   ├── utils/                 horarios.js (bloques disponibles), fechas.js, placa.js, estatusCita.js, estatusOrden.js
│   └── index.css              @theme (tokens), fuentes y clases base
├── public/fonts/              Barlow y Barlow Condensed (autoalojadas)
├── DESIGN.md                  sistema de diseño (dirección «Manual de servicio»)
├── PRODUCT.md                 contexto de producto
├── .env.local                 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (en .gitignore, no se sube a git)
├── .env.example               mismas variables sin valores (sí va en el repo)
├── vercel.json                rewrite SPA: todas las rutas → /index.html
├── .gitignore
└── README.md                  instalación, variables y cuentas demo
```

## Reglas

- En el navegador solo va la **anon key**. La `service_role` nunca se pone en el frontend.
- Las páginas no llaman a Supabase directo: pasan por `services/`, para que la lógica de datos esté en un lugar.
- Fechas en la BD como `timestamptz`; en pantalla se muestran en hora local (America/Tijuana).
- **Zona horaria fija `America/Tijuana`:** las funciones SQL validan día, hora y "desde mañana" con `fecha_hora at time zone 'America/Tijuana'`, y `utils/horarios.js` usa la misma zona (no la del navegador).
- **SQL a mano:** se pega en el SQL Editor de Supabase en el orden `schema.sql` → `functions.sql` → `policies.sql` → `seed.sql`. Los archivos son **re-ejecutables** (`create or replace`, `drop policy if exists`, `create table if not exists`, `drop … if exists` donde aplique).
- **Entrega:** repositorio público en GitHub + app desplegada en Vercel + documento de metodología. `.env.local` está en `.gitignore`; `.env.example` va en el repo; `vercel.json` hace el rewrite SPA para que las rutas de React Router funcionen al recargar.
- **Cuentas demo:** `admin`, `empleado`, `cliente1` y `cliente2` se crean desde `/registro`; `seed.sql` las busca por correo y les asigna rol. Sus contraseñas no se publican: se entregan por separado.

## Seguridad

- Los datos se protegen en la BD: RLS en todas las tablas, permisos por columna y escrituras sensibles solo mediante RPC `SECURITY DEFINER` con `search_path` fijo.
- El frontend usa únicamente la anon key de Supabase; nunca la service role.
- Todo el tráfico va por HTTPS con HSTS.
- CSP estricta (`vercel.json`): sin scripts externos ni inline; solo se permite conectar a Supabase.
- Protección contra clickjacking: `frame-ancestors 'none'` y `X-Frame-Options: DENY`.
- React escapa todo el texto; no se usa `dangerouslySetInnerHTML`.
- Los filtros de búsqueda se escapan antes de enviarse a la API.
- Validación en el cliente y restricciones de formato/longitud en la BD (teléfono de 10 dígitos, límites de texto).
- Mensajes de inicio de sesión genéricos (no revelan si el correo existe).
- `npm audit`: 0 vulnerabilidades.
