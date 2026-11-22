# Feature F02: Gestión de empleados

## Objetivo

Que el administrador decida quién trabaja en el taller: crear la cuenta de un empleado nuevo o dar acceso de empleado a alguien que ya tiene cuenta, y quitárselo cuando ya no trabaje ahí.

## Actor

Administrador.

## Precondiciones

- El administrador tiene sesión iniciada.
- Para "Ya tiene cuenta": la persona ya creó su cuenta en `/registro` (entra como cliente).
- Para "Crear cuenta": ninguna (el administrador la crea desde la pantalla).

## Datos de entrada

- Crear cuenta: nombre, teléfono, correo y contraseña temporal.
- Ya tiene cuenta: correo del usuario a buscar.
- Acción: "Hacer empleado", "Quitar acceso de empleado", "Desactivar" / "Activar".

## Flujo — Crear cuenta de empleado (Q30)

1. El administrador abre `/admin/empleados` y en el panel "Agregar empleado" elige la pestaña "Crear cuenta".
2. Captura nombre, teléfono, correo y contraseña temporal, y presiona "Crear cuenta".
3. El frontend registra la cuenta con un cliente de Supabase **secundario** (sin persistir sesión), de modo que la sesión del administrador no cambia. El trigger `crear_perfil` (F01) crea el perfil como `cliente`.
4. Con el cliente principal (el del administrador) llama a `cambiar_rol(nuevo_id, 'empleado')` (`rpc`; exige `admin`).
5. El empleado aparece en la lista. El administrador le comunica la contraseña temporal; el empleado entra con ella en `/login`.

No requiere la llave `service_role`: el registro ya es público y el rol solo lo cambia `cambiar_rol`, que valida `admin` en la base de datos.

## Flujo principal — Dar de alta un empleado que ya tiene cuenta

1. El administrador abre `/admin/empleados`.
2. Ve la lista de empleados (nombre, correo, teléfono, estado activo/inactivo y "Trabajos abiertos": número de órdenes abiertas asignadas, ver F09).
3. En "Agregar empleado", pestaña "Ya tiene cuenta", escribe el correo de la persona y presiona "Buscar".
4. El sistema muestra el usuario encontrado (nombre y rol actual).
5. El administrador presiona "Hacer empleado" y confirma.
6. El sistema llama a `cambiar_rol` (`rpc`); el rol cambia a `empleado` y aparece en la lista.

## Flujo — Quitar acceso / desactivar

- "Quitar acceso": el rol vuelve a `cliente` (conserva sus vehículos si tenía).
- "Desactivar": `activo = false`; la persona ya no puede iniciar sesión (ver F01). "Activar" lo revierte.
- Ambas acciones piden confirmación.

## Validaciones

- El correo es obligatorio y con formato válido.
- Crear cuenta: nombre de al menos 3 caracteres; teléfono de exactamente 10 dígitos; correo con formato válido; contraseña temporal de al menos 8 caracteres (Q27).
- Si la cuenta se crea pero `cambiar_rol` falla, queda como cliente y el administrador puede terminar desde "Ya tiene cuenta".
- No se puede cambiar el rol ni desactivar **la propia cuenta** del administrador (evita que el taller se quede sin admin).
- Solo el rol `admin` puede cambiar `rol` y `activo`: las funciones `cambiar_rol` y `cambiar_activo` lo validan con `mi_rol()` (no solo la pantalla) y rechazan que el admin se modifique a sí mismo.
- Un empleado desactivado (`activo = false`) queda bloqueado de inmediato: `mi_rol()` devuelve `null`.

## Casos de error

| Situación | Mensaje |
|---|---|
| No existe usuario con ese correo | "No hay ninguna cuenta con ese correo. Pide a la persona que se registre primero." |
| El usuario ya es empleado | "Esta persona ya es empleado." |
| Crear cuenta: correo ya registrado | "Ya existe una cuenta con este correo." |
| Crear cuenta: contraseña corta | "La contraseña debe tener al menos 8 caracteres." |
| Crear cuenta: nombre corto | "Escribe el nombre completo (mínimo 3 caracteres)." |
| Crear cuenta: teléfono inválido | "El teléfono debe tener 10 dígitos." |
| Crear cuenta: correo inválido | "Escribe un correo válido." |
| Falla al guardar | "No se pudo guardar el cambio. Intenta de nuevo." |
| Lista vacía | "Aún no hay empleados registrados." |

## Resultado esperado

La persona dada de alta inicia sesión y entra a `/taller` con permisos de empleado.

## Criterios de aceptación

- [x] El administrador ve la lista de empleados.
- [x] Buscar un correo existente muestra el usuario; uno inexistente muestra el mensaje de error.
- [x] "Hacer empleado" cambia el rol y la persona aparece en la lista.
- [ ] Al volver a iniciar sesión, el nuevo empleado llega a `/taller`.
- [x] "Desactivar" impide que esa persona inicie sesión.
- [ ] El administrador no ve botones para modificarse a sí mismo.
- [x] Un empleado que intenta cambiar un rol (desde la consola) es rechazado por Supabase.
- [x] Un cliente que intenta `update perfiles set rol='admin'` desde la consola es rechazado.
- [x] Un empleado desactivado con sesión abierta deja de ver datos de inmediato.
- [ ] "Crear cuenta" con datos válidos crea al empleado, aparece en la lista y la sesión del administrador sigue siendo la suya.
- [ ] El empleado recién creado inicia sesión con la contraseña temporal y llega a `/taller`.
- [ ] Nombre menor a 3 caracteres, teléfono distinto de 10 dígitos, correo inválido o contraseña menor a 8 caracteres bloquean el formulario con su mensaje.
- [ ] Un correo ya registrado muestra "Ya existe una cuenta con este correo."
- [ ] La pestaña "Ya tiene cuenta" (buscar por correo y hacer empleado) sigue funcionando.
- [ ] La lista muestra "Trabajos abiertos" por empleado.

## Tasks

- [x] Verificar que el trigger de F01 llena `correo` en `perfiles` (la columna ya existe en el esquema) para poder buscar por correo.
- [x] SQL: funciones `cambiar_rol(perfil_id, rol)` y `cambiar_activo(perfil_id, activo)` (`SECURITY DEFINER`, `set search_path = public`): solo `admin`, no sobre su propia cuenta. No hay `update` directo de `rol`/`activo` (solo `nombre` y `telefono`, F01).
- [x] `services/perfiles.js`: `listarEmpleados`, `buscarPorCorreo`, `cambiarRol` y `cambiarActivo` (ambos vía `supabase.rpc`).
- [x] Pantalla `admin/Empleados` con lista y estados (cargando, vacía, error).
- [x] Formulario "Agregar empleado" (buscar + confirmar).
- [x] Botones con confirmación para quitar acceso y desactivar.
- [ ] `services/perfiles.js`: `crearEmpleado({ nombre, telefono, correo, contrasena })` con cliente Supabase secundario (`persistSession: false`, `autoRefreshToken: false`, `detectSessionInUrl: false`, `storageKey` propio) para `auth.signUp` y luego `cambiar_rol` con el cliente principal.
- [ ] Pantalla `admin/Empleados`: panel con pestañas "Crear cuenta" y "Ya tiene cuenta"; columna "Trabajos abiertos".
- [ ] Probar criterios de aceptación.
