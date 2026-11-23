# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Cliente** (usuario principal): dueño de uno o más vehículos. Registra sus carros, agenda citas en horarios con lugar, cancela si lo necesita y consulta en qué etapa va su vehículo y su historial, sin llamar al taller.
- **Empleado / mecánico**: recibe vehículos, confirma o reprograma citas, crea órdenes de servicio, escribe diagnóstico y trabajo realizado, y avanza el estatus de la orden.
- **Administrador**: dueño o encargado del taller; hace todo lo del empleado y además da o quita acceso de empleado y activa/desactiva cuentas.

Todos los roles usan la app tanto en celular como en computadora; ningún rol es "solo escritorio" o "solo móvil".

## Product Purpose

Reemplazar la libreta y el teléfono de talleres mecánicos pequeños y medianos: agenda sin empalmes (capacidad de 3 citas por bloque de 1 hora), órdenes de servicio con avance visible para el cliente y una bitácora por vehículo que se llena sola al entregar cada servicio. Éxito = el cliente sabe el estado de su carro sin llamar y el taller ve su agenda completa.

## Positioning

Producto genérico para cualquier taller pequeño, con nombre TallerApp. Su diferencia práctica es que las reglas del taller (horario, capacidad, avance de estatus de un paso a la vez, cancelación automática de citas no confirmadas) viven en la base de datos, así que la agenda y el estatus que ve el cliente siempre son verdad.

## Operating Context

- Horario del taller: lunes a viernes 08:00–18:00, sábado 08:00–14:00, domingo cerrado; zona horaria America/Tijuana. Citas desde mañana hasta 30 días.
- Flujo: registro → vehículo → cita (pendiente) → taller confirma/reprograma → orden (recibido → en diagnóstico → en reparación → listo → entregado) → historial.
- Citas pendientes se cancelan solas 15 min después de su hora; el cliente puede cancelar hasta 1 h antes.
- Proyecto final de Aplicaciones Web (UABC); se evalúa con una demo en vivo recorriendo los 3 roles en la URL de Vercel, con datos de demo (`supabase/seed.sql`).

## Capabilities and Constraints

- Features del MVP: F01 registro/login con roles, F02 gestión de empleados, F03 registrar vehículo, F04 agendar cita, F05 gestionar citas, F06 crear orden, F07 actualizar estatus, F08 historial del vehículo (specs en `specs/`).
- Stack fijo: React 19 + Vite, Tailwind CSS v4, React Router 7, Supabase (Auth + PostgreSQL + RLS). Sin librerías de UI adicionales.
- Interfaz en español (México). Toda pantalla de lista contempla cargando, con datos, vacía y error con "Reintentar".
- Totalmente responsivo: cada pantalla debe funcionar completa en celular y en escritorio.
- Fuera del MVP: notificaciones, cotizaciones, fotos, reportes, asignar orden a un mecánico.

## Brand Commitments

- Nombre: **TallerApp**. Sin logo, colores ni tipografía obligatorios.
- Voz: español claro y directo, mensajes de error que dicen qué pasó y qué hacer (definidos en las specs).

## Evidence on Hand

- Specs y criterios de aceptación en `specs/`; datos de demo en `supabase/seed.sql`.
- No hay clientes reales, testimonios ni métricas: no inventarlos.

## Product Principles

1. El estado real primero: lo que el cliente ve (estatus, lugares disponibles) siempre coincide con la base de datos.
2. Una acción clara por momento: cada pantalla muestra solo la siguiente acción permitida (confirmar, avanzar, cancelar).
3. Igual de usable en el mostrador y en el celular.
4. Errores que orientan: cada fallo explica qué hacer después.

## Accessibility & Inclusion

Labels en todos los campos, foco visible, navegación por teclado y estados comunicados con texto (no solo color).
