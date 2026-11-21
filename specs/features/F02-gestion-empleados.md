# Feature F02: Gestión de empleados

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
6. El sistema llama a `cambiar_rol` (`rpc`); el rol cambia a `empleado` y aparece en la lista.

## Flujo — Quitar acceso / desactivar

- "Quitar acceso": el rol vuelve a `cliente` (conserva sus vehículos si tenía).
- "Desactivar": `activo = false`; la persona ya no puede iniciar sesión (ver F01). "Activar" lo revierte.
- Ambas acciones piden confirmación.

## Validaciones

- El correo es obligatorio y con formato válido.
- No se puede cambiar el rol ni desactivar **la propia cuenta** del administrador (evita que el taller se quede sin admin).
- Solo el rol `admin` puede cambiar `rol` y `activo`: las funciones `cambiar_rol` y `cambiar_activo` lo validan con `mi_rol()` (no solo la pantalla) y rechazan que el admin se modifique a sí mismo.
- Un empleado desactivado (`activo = false`) queda bloqueado de inmediato: `mi_rol()` devuelve `null`.

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
- [ ] Un cliente que intenta `update perfiles set rol='admin'` desde la consola es rechazado.
- [ ] Un empleado desactivado con sesión abierta deja de ver datos de inmediato.

## Tasks

- [ ] Verificar que el trigger de F01 llena `correo` en `perfiles` (la columna ya existe en el esquema) para poder buscar por correo.
- [ ] SQL: funciones `cambiar_rol(perfil_id, rol)` y `cambiar_activo(perfil_id, activo)` (`SECURITY DEFINER`, `set search_path = public`): solo `admin`, no sobre su propia cuenta. No hay `update` directo de `rol`/`activo` (solo `nombre` y `telefono`, F01).
- [ ] `services/perfiles.js`: `listarEmpleados`, `buscarPorCorreo`, `cambiarRol` y `cambiarActivo` (ambos vía `supabase.rpc`).
- [ ] Pantalla `admin/Empleados` con lista y estados (cargando, vacía, error).
- [ ] Formulario "Agregar empleado" (buscar + confirmar).
- [ ] Botones con confirmación para quitar acceso y desactivar.
- [ ] Probar criterios de aceptación.
