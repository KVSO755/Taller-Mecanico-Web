# TallerApp

Aplicación web para la gestión de un taller mecánico: agenda de citas sin empalmes, órdenes de servicio con avance visible para el cliente e historial por vehículo.

- Demo: https://taller-mecanico-web-kvso.vercel.app
- Repositorio: https://github.com/KVSO755/Taller-Mecanico-Web

Proyecto final de Aplicaciones Web, UABC, Facultad de Ingeniería, Arquitectura y Diseño.
Autor: Kevin Humberto Soto Ortiz.

## Funcionalidades

Hay tres roles. Quien se registra entra como cliente; el administrador puede darle acceso de empleado.

| ID | Funcionalidad | Rol(es) |
|---|---|---|
| F01 | Registro e inicio de sesión con roles | Todos |
| F02 | Gestión de empleados (dar o quitar acceso, activar o desactivar cuentas) | Administrador |
| F03 | Registrar vehículo | Cliente |
| F04 | Agendar cita (horario del taller, máximo 3 citas por bloque de 1 hora) | Cliente |
| F05 | Gestionar citas (confirmar, reprogramar, cancelar) | Empleado, Administrador |
| F06 | Crear orden de servicio desde una cita | Empleado, Administrador |
| F07 | Actualizar estatus de la orden (recibido, en diagnóstico, en reparación, listo, entregado) | Empleado, Administrador |
| F08 | Consultar historial del vehículo | Todos |

Reglas del taller: lunes a viernes de 08:00 a 18:00, sábado de 08:00 a 14:00, domingo cerrado. Las citas se agendan desde mañana y hasta 30 días adelante. El cliente puede cancelar hasta 1 hora antes.

## Stack y arquitectura

| Capa | Tecnología |
|---|---|
| Frontend | React ^19.3.1, Vite ^8.3.6, Tailwind CSS ^4.3.5, React Router ^7.18.6 |
| Backend | Supabase (`@supabase/supabase-js` ^2.119.2): Auth + PostgreSQL |
| Lint | oxlint ^1.90.0 |

- El frontend es una SPA en React + Vite con Tailwind v4; se comunica directo con Supabase.
- La autenticación usa Supabase Auth y los datos viven en PostgreSQL.
- La seguridad está en la base de datos: RLS en todas las tablas, permisos por columna (`GRANT` mínimos) y funciones RPC `SECURITY DEFINER` para las operaciones de negocio (citas, órdenes, cambios de estatus y de rol).
- `pg_cron` cancela cada minuto las citas pendientes que no se confirmaron 15 minutos después de su hora.
- La zona horaria del taller es fija, `America/Tijuana`, tanto en las funciones SQL como en `src/utils/horarios.js`.
- Diseño: interfaz en español (México), responsiva, con estética de "manual de servicio" (cobalto, amarillo de llamada, tipografía Barlow Condensed). El detalle está en `DESIGN.md` y `PRODUCT.md`.

## Requisitos

- Node.js 20.19 o superior (probado con Node 24).
- Una cuenta de Supabase (basta el plan gratuito).

## Instalación local

1. Clona el repositorio:

   ```bash
   git clone https://github.com/KVSO755/Taller-Mecanico-Web.git
   cd Taller-Mecanico-Web
   ```

2. Instala dependencias:

   ```bash
   npm install
   ```

3. Copia `.env.example` a `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

4. Llena en `.env.local`:

   ```env
   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-publishable-o-anon-key
   ```

   Usa la key publishable/anon. Nunca pongas la `service_role` en el frontend.

5. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

Antes de que la app funcione, configura Supabase como se indica abajo.

## Configurar Supabase

1. Crea un proyecto en Supabase.
2. En Authentication, desactiva "Confirm email" (proveedor Email).
3. En Authentication, pon "Minimum password length" en 8.
4. En Database > Extensions, activa `pg_cron`.
5. En Authentication > URL Configuration, define la Site URL (la URL de la demo en Vercel, o `http://localhost:5173` en local) y agrega en Redirect URLs las URLs que uses (local y Vercel).
6. En el SQL Editor, ejecuta en este orden, cada archivo completo:
   1. `supabase/schema.sql`
   2. `supabase/functions.sql`
   3. `supabase/policies.sql`
