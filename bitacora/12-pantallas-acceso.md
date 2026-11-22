# 12 · Pantallas de acceso, menú y manejo de errores

**Fecha:** 21/11/2026 16:22
**Feature / área:** F01 · Registro e inicio de sesión con roles

## Qué se trabajó
- Login y Registro con validaciones (nombre, teléfono de 10 dígitos, correo, contraseña de mínimo 8 y confirmación).
- Menú según el rol: riel lateral cobalto en escritorio y barra superior con menú desplegable en celular.
- Pantallas "No tienes permiso" y "Página no encontrada".
- Barrera de errores: si algo falla al mostrar una pantalla, aparece "Algo salió mal. Recarga la página." en lugar de una pantalla en blanco.
- Utilidades de formularios: límites de longitud iguales a los de la BD, foco al primer error y candado contra doble clic.

## Archivos
- `src/pages/auth/Login.jsx`, `src/pages/auth/Registro.jsx`
- `src/pages/SinPermiso.jsx`, `src/pages/NoEncontrado.jsx`
- `src/components/Layout.jsx` — menú por rol, responsivo, accesible (Escape cierra, foco).
- `src/components/LimiteError.jsx` — barrera de errores.
- `src/components/Input.jsx`, `MensajeError.jsx`, `Textarea.jsx` — campos con error y contador.
- `src/utils/formularios.js` — límites, candado de envío y validación de ids.

## Decisiones y notas
- El botón de envío se bloquea desde el primer clic (candado síncrono) para evitar registros duplicados.
- Los campos tienen `maxLength` según la BD; si aun así llega un texto largo, la BD lo rechaza con un mensaje claro.

## Siguiente paso
- F03: registrar vehículo.
