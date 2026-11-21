# 11 · Sesión, roles y rutas protegidas

**Fecha:** 21/11/2026 15:37
**Feature / área:** F01 · Registro e inicio de sesión con roles

## Qué se trabajó
- Servicio de autenticación (iniciar sesión, registrarse, cerrar sesión) con Supabase Auth.
- Contexto de sesión que carga el perfil y el rol del usuario y lo mantiene al recargar la página.
- Rutas protegidas por rol: sin sesión → `/login`; rol equivocado → "No tienes permiso".
- Traducción de errores a mensajes en español (credenciales incorrectas, correo repetido, sin conexión, textos demasiado largos).

## Archivos
- `src/services/auth.js` — llamadas a Supabase Auth.
- `src/services/perfiles.js` — perfil propio y gestión de empleados.
- `src/services/errores.js` — `traducirError`.
- `src/context/AuthContext.jsx` — sesión, perfil, rol, avisos.
- `src/routes/RutaProtegida.jsx` y `rutaInicio.js` — protección e inicio según el rol.

## Decisiones y notas
- El mensaje de login es genérico ("Correo o contraseña incorrectos.") para no revelar si el correo existe.
- Si la red falla al cargar el perfil, no se cierra la sesión: se ofrece "Reintentar".
- Una cuenta desactivada se cierra al volver a la pestaña (además, la BD ya le niega todo con `mi_rol()`).
- El rol en el frontend solo oculta pantallas; la seguridad real está en la base de datos.

## Siguiente paso
- Pantallas de acceso y menú (Login, Registro, Layout).
