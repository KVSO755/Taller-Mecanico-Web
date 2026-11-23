# 30 · Recuperar contraseña por correo

**Fecha:** 22/11/2026
**Feature / área:** F01 — Registro e inicio de sesión (Q53)

## Qué se trabajó
- Enlace "¿Olvidaste tu contraseña?" en `/login`.
- `/recuperar`: pide el correo y manda el enlace con Supabase Auth; el mensaje es el mismo exista o no la cuenta.
- `/restablecer`: el enlace del correo abre la sesión y aquí se escribe la contraseña nueva (mínimo 8, con confirmación); al guardar lleva al inicio de su rol con el aviso "Tu contraseña se actualizó."
- Enlace vencido o ya usado: "El enlace no es válido o ya venció. Pide uno nuevo."
- Mensajes nuevos: demasiados intentos y contraseña igual a la anterior.

## Archivos
- `src/pages/auth/Recuperar.jsx`, `src/pages/auth/Restablecer.jsx` (nuevos)
- `src/App.jsx`, `src/pages/auth/Login.jsx`, `src/components/Layout.jsx`
- `src/services/auth.js`, `src/services/errores.js`
- `specs/features/F01-registro-login.md`, `specs/00-project.md`, `specs/01-navigation.md`, `specs/04-plan-de-trabajo.md`, `PRODUCT.md`, `GUIA_DEL_PROYECTO.md`

## Decisiones y notas
- Sale de "fuera del MVP" (Q53). Sin cambios en la BD: lo maneja Supabase Auth.
- Correo integrado de Supabase por ahora (solo llega a miembros del equipo y pocos por hora); para clientes reales hay que configurar un SMTP propio.
- En Supabase se agregaron las *Redirect URLs* de `/restablecer` (local y producción).
- Probado por el usuario en el navegador; `npm run build` y `npm run lint` sin errores.

## Siguiente paso
- Bitácora de IA y diario de decisiones.
