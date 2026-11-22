# 15 · Citas: horarios, servicio y estatus

**Fecha:** 21/11/2026 18:37
**Feature / área:** F04 · Agendar cita (y base de F05)

## Qué se trabajó
- Horario del taller en hora de Tijuana: bloques de 1 h (L–V 08:00–17:00, sábado 08:00–13:00, domingo cerrado),
  rango permitido desde mañana hasta 30 días y cálculo correcto del horario de verano.
- Servicio de citas: bloques con lugar disponible (máximo 3 por hora), agendar, mis citas, cancelar,
  citas por día y por rango (para la vista por mes), confirmar y reprogramar.
- Etiqueta de estatus reutilizable (cuadro de color + texto).
- Formato de fechas en español y en hora de Tijuana.

## Archivos
- `src/utils/horarios.js`, `src/utils/fechas.js`
- `src/services/citas.js`
- `src/components/BadgeEstatus.jsx`

## Decisiones y notas
- Los bloques se comparan por instante (no por texto) para no fallar por diferencias de zona horaria.
- La BD vuelve a revisar la capacidad al guardar, por si dos clientes toman el último lugar al mismo tiempo.
- Se descartan respuestas viejas si el usuario cambia de fecha rápido (evita agendar el día equivocado).

## Siguiente paso
- Pantallas del cliente: agendar cita y mis citas.
