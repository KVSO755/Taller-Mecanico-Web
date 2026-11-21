<div align="center">

<img src="specs/img/logo-uabc.png" alt="Escudo UABC" width="120">

# UNIVERSIDAD AUTÓNOMA DE BAJA CALIFORNIA

## Facultad de Ingeniería, Arquitectura y Diseño

### Ingeniero en Software y Tecnologías Emergentes

<br>

## Aplicaciones Web

### Metodología SDD (Spec-Driven Development)
### Sistema de Gestión para Taller Mecánico

<br>

**Alumno:**
Kevin Humberto Soto Ortiz (377689)

**Fecha:**
22/11/2026

</div>

---

## Contenido

- [1. Proyecto final — Sistema de Gestión para Taller Mecánico](#1-proyecto-final--sistema-de-gestión-para-taller-mecánico)
- [2. Navegación y pantallas](#2-navegación-y-pantallas)
- [3. Modelo de datos](#3-modelo-de-datos)
- [4. Decisiones técnicas](#4-decisiones-técnicas)
- [5. Feature F01: Registro e inicio de sesión con roles](#5-feature-f01-registro-e-inicio-de-sesión-con-roles)
- [6. Feature F02: Gestión de empleados](#6-feature-f02-gestión-de-empleados)
- [7. Feature F03: Registrar vehículo](#7-feature-f03-registrar-vehículo)
- [8. Feature F04: Agendar cita](#8-feature-f04-agendar-cita)
- [9. Feature F05: Gestionar citas (confirmar, reprogramar, cancelar)](#9-feature-f05-gestionar-citas-confirmar-reprogramar-cancelar)
- [10. Feature F06: Crear orden de servicio](#10-feature-f06-crear-orden-de-servicio)
- [11. Feature F07: Actualizar estatus de la orden](#11-feature-f07-actualizar-estatus-de-la-orden)
- [12. Feature F08: Consultar historial del vehículo](#12-feature-f08-consultar-historial-del-vehículo)
- [13. Plan de trabajo](#13-plan-de-trabajo)

> Este documento reúne todas las specs de la carpeta `specs/`. Si cambia algo, se edita la spec y se vuelve a generar este archivo.

---

# 1. Proyecto final — Sistema de Gestión para Taller Mecánico

## Nombre

**TallerApp** (nombre provisional).

## Problema

Los talleres mecánicos pequeños y medianos manejan sus citas, órdenes de servicio y el historial de los vehículos en papel, libretas o por teléfono. Esto provoca:

- citas que se empalman porque nadie ve la agenda completa;
- pérdida de información sobre qué se le hizo a cada vehículo;
- clientes que llaman varias veces para saber si su carro ya está listo;
- falta de seguimiento del trabajo de cada mecánico.

## Usuario objetivo

| Rol | Descripción |
|---|---|
| **Cliente** | Persona dueña de uno o más vehículos que necesita agendar servicio y saber el estado de su carro sin llamar al taller. |
| **Empleado / Mecánico** | Trabajador del taller que recibe vehículos, hace el diagnóstico y actualiza el avance de la reparación. |
| **Administrador** | Dueño o encargado del taller que da de alta empleados y supervisa todas las citas y órdenes. |

Usuario principal: **el cliente**, porque es quien inicia el proceso agendando una cita.

## Propuesta de solución

Una aplicación web con acceso por rol donde:

- el cliente registra sus vehículos, agenda citas según los horarios disponibles y consulta el estatus y el historial de su vehículo;
- el taller confirma, reprograma o cancela citas, crea órdenes de servicio y actualiza su estatus;
- todo servicio terminado queda guardado en una bitácora por vehículo.

## MVP

| ID | Feature | Rol(es) | Módulo |
|---|---|---|---|
| F01 | Registro e inicio de sesión con roles | Todos | Usuarios |
| F02 | Gestión de empleados | Administrador | Usuarios |
| F03 | Registrar vehículo | Cliente | Vehículos |
| F04 | Agendar cita | Cliente | Citas |
| F05 | Gestionar citas (confirmar, reprogramar, cancelar) | Empleado, Administrador | Citas |
| F06 | Crear orden de servicio | Empleado, Administrador | Órdenes |
| F07 | Actualizar estatus de orden | Empleado, Administrador | Órdenes |
| F08 | Consultar historial del vehículo | Todos | Historial |

Cada feature tiene su spec en `specs/features/`.

## Tecnología

JavaScript · React (Vite) · Tailwind CSS · Supabase (Auth + PostgreSQL + RLS). Detalle en `03-decisiones-tecnicas.md`.

## Funcionalidades futuras (fuera del MVP)

- Notificaciones por correo o WhatsApp cuando cambia el estatus de la orden.
- Cotización con desglose de refacciones y mano de obra.
- Subir fotos del vehículo al recibirlo.
- Recuperación de contraseña por correo.
- Reportes (servicios por mes, mecánico con más órdenes).
- Asignar una orden a un mecánico específico.

## Supuestos (a validar)

Estos puntos no vienen en la propuesta original; se fijaron para poder especificar sin adivinar:

1. **Horario del taller:** lunes a viernes de 08:00 a 18:00 y sábado de 08:00 a 14:00. Domingo cerrado.
2. **Bloques de cita:** de 1 hora.
3. **Capacidad:** máximo **3 citas por bloque** (número de bahías). Es el valor que define "disponibilidad" y evita traslapes.
4. Todo el que se registra entra como **cliente**. El administrador convierte a un usuario en **empleado** (F02) cambiándole el rol. Así no se necesita crear cuentas ajenas desde el frontend (en Supabase eso exige la llave `service_role`, que nunca debe ir en el navegador). El primer administrador se asigna a mano en el panel de Supabase.
5. Un vehículo pertenece a un solo cliente. La placa es única en el sistema.
6. El historial (F08) se forma con las órdenes de servicio del vehículo; no es una tabla aparte que se llene a mano.


---

# 2. Navegación y pantallas

## Mapa de pantallas por rol

```text
Público
├── /login                      Iniciar sesión               (F01)
└── /registro                   Registro de cliente          (F01)

Cliente  (/cliente)
├── /cliente                    Inicio: mis vehículos y próximas citas
├── /cliente/vehiculos/nuevo    Registrar vehículo           (F03)
├── /cliente/vehiculos/:id      Detalle + historial          (F08)
├── /cliente/citas              Mis citas
└── /cliente/citas/nueva        Agendar cita                 (F04)

Empleado  (/taller)
├── /taller                     Inicio: citas de hoy y órdenes abiertas
├── /taller/citas               Agenda de citas              (F05)
├── /taller/ordenes             Lista de órdenes             (F07)
├── /taller/ordenes/nueva       Crear orden                  (F06)
├── /taller/ordenes/:id         Detalle y cambio de estatus  (F07)
└── /taller/vehiculos/:id       Historial del vehículo       (F08)

Administrador  (/admin)
├── todo lo de /taller
└── /admin/empleados            Alta / baja de empleados     (F02)
```

## Flujo principal del sistema

```text
Cliente se registra (F01)
   ↓
Registra su vehículo (F03)
   ↓
Agenda cita (F04)                      estatus cita: pendiente
   ↓
Taller confirma / reprograma (F05)     estatus cita: confirmada
   ↓
Cliente llega → taller crea orden (F06)   cita: atendida · orden: recibido
   ↓
Taller avanza estatus (F07)
   recibido → en diagnóstico → en reparación → listo → entregado
   ↓
La orden entregada queda en el historial (F08)
```

## Datos que viajan entre pantallas

| Desde | Hacia | Dato |
|---|---|---|
| `/cliente` | `/cliente/vehiculos/:id` | `vehiculoId` |
| `/cliente/citas/nueva` | (formulario) | `vehiculoId` opcional, si se llega desde un vehículo |
| `/taller/citas` | `/taller/ordenes/nueva` | `citaId` (la orden se precarga con el vehículo de la cita) |
| `/taller/ordenes` | `/taller/ordenes/:id` | `ordenId` |
| `/taller/ordenes/:id` | `/taller/vehiculos/:id` | `vehiculoId` |

## Reglas de acceso

- Sin sesión, cualquier ruta privada redirige a `/login`.
- Al iniciar sesión se redirige según el rol: cliente → `/cliente`; empleado y administrador → `/taller` (el admin entra a Empleados desde el menú).
- Un usuario que entra a una ruta de otro rol recibe la pantalla **"No tienes permiso"**, no la pantalla de otro rol.
- La protección real está en **la base de datos** con políticas RLS de Supabase (ver `02-data-model.md`). El frontend oculta rutas y botones, pero aunque alguien llame a la API directamente, Supabase rechaza lo que su rol no permite.

## Estados que toda pantalla de lista debe contemplar

- cargando;
- con datos;
- lista vacía (con mensaje y, si aplica, botón para crear el primero);
- error de conexión (con botón "Reintentar").

---

# 3. Modelo de datos

Primero las entidades y sus reglas; al final, cómo se implementan en Supabase.

## Entidades

```text
Perfil {
  id            (= id del usuario en Supabase Auth)
  nombre
  correo        copia del correo de Auth, para buscar en F02
  telefono
  rol           cliente | empleado | admin
  activo        true/false
  creado_en
}

Vehiculo {
  id
  cliente_id    → Perfil
  placa         única, mayúsculas, sin espacios
  marca
  modelo
  anio          1950 … año actual + 1
  kilometraje   entero ≥ 0
  creado_en
}

Cita {
  id
  cliente_id    → Perfil
  vehiculo_id   → Vehiculo
  fecha_hora    inicio del bloque de 1 hora
  motivo        texto corto ("Afinación", "Ruido en frenos")
  estatus       pendiente | confirmada | cancelada | atendida
  creado_en
}

OrdenServicio {
  id
  vehiculo_id   → Vehiculo
  cita_id       → Cita (opcional: null si la orden es directa)
  creada_por    → Perfil (empleado/admin)
  kilometraje   km al recibir el vehículo
  diagnostico   texto (puede estar vacío al inicio)
  trabajo_realizado texto (obligatorio para pasar a "listo")
  estatus       recibido | en_diagnostico | en_reparacion | listo | entregado
  creado_en
  actualizado_en
  entregado_en
}

CambioEstatus {          ← bitácora de cada cambio de una orden
  id
  orden_id      → OrdenServicio
  estatus_anterior
  estatus_nuevo
  cambiado_por  → Perfil
  creado_en
}
```

## Relaciones

```text
Perfil (cliente) 1 ── N Vehiculo
Vehiculo         1 ── N Cita
Vehiculo         1 ── N OrdenServicio
Cita             1 ── 0..1 OrdenServicio
OrdenServicio    1 ── N CambioEstatus
```

## Reglas de negocio de los datos

| Regla | Dónde se garantiza |
|---|---|
| La placa no se repite | `unique` en `vehiculos.placa` |
| Máximo 3 citas activas (`pendiente`/`confirmada`) por bloque | función `agendar_cita` / trigger en BD |
| Solo se agenda en horario del taller y a futuro | función `agendar_cita` + validación en el formulario |
| Una cita genera como máximo una orden | `unique` en `ordenes.cita_id` |
| El estatus de la orden solo avanza un paso | función `avanzar_estatus_orden` |
| Una orden `entregado` ya no se modifica | función `avanzar_estatus_orden` + RLS |
| El kilometraje de una orden no puede ser menor al del vehículo | trigger al crear orden; luego actualiza `vehiculos.kilometraje` |

Las reglas importantes se validan **en la base de datos**, no solo en React, porque el cliente de Supabase se puede llamar directamente desde el navegador.

## Permisos por rol (RLS)

| Tabla | Cliente | Empleado | Admin |
|---|---|---|---|
| perfiles | ver/editar el suyo | ver todos | ver todos, cambiar `rol` y `activo` |
| vehiculos | ver/crear/editar los suyos | ver todos | ver todos |
| citas | ver las suyas; crear; cancelar las suyas | ver todas; cambiar estatus y fecha | igual que empleado |
| ordenes | ver las de sus vehículos | ver, crear, avanzar estatus | igual que empleado |
| cambios_estatus | ver los de sus órdenes | ver todos | ver todos |

Función auxiliar para las políticas: `public.mi_rol()` devuelve el rol del usuario actual (`auth.uid()`).

## Esquema SQL (Supabase)

```sql
create type rol_usuario   as enum ('cliente','empleado','admin');
create type estatus_cita  as enum ('pendiente','confirmada','cancelada','atendida');
create type estatus_orden as enum ('recibido','en_diagnostico','en_reparacion','listo','entregado');

create table perfiles (
  id uuid primary key references auth.users on delete cascade,
  nombre text not null,
  correo text not null unique,
  telefono text,
  rol rol_usuario not null default 'cliente',
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table vehiculos (
  id bigint generated always as identity primary key,
  cliente_id uuid not null references perfiles,
  placa text not null unique,
  marca text not null,
  modelo text not null,
  anio int not null check (anio between 1950 and extract(year from now())::int + 1),
  kilometraje int not null check (kilometraje >= 0),
  creado_en timestamptz not null default now()
);

create table citas (
  id bigint generated always as identity primary key,
  cliente_id uuid not null references perfiles,
  vehiculo_id bigint not null references vehiculos,
  fecha_hora timestamptz not null,
  motivo text not null,
  estatus estatus_cita not null default 'pendiente',
  creado_en timestamptz not null default now()
);

create table ordenes (
  id bigint generated always as identity primary key,
  vehiculo_id bigint not null references vehiculos,
  cita_id bigint unique references citas,
  creada_por uuid not null references perfiles,
  kilometraje int not null check (kilometraje >= 0),
  diagnostico text,
  trabajo_realizado text,
  estatus estatus_orden not null default 'recibido',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  entregado_en timestamptz
);

create table cambios_estatus (
  id bigint generated always as identity primary key,
  orden_id bigint not null references ordenes on delete cascade,
  estatus_anterior estatus_orden,
  estatus_nuevo estatus_orden not null,
  cambiado_por uuid not null references perfiles,
  creado_en timestamptz not null default now()
);
```

Además (se detallan en cada feature):

- trigger `crear_perfil` en `auth.users` → inserta el perfil con rol `cliente` al registrarse (F01);
- función `agendar_cita(...)` (F04) y `reprogramar_cita(...)` (F05);
- función `crear_orden(...)` (F06);
- función `avanzar_estatus_orden(orden_id, ...)` (F07);
- políticas RLS de la tabla anterior.

---

# 4. Decisiones técnicas

Se decidieron **después** de definir el problema, las features y los datos.

| Necesidad | Herramienta | Por qué |
|---|---|---|
| Lenguaje | JavaScript | Requisito del equipo. |
| Interfaz | React + Vite | Componentes por pantalla; Vite arranca rápido. |
| Rutas | React Router | Rutas por rol (`/cliente`, `/taller`, `/admin`). |
| Estilos | Tailwind CSS | Estilos rápidos sin escribir CSS aparte; responsivo para celular. |
| Login | Supabase Auth (correo + contraseña) | Ya maneja contraseñas, sesiones y tokens. |
| Base de datos | Supabase (PostgreSQL) | Relaciones entre clientes, vehículos, citas y órdenes. |
| Permisos | Row Level Security (RLS) | Cada rol solo lee/escribe lo que le toca, aunque llamen a la API directo. |
| Reglas críticas | Funciones SQL (`rpc`) | Capacidad de citas y avance de estatus se validan en un solo lugar. |

**No** se usan en el MVP: Redux/Zustand (basta con un `AuthContext` y estado local), Edge Functions, librerías de UI extra.

## Estructura del repositorio

```text
Taller_Mecanico/
├── specs/                     ← specs SDD
├── supabase/
│   ├── schema.sql             tablas, tipos, triggers
│   ├── policies.sql           RLS
│   ├── functions.sql          agendar_cita, reprogramar_cita, avanzar_estatus_orden
│   └── seed.sql               datos de prueba
├── src/
│   ├── lib/supabase.js        cliente de Supabase
│   ├── context/AuthContext.jsx  sesión + perfil + rol
│   ├── components/            Botones, Input, EstadoLista, Badge de estatus, Layout
│   ├── routes/RutaProtegida.jsx
│   ├── pages/
│   │   ├── auth/              Login, Registro
│   │   ├── cliente/           Inicio, NuevoVehiculo, DetalleVehiculo, Citas, NuevaCita
│   │   ├── taller/            Inicio, Citas, Ordenes, NuevaOrden, DetalleOrden, HistorialVehiculo
│   │   └── admin/             Empleados
│   ├── services/              vehiculos.js, citas.js, ordenes.js, perfiles.js
│   └── utils/                 horarios.js (bloques disponibles), formato.js
├── .env.local                 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (no se sube a git)
└── README.md
```

## Reglas

- En el navegador solo va la **anon key**. La `service_role` nunca se pone en el frontend.
- Las páginas no llaman a Supabase directo: pasan por `services/`, para que la lógica de datos esté en un lugar.
- Fechas en la BD como `timestamptz`; en pantalla se muestran en hora local (America/Tijuana).

---

# 5. Feature F01: Registro e inicio de sesión con roles

## Objetivo

Que cada persona entre al sistema con su cuenta y vea solo las pantallas de su rol.

## Actor

Cliente (registro e inicio de sesión). Empleado y administrador (solo inicio de sesión).

## Precondiciones

- Para iniciar sesión: tener una cuenta creada.
- Para registrarse: no tener una cuenta con ese correo.

## Datos de entrada

**Registro:** nombre completo, teléfono, correo, contraseña, confirmar contraseña.
**Inicio de sesión:** correo, contraseña.

## Flujo principal — Registro

1. El usuario abre `/registro`.
2. Captura sus datos y presiona "Crear cuenta".
3. El sistema valida los datos.
4. Supabase Auth crea el usuario; un trigger crea su perfil con rol `cliente`.
5. El sistema inicia la sesión y lo lleva a `/cliente`.

## Flujo principal — Inicio de sesión

1. El usuario abre `/login`, captura correo y contraseña y presiona "Entrar".
2. Supabase valida las credenciales.
3. El sistema lee el perfil (`rol`, `activo`).
4. Redirige: cliente → `/cliente`; empleado/admin → `/taller`.

## Flujo — Cerrar sesión

Botón "Salir" en el menú → se cierra la sesión → regresa a `/login`.

## Validaciones

- Nombre: obligatorio, mínimo 3 caracteres.
- Teléfono: obligatorio, 10 dígitos.
- Correo: obligatorio y con formato válido.
- Contraseña: mínimo 6 caracteres (mínimo de Supabase).
- Confirmar contraseña: igual a la contraseña.
- El botón "Crear cuenta" / "Entrar" está deshabilitado mientras se envía (evita doble envío).

## Casos de error

| Situación | Mensaje |
|---|---|
| Correo ya registrado | "Ya existe una cuenta con este correo." |
| Correo o contraseña incorrectos | "Correo o contraseña incorrectos." (no decir cuál de los dos) |
| Perfil con `activo = false` | Se cierra la sesión: "Tu cuenta está desactivada. Contacta al taller." |
| Sin conexión | "No se pudo conectar. Revisa tu internet e intenta de nuevo." |
| Usuario entra a una ruta de otro rol | Pantalla "No tienes permiso" con botón a su inicio. |
| Usuario sin sesión entra a ruta privada | Redirige a `/login`. |

## Resultado esperado

El usuario queda con sesión iniciada y ve únicamente el menú y las pantallas de su rol. Al recargar la página la sesión se mantiene.

## Criterios de aceptación

- [ ] Un cliente nuevo puede registrarse y queda en `/cliente`.
- [ ] El perfil se crea automáticamente con rol `cliente`.
- [ ] No se puede registrar dos veces el mismo correo.
- [ ] No se puede enviar el registro si las contraseñas no coinciden.
- [ ] Con credenciales incorrectas aparece el mensaje genérico de error.
- [ ] Un empleado que inicia sesión llega a `/taller`.
- [ ] Un cliente que escribe `/taller` en la URL ve "No tienes permiso".
- [ ] Al recargar la página no se pierde la sesión.
- [ ] "Salir" cierra la sesión y regresa a `/login`.
- [ ] Una cuenta desactivada no puede entrar.

## Tasks

- [ ] Crear proyecto en Supabase y guardar URL + anon key en `.env.local`.
- [ ] Crear proyecto React con Vite + Tailwind + React Router.
- [ ] Crear `src/lib/supabase.js`.
- [ ] SQL: tabla `perfiles` + trigger `crear_perfil` al insertar en `auth.users` (toma `nombre` y `telefono` de `raw_user_meta_data`).
- [ ] SQL: función `mi_rol()` y RLS de `perfiles`.
- [ ] Crear `AuthContext` (sesión, perfil, `login`, `registro`, `logout`, escucha `onAuthStateChange`).
- [ ] Crear `RutaProtegida` que recibe los roles permitidos.
- [ ] Pantalla `Login`.
- [ ] Pantalla `Registro` con validaciones.
- [ ] Pantalla `SinPermiso`.
- [ ] `Layout` con menú según el rol y botón "Salir".
- [ ] Asignar rol `admin` a la primera cuenta desde el panel de Supabase.
- [ ] Probar criterios de aceptación.

---

# 6. Feature F02: Gestión de empleados

## Objetivo

Que el administrador decida quién trabaja en el taller: dar acceso de empleado a un usuario y quitárselo cuando ya no trabaje ahí.

## Actor

Administrador.

## Precondiciones

- El administrador tiene sesión iniciada.
- La persona que será empleado ya creó su cuenta en `/registro` (entra como cliente).

## Datos de entrada

- Correo del usuario a buscar.
- Acción: "Hacer empleado", "Quitar acceso de empleado", "Desactivar" / "Activar".

## Flujo principal — Dar de alta un empleado

1. El administrador abre `/admin/empleados`.
2. Ve la lista de empleados (nombre, correo, teléfono, estado activo/inactivo).
3. Escribe el correo de la persona en "Agregar empleado" y presiona "Buscar".
4. El sistema muestra el usuario encontrado (nombre y rol actual).
5. El administrador presiona "Hacer empleado" y confirma.
6. El rol cambia a `empleado` y aparece en la lista.

## Flujo — Quitar acceso / desactivar

- "Quitar acceso": el rol vuelve a `cliente` (conserva sus vehículos si tenía).
- "Desactivar": `activo = false`; la persona ya no puede iniciar sesión (ver F01). "Activar" lo revierte.
- Ambas acciones piden confirmación.

## Validaciones

- El correo es obligatorio y con formato válido.
- No se puede cambiar el rol ni desactivar **la propia cuenta** del administrador (evita que el taller se quede sin admin).
- Solo el rol `admin` puede cambiar `rol` y `activo` (regla RLS, no solo en la pantalla).

## Casos de error

| Situación | Mensaje |
|---|---|
| No existe usuario con ese correo | "No hay ninguna cuenta con ese correo. Pide a la persona que se registre primero." |
| El usuario ya es empleado | "Esta persona ya es empleado." |
| Falla al guardar | "No se pudo guardar el cambio. Intenta de nuevo." |
| Lista vacía | "Aún no hay empleados registrados." |

## Resultado esperado

La persona dada de alta inicia sesión y entra a `/taller` con permisos de empleado.

## Criterios de aceptación

- [ ] El administrador ve la lista de empleados.
- [ ] Buscar un correo existente muestra el usuario; uno inexistente muestra el mensaje de error.
- [ ] "Hacer empleado" cambia el rol y la persona aparece en la lista.
- [ ] Al volver a iniciar sesión, el nuevo empleado llega a `/taller`.
- [ ] "Desactivar" impide que esa persona inicie sesión.
- [ ] El administrador no ve botones para modificarse a sí mismo.
- [ ] Un empleado que intenta cambiar un rol (desde la consola) es rechazado por Supabase.

## Tasks

- [ ] SQL: agregar columna `correo` a `perfiles` (la llena el trigger de F01) para poder buscar por correo.
- [ ] SQL: política RLS — solo `admin` hace `update` de `rol` y `activo`.
- [ ] `services/perfiles.js`: `listarEmpleados`, `buscarPorCorreo`, `cambiarRol`, `cambiarActivo`.
- [ ] Pantalla `admin/Empleados` con lista y estados (cargando, vacía, error).
- [ ] Formulario "Agregar empleado" (buscar + confirmar).
- [ ] Botones con confirmación para quitar acceso y desactivar.
- [ ] Probar criterios de aceptación.

---

# 7. Feature F03: Registrar vehículo

## Objetivo

Que el cliente registre sus vehículos para poder agendar citas y consultar su historial.

## Actor

Cliente.

## Precondiciones

- El cliente tiene sesión iniciada.

## Datos de entrada

- placa;
- marca;
- modelo;
- año;
- kilometraje actual.

## Flujo principal

1. El cliente presiona "Agregar vehículo" en su inicio (`/cliente`).
2. El sistema muestra el formulario en `/cliente/vehiculos/nuevo`.
3. El cliente captura los datos y presiona "Guardar".
4. El sistema normaliza la placa (mayúsculas, sin espacios ni guiones) y valida.
5. El vehículo se guarda asociado al cliente.
6. El cliente regresa a `/cliente` y el vehículo aparece en "Mis vehículos".

## Flujo alterno — Editar kilometraje

Desde el detalle del vehículo el cliente puede corregir marca, modelo, año y kilometraje. La placa no se edita.

## Validaciones

- Placa: obligatoria, 5 a 8 caracteres alfanuméricos después de normalizar.
- Marca y modelo: obligatorios.
- Año: número entre 1950 y año actual + 1.
- Kilometraje: entero mayor o igual a 0.
- El botón "Guardar" está deshabilitado mientras falte un campo obligatorio o se esté enviando.

## Casos de error

| Situación | Mensaje |
|---|---|
| La placa ya existe | "Ya hay un vehículo registrado con esta placa." |
| Campo inválido | Mensaje bajo el campo (ej. "El año debe estar entre 1950 y 2027"). |
| Falla al guardar | "No se pudo guardar el vehículo. Intenta de nuevo." (los datos del formulario se conservan) |
| Cliente sin vehículos | En inicio: "Aún no tienes vehículos registrados" + botón "Agregar vehículo". |

## Resultado esperado

El vehículo aparece en la lista del cliente y está disponible para agendar citas.

## Criterios de aceptación

- [ ] El cliente puede abrir el formulario desde su inicio.
- [ ] "abc-123" se guarda como "ABC123".
- [ ] No se puede guardar con campos obligatorios vacíos.
- [ ] No se puede guardar un año fuera de rango ni kilometraje negativo.
- [ ] Una placa repetida muestra el mensaje de error y no se guarda.
- [ ] El vehículo aparece en "Mis vehículos" después de guardar.
- [ ] Un cliente no ve los vehículos de otro cliente.

## Tasks

- [ ] SQL: tabla `vehiculos` + RLS (cliente: los suyos; empleado/admin: todos).
- [ ] `services/vehiculos.js`: `listarMisVehiculos`, `crearVehiculo`, `actualizarVehiculo`, `obtenerVehiculo`.
- [ ] Componente `FormVehiculo` con validaciones.
- [ ] Pantalla `cliente/NuevoVehiculo`.
- [ ] Sección "Mis vehículos" en `cliente/Inicio` con estado vacío.
- [ ] Traducir el error de `unique` (código `23505`) al mensaje de placa repetida.
- [ ] Probar criterios de aceptación.

---

# 8. Feature F04: Agendar cita

## Objetivo

Que el cliente aparte una cita para su vehículo en un horario con lugar disponible, sin que el taller tenga citas empalmadas.

## Actor

Cliente.

## Precondiciones

- El cliente tiene sesión iniciada.
- El cliente tiene al menos un vehículo registrado (F03).

## Datos de entrada

- vehículo (de los suyos);
- fecha;
- hora (bloque de 1 hora disponible);
- motivo (texto corto).

## Reglas de disponibilidad

- Horario: lunes a viernes 08:00–18:00 (último bloque 17:00); sábado 08:00–14:00 (último bloque 13:00); domingo cerrado.
- Capacidad: máximo **3** citas con estatus `pendiente` o `confirmada` en el mismo bloque.
- Solo fechas futuras: desde mañana hasta 30 días adelante.
- Un vehículo no puede tener dos citas activas (`pendiente`/`confirmada`) al mismo tiempo.

## Flujo principal

1. El cliente presiona "Agendar cita".
2. El sistema muestra el formulario en `/cliente/citas/nueva`.
3. El cliente elige vehículo y fecha.
4. El sistema muestra solo los bloques con lugar disponible de ese día.
5. El cliente elige un bloque, escribe el motivo y presiona "Agendar".
6. El sistema llama a la función `agendar_cita`, que vuelve a revisar la capacidad **en la base de datos** (por si alguien tomó el último lugar mientras tanto).
7. La cita se guarda con estatus `pendiente`.
8. El cliente va a `/cliente/citas` y ve su cita con la etiqueta "Pendiente de confirmar".

## Flujo alterno — Cancelar mi cita

En `/cliente/citas`, una cita `pendiente` o `confirmada` tiene botón "Cancelar" (con confirmación). Pasa a `cancelada` y libera el lugar.

## Validaciones

- Vehículo, fecha, hora y motivo son obligatorios.
- Motivo: entre 5 y 200 caracteres.
- El vehículo debe pertenecer al cliente (lo revisa la función).

## Casos de error

| Situación | Mensaje |
|---|---|
| Cliente sin vehículos | "Primero registra un vehículo" + botón a F03. |
| Día cerrado (domingo) | "El taller no abre ese día." y no se muestran bloques. |
| Día sin lugares | "No hay horarios disponibles ese día. Elige otra fecha." |
| El bloque se llenó al momento de guardar | "Ese horario se acaba de ocupar. Elige otro." y se recargan los bloques. |
| El vehículo ya tiene una cita activa | "Este vehículo ya tiene una cita el {fecha}." |
| Falla de conexión | "No se pudo agendar la cita. Intenta de nuevo." |

## Resultado esperado

La cita aparece en "Mis citas" del cliente como pendiente y en la agenda del taller (F05).

## Criterios de aceptación

- [ ] Un cliente sin vehículos no puede abrir el formulario y ve el aviso.
- [ ] No se pueden elegir domingos ni fechas pasadas.
- [ ] Un bloque con 3 citas activas no aparece como disponible.
- [ ] Si dos clientes intentan el último lugar a la vez, solo uno lo obtiene; el otro ve el mensaje.
- [ ] Un vehículo con cita activa no puede agendar otra.
- [ ] La cita se guarda como `pendiente` y aparece en "Mis citas".
- [ ] Cancelar una cita la pasa a `cancelada` y el lugar vuelve a estar disponible.

## Tasks

- [ ] SQL: tabla `citas` + RLS.
- [ ] SQL: función `agendar_cita(vehiculo_id, fecha_hora, motivo)` que valida horario, dueño, capacidad y cita activa del vehículo, y bloquea con `lock`/`for update` para evitar carreras.
- [ ] SQL: función `bloques_ocupados(fecha)` que devuelve cuántas citas activas hay por hora (sin datos personales).
- [ ] `utils/horarios.js`: generar bloques del día según el horario.
- [ ] `services/citas.js`: `agendarCita`, `misCitas`, `cancelarCita`, `bloquesDisponibles`.
- [ ] Pantalla `cliente/NuevaCita` (selector de vehículo, fecha, bloques).
- [ ] Pantalla `cliente/Citas` con estatus y botón cancelar.
- [ ] Probar criterios de aceptación (incluir prueba con 3 citas en el mismo bloque).

---

# 9. Feature F05: Gestionar citas (confirmar, reprogramar, cancelar)

## Objetivo

Que el taller vea todas las citas y decida sobre cada una: confirmarla, moverla a otro horario o cancelarla.

## Actor

Empleado y Administrador.

## Precondiciones

- Sesión iniciada con rol `empleado` o `admin`.
- Existen citas registradas (F04).

## Datos de entrada

- Filtro de fecha (por defecto: hoy) y filtro de estatus.
- Para reprogramar: nueva fecha y hora.
- Para cancelar: motivo de cancelación (opcional).

## Flujo principal — Confirmar

1. El empleado abre `/taller/citas`.
2. Ve la agenda del día agrupada por hora: cliente, teléfono, vehículo (placa, marca, modelo), motivo y estatus.
3. En una cita `pendiente` presiona "Confirmar".
4. La cita pasa a `confirmada`.

## Flujo — Reprogramar

1. En una cita `pendiente` o `confirmada` presiona "Reprogramar".
2. Elige nueva fecha y bloque (solo se muestran bloques con lugar, mismas reglas de F04).
3. Presiona "Guardar". La función `reprogramar_cita` revisa capacidad y cambia `fecha_hora`. La cita queda `confirmada`.

## Flujo — Cancelar

1. Presiona "Cancelar" y confirma.
2. La cita pasa a `cancelada` y libera el lugar.

## Flujo — Atender

En una cita `confirmada` el botón "Crear orden" lleva a F06 con la cita precargada. Al crear la orden, la cita pasa a `atendida`.

## Transiciones permitidas

```text
pendiente  → confirmada | cancelada
confirmada → cancelada  | atendida (solo vía F06)
reprogramar: permitido en pendiente o confirmada
cancelada y atendida: estados finales
```

## Validaciones

- Solo se reprograma a una fecha futura, dentro del horario y con lugar.
- No se puede modificar una cita `cancelada` o `atendida` (no se muestran botones y la BD lo rechaza).

## Casos de error

| Situación | Mensaje |
|---|---|
| No hay citas en la fecha | "No hay citas para este día." |
| El nuevo bloque se llenó | "Ese horario ya no tiene lugar. Elige otro." |
| La cita cambió mientras se veía (ej. el cliente la canceló) | "Esta cita ya fue modificada. Se actualizó la lista." |
| Falla de conexión | "No se pudo actualizar la cita. Intenta de nuevo." |

## Resultado esperado

El cliente ve en "Mis citas" el nuevo estatus o la nueva fecha.

## Criterios de aceptación

- [ ] El empleado ve las citas de todos los clientes del día seleccionado.
- [ ] Puede filtrar por fecha y por estatus.
- [ ] "Confirmar" cambia la cita a `confirmada` y el cliente lo ve.
- [ ] "Reprogramar" solo ofrece bloques con lugar y actualiza la fecha.
- [ ] "Cancelar" pide confirmación y libera el lugar.
- [ ] Una cita `cancelada` o `atendida` no tiene botones de acción.
- [ ] Un cliente no puede confirmar ni reprogramar citas (RLS).

## Tasks

- [ ] SQL: RLS de `citas` para empleado/admin (select todas, update estatus).
- [ ] SQL: función `reprogramar_cita(cita_id, nueva_fecha_hora)` reutilizando la validación de capacidad de F04.
- [ ] SQL: validar transiciones de estatus (trigger o función `cambiar_estatus_cita`).
- [ ] `services/citas.js`: `citasPorFecha`, `confirmarCita`, `reprogramarCita`, `cancelarCita`.
- [ ] Pantalla `taller/Citas` con filtros y agenda por hora.
- [ ] Modal `ReprogramarCita` reutilizando el selector de bloques de F04.
- [ ] Componente `BadgeEstatus` (colores por estatus).
- [ ] Probar criterios de aceptación.

---

# 10. Feature F06: Crear orden de servicio

## Objetivo

Registrar formalmente que el taller recibió un vehículo para trabajarlo, ya sea porque llegó a su cita o porque llegó sin cita.

## Actor

Empleado y Administrador.

## Precondiciones

- Sesión iniciada con rol `empleado` o `admin`.
- **Desde cita:** la cita está `confirmada`.
- **Directa:** el vehículo ya está registrado. Si el cliente es nuevo, primero se registra él mismo (F01) y registra su vehículo (F03).

## Datos de entrada

- vehículo (precargado si viene de una cita; si es directa, se busca por placa);
- kilometraje de llegada;
- diagnóstico inicial (opcional: puede escribirse después en F07).

## Flujo principal — Desde una cita

1. En `/taller/citas` el empleado presiona "Crear orden" en una cita confirmada.
2. El sistema abre `/taller/ordenes/nueva?citaId=…` con vehículo y cliente precargados.
3. El empleado captura el kilometraje y, si quiere, un diagnóstico inicial.
4. Presiona "Crear orden".
5. El sistema crea la orden con estatus `recibido`, la liga a la cita, pasa la cita a `atendida`, actualiza el kilometraje del vehículo y registra el primer `CambioEstatus`.
6. Redirige a `/taller/ordenes/:id`.

## Flujo alterno — Orden directa (sin cita)

1. En `/taller/ordenes` presiona "Nueva orden".
2. Escribe la placa y presiona "Buscar".
3. El sistema muestra el vehículo y su dueño.
4. Continúa igual que el paso 3 del flujo principal, con `cita_id = null`.

## Validaciones

- Vehículo obligatorio.
- Kilometraje obligatorio, entero, **mayor o igual** al kilometraje registrado del vehículo.
- Un vehículo no puede tener dos órdenes abiertas (estatus distinto de `entregado`).
- Una cita solo puede generar una orden.

## Casos de error

| Situación | Mensaje |
|---|---|
| Placa no encontrada | "No hay ningún vehículo con esa placa. El cliente debe registrarlo primero." |
| Kilometraje menor al registrado | "El kilometraje no puede ser menor a {km} km (último registrado)." |
| El vehículo ya tiene una orden abierta | "Este vehículo ya tiene la orden #{id} abierta." + enlace a ella. |
| La cita ya tiene orden | "Esta cita ya tiene una orden." + enlace. |
| Falla al guardar | "No se pudo crear la orden. Intenta de nuevo." |

## Resultado esperado

La orden aparece en `/taller/ordenes` con estatus "Recibido", y el cliente ve en el detalle de su vehículo que está en el taller.

## Criterios de aceptación

- [ ] Desde una cita confirmada se crea la orden con el vehículo precargado.
- [ ] Al crearla, la cita pasa a `atendida`.
- [ ] Se puede crear una orden directa buscando por placa.
- [ ] No se acepta un kilometraje menor al del vehículo.
- [ ] Al crear la orden, el kilometraje del vehículo se actualiza.
- [ ] No se pueden crear dos órdenes abiertas para el mismo vehículo.
- [ ] La orden nueva tiene estatus `recibido` y un registro en la bitácora de cambios.
- [ ] El cliente ve el estatus "Recibido" en su vehículo.

## Tasks

- [ ] SQL: tablas `ordenes` y `cambios_estatus` + RLS.
- [ ] SQL: función `crear_orden(vehiculo_id, cita_id, kilometraje, diagnostico)` que hace todo en una transacción (orden, cita atendida, km, bitácora).
- [ ] `services/ordenes.js`: `crearOrden`, `buscarVehiculoPorPlaca`.
- [ ] Pantalla `taller/NuevaOrden` (modo cita y modo directo).
- [ ] Botón "Crear orden" en `taller/Citas`.
- [ ] Probar criterios de aceptación.

---

# 11. Feature F07: Actualizar estatus de la orden

## Objetivo

Que el taller registre el avance del trabajo y el cliente sepa en qué etapa está su vehículo sin llamar.

## Actor

Empleado y Administrador (actualizan). Cliente (solo consulta).

## Precondiciones

- Existe una orden creada (F06).

## Ciclo de estatus

```text
recibido → en_diagnostico → en_reparacion → listo → entregado
```

| Estatus | Se muestra al cliente como |
|---|---|
| recibido | Recibido en el taller |
| en_diagnostico | En diagnóstico |
| en_reparacion | En reparación |
| listo | Listo para recoger |
| entregado | Entregado |

## Datos de entrada

- Diagnóstico (texto).
- Trabajo realizado (texto).
- Acción "Avanzar a {siguiente estatus}".

## Flujo principal

1. El empleado abre `/taller/ordenes` (por defecto muestra las órdenes abiertas, de la más antigua a la más nueva).
2. Entra a una orden en `/taller/ordenes/:id`.
3. Ve: vehículo, cliente y teléfono, kilometraje, estatus actual, diagnóstico, trabajo realizado y la bitácora de cambios.
4. Edita diagnóstico o trabajo realizado y presiona "Guardar notas".
5. Presiona "Avanzar a {siguiente}" y confirma.
6. La función `avanzar_estatus_orden` valida y cambia el estatus, registra el cambio en la bitácora con quién y cuándo.
7. La pantalla muestra el nuevo estatus.

## Reglas de avance

- Solo se avanza **un paso** a la vez y nunca hacia atrás.
- Para pasar a `en_reparacion` el diagnóstico debe estar escrito.
- Para pasar a `listo` el trabajo realizado debe estar escrito.
- Al pasar a `entregado` se guarda `entregado_en`; la orden queda cerrada y ya no se edita.

## Flujo — Vista del cliente

En `/cliente/vehiculos/:id` el cliente ve la orden abierta con una barra de progreso de 5 pasos, el diagnóstico y la fecha del último cambio. No ve botones de edición.

## Casos de error

| Situación | Mensaje |
|---|---|
| Falta diagnóstico al pasar a reparación | "Escribe el diagnóstico antes de pasar a reparación." |
| Falta trabajo realizado al pasar a listo | "Describe el trabajo realizado antes de marcar como listo." |
| Otro empleado ya avanzó la orden | "La orden ya fue actualizada por otra persona." y se recarga. |
| Orden entregada | Sin botones de edición; aviso "Orden cerrada". |
| Sin órdenes abiertas | "No hay órdenes abiertas." |
| Falla de conexión | "No se pudo actualizar la orden. Intenta de nuevo." |

## Resultado esperado

El estatus cambia y el cliente lo ve en el detalle de su vehículo al recargar.

## Criterios de aceptación

- [ ] El empleado ve la lista de órdenes abiertas y puede filtrar por estatus.
- [ ] Solo aparece el botón para avanzar al siguiente estatus.
- [ ] No se puede pasar a `en_reparacion` sin diagnóstico.
- [ ] No se puede pasar a `listo` sin trabajo realizado.
- [ ] Cada cambio queda en la bitácora con usuario y fecha.
- [ ] Una orden `entregado` no se puede editar.
- [ ] El cliente ve el estatus actual con barra de progreso y no puede modificarlo.
- [ ] Un cliente que intenta actualizar una orden (desde la consola) es rechazado.

## Tasks

- [ ] SQL: función `avanzar_estatus_orden(orden_id, estatus_esperado)` (valida paso siguiente, campos obligatorios, escribe bitácora; usa `estatus_esperado` para detectar cambios simultáneos).
- [ ] SQL: RLS para que solo empleado/admin actualicen `diagnostico` y `trabajo_realizado`, y no en órdenes entregadas.
- [ ] `services/ordenes.js`: `listarOrdenes`, `obtenerOrden`, `guardarNotas`, `avanzarEstatus`.
- [ ] Pantalla `taller/Ordenes` con filtro.
- [ ] Pantalla `taller/DetalleOrden` con notas, botón de avance y bitácora.
- [ ] Componente `ProgresoOrden` (5 pasos) usado por taller y cliente.
- [ ] Mostrar la orden abierta en `cliente/DetalleVehiculo`.
- [ ] Probar criterios de aceptación.

---

# 12. Feature F08: Consultar historial del vehículo

## Objetivo

Tener una bitácora de todo lo que se le ha hecho a cada vehículo, para que el cliente y el taller la consulten sin depender de papeles.

## Actor

Cliente (solo sus vehículos). Empleado y Administrador (cualquier vehículo).

## Precondiciones

- El vehículo existe.

## Datos de entrada

- `vehiculoId` (desde "Mis vehículos" o desde una orden).
- Para el taller: búsqueda por placa.

## Qué muestra

**Encabezado:** placa, marca, modelo, año, kilometraje actual, dueño (solo para el taller).

**Orden en curso** (si existe): estatus con barra de progreso (F07).

**Servicios anteriores** (órdenes `entregado`), del más reciente al más antiguo:

- fecha de entrega;
- kilometraje al recibirlo;
- motivo de la cita (si vino de cita);
- diagnóstico;
- trabajo realizado.

Al expandir un servicio se ve su bitácora de cambios de estatus con fechas.

## Flujo principal — Cliente

1. En `/cliente` presiona un vehículo de "Mis vehículos".
2. El sistema abre `/cliente/vehiculos/:id` con encabezado, orden en curso e historial.

## Flujo principal — Taller

1. Desde el detalle de una orden presiona "Ver historial del vehículo", o en el inicio de `/taller` busca por placa.
2. El sistema abre `/taller/vehiculos/:id`.

## Validaciones

- El cliente solo puede abrir vehículos suyos (RLS). Si cambia el `id` en la URL a uno ajeno, ve "Vehículo no encontrado".

## Casos de error

| Situación | Mensaje |
|---|---|
| Vehículo sin servicios | "Este vehículo aún no tiene servicios registrados." |
| Vehículo no existe o no es del cliente | "Vehículo no encontrado." + botón para regresar. |
| Placa no encontrada (taller) | "No hay ningún vehículo con esa placa." |
| Falla de conexión | "No se pudo cargar el historial." + botón "Reintentar". |

## Resultado esperado

Cliente y taller ven la misma información del vehículo; cada servicio entregado aparece automáticamente sin capturarlo de nuevo.

## Criterios de aceptación

- [ ] El cliente ve el historial de cada uno de sus vehículos.
- [ ] Al entregar una orden (F07), aparece en el historial sin pasos extra.
- [ ] Los servicios se ordenan del más reciente al más antiguo.
- [ ] Un vehículo sin servicios muestra el mensaje vacío.
- [ ] Un cliente que cambia el id en la URL a un vehículo ajeno ve "Vehículo no encontrado".
- [ ] El taller encuentra el historial buscando por placa.

## Tasks

- [ ] `services/vehiculos.js`: `historialVehiculo(id)` (vehículo + órdenes con su cita y bitácora en una consulta con `select` anidado).
- [ ] Componente `HistorialServicios` (lista expandible) reutilizado por cliente y taller.
- [ ] Pantalla `cliente/DetalleVehiculo` (encabezado + orden en curso + historial).
- [ ] Pantalla `taller/HistorialVehiculo`.
- [ ] Buscador por placa en `taller/Inicio`.
- [ ] Probar criterios de aceptación.

---

# 13. Plan de trabajo

**Entrega:** domingo 22 de noviembre de 2026, 22:00.
**Inicio:** sábado 21 de noviembre de 2026.

## Orden de implementación

Se sigue el flujo real del sistema: sin login no hay vehículos, sin vehículos no hay citas, sin citas no hay órdenes.

```text
F01 Login/roles → F03 Vehículo → F04 Agendar cita → F05 Gestionar citas
   → F06 Crear orden → F07 Estatus → F08 Historial → F02 Empleados
```

F02 va al final porque, si falta tiempo, el rol de empleado se puede asignar a mano en Supabase y el resto del sistema funciona igual.

## Ciclo por feature

```text
1. Releer la spec
2. SQL (tabla, RLS, función) en Supabase
3. services/*.js
4. Pantallas
5. Probar criterios de aceptación (marcar [x] en la spec)
6. Si algo cambió, actualizar la spec
```

## Calendario

### Sábado 21

| Hora | Trabajo | Listo cuando… |
|---|---|---|
| 12:00 – 13:00 | Revisar specs; crear proyecto Supabase y React + Vite + Tailwind + Router | La app abre en `localhost` y conecta a Supabase |
| 13:00 – 15:30 | **F01** Registro, login, roles, `RutaProtegida`, Layout | Criterios F01 ✔ |
| 15:30 – 16:15 | Comida / descanso | |
| 16:15 – 17:30 | **F03** Registrar vehículo | Criterios F03 ✔ |
| 17:30 – 20:30 | **F04** Agendar cita (función `agendar_cita`, bloques) | Criterios F04 ✔ |
| 20:30 – 22:30 | **F05** Gestionar citas | Criterios F05 ✔ |

**Meta del sábado:** un cliente puede registrarse, registrar su carro y agendar; el taller puede confirmar la cita.

### Domingo 22

| Hora | Trabajo | Listo cuando… |
|---|---|---|
| 09:00 – 11:00 | **F06** Crear orden | Criterios F06 ✔ |
| 11:00 – 13:30 | **F07** Actualizar estatus + barra de progreso | Criterios F07 ✔ |
| 13:30 – 14:15 | Comida | |
| 14:15 – 15:45 | **F08** Historial | Criterios F08 ✔ |
| 15:45 – 17:00 | **F02** Gestión de empleados | Criterios F02 ✔ |
| 17:00 – 18:30 | Prueba completa del flujo con los 3 roles (ver abajo); corregir errores | Flujo completo sin errores |
| 18:30 – 19:30 | `seed.sql` con datos de demo; detalles de Tailwind (responsivo, estados vacíos) | |
| 19:30 – 20:30 | README (instalación, variables, usuarios de prueba); actualizar specs | |
| 20:30 – 21:30 | **Colchón** para imprevistos | |
| 21:30 – 22:00 | Entrega | Entregado antes de las 22:00 |

## Si se atrasa el plan

Recortar en este orden (sin tocar el flujo principal):

1. F02 → asignar roles a mano en Supabase.
2. Bitácora expandible de F08 → mostrar solo la lista de servicios.
3. Filtros en F05 y F07 → mostrar solo "hoy" / "abiertas".
4. Reprogramar en F05 → dejar solo confirmar y cancelar.

**Nunca recortar:** RLS, validación de capacidad de citas, avance de estatus en orden.

## Prueba final (flujo completo)

1. Cliente A se registra, registra el vehículo `ABC123` y agenda cita para mañana a las 10:00.
2. Clientes B, C y D intentan agendar a la misma hora → el 4.º no puede.
3. Empleado confirma la cita de A.
4. Empleado crea la orden desde la cita (km mayor al registrado).
5. Empleado avanza: diagnóstico → reparación → listo → entregado (con notas).
6. Cliente A ve cada cambio y al final el servicio en su historial.
7. Cliente A intenta abrir `/taller` → "No tienes permiso".
8. Admin hace empleado a un usuario y luego lo desactiva → ya no entra.

## Avance

| Feature | Spec | SQL | Pantallas | Criterios |
|---|---|---|---|---|
| F01 | ✔ | ☐ | ☐ | ☐ |
| F02 | ✔ | ☐ | ☐ | ☐ |
| F03 | ✔ | ☐ | ☐ | ☐ |
| F04 | ✔ | ☐ | ☐ | ☐ |
| F05 | ✔ | ☐ | ☐ | ☐ |
| F06 | ✔ | ☐ | ☐ | ☐ |
| F07 | ✔ | ☐ | ☐ | ☐ |
| F08 | ✔ | ☐ | ☐ | ☐ |