7. Crea las 4 cuentas de demo desde la ruta `/registro` de la app (tabla de la siguiente sección).
8. Ejecuta `supabase/seed.sql`. Asigna roles a admin y empleado, y crea vehículos, citas y órdenes de demo. Es re-ejecutable y solo borra los datos de cliente1 y cliente2.
9. Ejecuta `supabase/tests.sql`. Todo ocurre dentro de `begin ... rollback`, así que no deja datos. Si el SQL Editor responde "Success", todas las pruebas pasaron; si falla, el error indica `FALLÓ: <detalle>`.

## Cuentas de demo

Las contraseñas de las cuentas de demo no se publican; se entregan por separado al evaluador.

| Correo | Rol | Qué ve |
|---|---|---|
| admin@example.com | Administrador | Panel del taller (citas, órdenes) y la gestión de empleados |
| empleado@example.com | Empleado | Panel del taller: agenda, citas, órdenes e historial de vehículos |
| cliente1@example.com | Cliente (Ana Cliente) | Sus vehículos, citas, estatus de órdenes e historial |
| cliente2@example.com | Cliente (Luis Cliente) | Lo mismo, con sus propios datos |

## Guion de demo

Prueba final de los specs (flujo completo):

1. Cliente A se registra, registra el vehículo `ABC123` y agenda cita para mañana a las 10:00.
2. Clientes B, C y D intentan agendar a la misma hora; el 4.º no puede (capacidad de 3 por bloque).
3. El empleado confirma la cita de A.
4. El empleado crea la orden desde la cita (con kilometraje mayor al registrado).
5. El empleado avanza el estatus: diagnóstico, reparación, listo, entregado (con notas).
6. Cliente A ve cada cambio y, al final, el servicio en su historial.
7. Cliente A intenta abrir `/taller` y ve "No tienes permiso".
8. El administrador hace empleado a un usuario y luego lo desactiva; ya no puede entrar (y una sesión abierta queda bloqueada de inmediato).

Notas:

- El domingo el taller está cerrado. Para ver la agenda llena, ve a Citas y elige el siguiente día hábil; el seed llena las 10:00 de ese día.
- Ejecuta `supabase/seed.sql` antes de la demo para refrescar las fechas.

## Despliegue en Vercel

1. Importa el repositorio en Vercel.
2. Framework preset: Vite (build `npm run build`, salida `dist`).
3. Agrega las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. `vercel.json` ya incluye el rewrite de SPA, necesario para que las rutas como `/taller` funcionen al recargar:

   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```

5. Agrega la URL de Vercel en Site URL y Redirect URLs de Supabase.

## Estructura del repositorio

```text
.
├── specs/                  Especificaciones (fuente de verdad)
│   ├── 00-project.md ... 04-plan-de-trabajo.md
│   └── features/           F01 a F08
├── supabase/               schema.sql, functions.sql, policies.sql, seed.sql, tests.sql
├── src/
│   ├── components/         Componentes de UI reutilizables
│   ├── context/            AuthContext
│   ├── lib/                Cliente de Supabase
│   ├── pages/              auth/, cliente/, taller/, admin/
│   ├── routes/             Rutas protegidas por rol
│   ├── services/           Acceso a datos (auth, citas, ordenes, perfiles, vehiculos)
│   └── utils/              Fechas, horarios, placas, estatus
├── bitacora/               Bitácora de trabajo
├── DESIGN.md               Sistema de diseño
├── PRODUCT.md              Contexto de producto
├── Metodologia_SDD_Taller_Mecanico.md
└── vercel.json
```

## Metodología

El proyecto se desarrolló con Spec-Driven Development (SDD): las especificaciones en `specs/` son la fuente de verdad y el código y el SQL se derivan de ellas. La metodología se describe en `Metodologia_SDD_Taller_Mecanico.md` y el avance de cada etapa está registrado en la bitácora de `bitacora/`.

## Scripts npm

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo de Vite |
| `npm run build` | Compila para producción en `dist/` |
| `npm run lint` | Revisa el código con oxlint |
| `npm run preview` | Sirve localmente la compilación de producción |
