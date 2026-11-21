# Feature F01: Registro e inicio de sesión con roles

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
4. Supabase Auth crea el usuario; un trigger crea su perfil con rol `cliente` (nombre y teléfono de `raw_user_meta_data`, correo de `new.email`; si falta el nombre usa la parte del correo antes de `@`).
5. Como "Confirm email" está desactivado en Supabase, el sistema inicia la sesión y lo lleva a `/cliente`.

## Flujo principal — Inicio de sesión

1. El usuario abre `/login`, captura correo y contraseña y presiona "Entrar".
2. Supabase valida las credenciales.
3. El sistema lee el perfil (`rol`, `activo`). `mi_rol()` devuelve `null` si `activo = false`, así que un usuario desactivado queda bloqueado por todas las políticas aunque tenga una sesión abierta.
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
- [ ] Una cuenta desactivada no puede entrar, y si ya tenía sesión abierta, las consultas dejan de devolver datos.
- [ ] Un cliente que intenta `update perfiles set rol='admin'` desde la consola es rechazado (solo tiene permiso sobre `nombre` y `telefono`).
- [ ] El registro inicia sesión sin pedir confirmar el correo.

## Tasks

- [ ] Crear proyecto en Supabase y guardar URL + anon key en `.env.local` (en `.gitignore`); crear `.env.example` sin valores.
- [ ] En Supabase (Authentication → Providers → Email) desactivar "Confirm email".
- [ ] Habilitar la extensión `pg_cron` (se usa en F05).
- [ ] Crear proyecto React con Vite + Tailwind + React Router.
- [ ] Crear `src/lib/supabase.js`.
- [ ] SQL: tabla `perfiles` + trigger `crear_perfil` al insertar en `auth.users` (toma `nombre` y `telefono` de `raw_user_meta_data`, `correo` de `new.email`, y `coalesce(nombre, split_part(email,'@',1))`).
- [ ] SQL: función `mi_rol()` (devuelve `null` si `activo = false`) y RLS de `perfiles` (cliente: el suyo; empleado/admin: todos).
- [ ] SQL: `revoke` de insert/update general en `perfiles` y `grant update (nombre, telefono)`; el `insert` solo lo hace el trigger.
- [ ] Crear `AuthContext` (sesión, perfil, `login`, `registro`, `logout`, escucha `onAuthStateChange`).
- [ ] Crear `RutaProtegida` que recibe los roles permitidos.
- [ ] Pantalla `Login`.
- [ ] Pantalla `Registro` con validaciones.
- [ ] Pantalla `SinPermiso`.
- [ ] `Layout` con menú según el rol y botón "Salir".
- [ ] Asignar rol `admin` a la primera cuenta desde el panel de Supabase.
- [ ] Crear desde `/registro` las 4 cuentas demo (admin, empleado, cliente1, cliente2) y anotar sus contraseñas en el README (`seed.sql` las busca por correo y asigna roles).
- [ ] Probar criterios de aceptación.
