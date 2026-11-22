# 23 · Historial del vehículo e integración de la aplicación

**Fecha:** 22/11/2026 00:37
**Feature / área:** F08 · Historial del vehículo + integración de F01–F11

## Qué se trabajó
- Historial del vehículo: encabezado con la placa y los datos, orden en curso con su avance y mecánico,
  y servicios anteriores (más reciente primero) expandibles con su bitácora, piezas usadas y factura.
- Inicio del taller: agenda de hoy, "Mis trabajos" (empleado), otras órdenes abiertas, buscador por placa
  y avisos de órdenes sin asignar y piezas con bajo stock.
- `App.jsx` con todas las rutas por rol (carga diferida por sección) y barrera de errores:
  desde este commit el sitio desplegado muestra la aplicación completa.
- Cabeceras de seguridad en Vercel: CSP estricta, HSTS, anti-clickjacking, nosniff, Referrer-Policy y Permissions-Policy.

## Archivos
- `src/components/HistorialServicios.jsx`, `src/pages/cliente/DetalleVehiculo.jsx`, `src/pages/taller/HistorialVehiculo.jsx`
- `src/pages/taller/Inicio.jsx`
- `src/App.jsx`, `src/index.css`
- `vercel.json`

## Decisiones y notas
- El historial se arma con las órdenes entregadas: no se captura dos veces.
- Si un cliente cambia el id de la URL a un vehículo ajeno ve "Vehículo no encontrado" (lo impide la BD).
- La CSP solo permite el código del propio sitio y conexiones a Supabase.

## Siguiente paso
- Subir el SQL y las specs de F09, F10, F11 y seguridad.
