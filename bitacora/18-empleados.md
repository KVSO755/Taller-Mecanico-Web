# 18 · Gestión de empleados

**Fecha:** 21/11/2026 20:52
**Feature / área:** F02 · Gestión de empleados

## Qué se trabajó
- Pantalla del administrador con la lista de empleados (nombre, correo, teléfono, rol, estado y trabajos abiertos).
- "Agregar empleado" con dos pestañas:
  - **Crear cuenta:** nombre, teléfono, correo y contraseña temporal (mínimo 8); la cuenta nace como empleado.
  - **Ya tiene cuenta:** buscar por correo y convertir a empleado.
- Acciones con confirmación: quitar acceso (vuelve a cliente), desactivar y activar.
- La fila del propio administrador no tiene botones ("Tu cuenta").

## Archivos
- `src/pages/admin/Empleados.jsx`
- `src/lib/supabase.js` — cliente aislado para crear la cuenta sin cambiar la sesión del admin.

## Decisiones y notas
- La cuenta se crea **sin la llave `service_role`**: un cliente aparte (sin guardar sesión) hace el registro y luego
  la función `cambiar_rol` —que exige ser admin en la BD— lo vuelve empleado.
- El admin no puede quitarse el rol ni desactivarse (la BD también lo impide), para que el taller no se quede sin admin.

## Siguiente paso
- F06: crear orden de servicio.
