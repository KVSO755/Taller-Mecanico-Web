# 17 · Agenda del taller por día y por mes

**Fecha:** 21/11/2026 20:07
**Feature / área:** F05 · Gestionar citas

## Qué se trabajó
- Vista **Día**: retícula hora × 3 lugares. Cada cita muestra placa, cliente, teléfono, vehículo, motivo y estatus;
  las horas sin citas se compactan en una franja "Libre · 3 lugares"; una hora con 3 citas se marca "Lleno".
- Acciones por cita: Confirmar (pendiente, hasta 15 min después de su hora), Reprogramar (modal con horas libres),
  Cancelar (con confirmación) y Crear orden (solo confirmadas de hoy). Canceladas y atendidas van en una lista aparte.
- Vista **Mes**: calendario con citas por día, pendientes y confirmadas, lugares ocupados ("5/30 lugares") y horas llenas;
  domingos "Cerrado"; tocar un día abre su vista Día.
- La vista y la fecha viven en la URL (`?vista=dia&fecha=…` / `?vista=mes&mes=…`).

## Archivos
- `src/pages/taller/Citas.jsx`
- `src/components/AgendaRejilla.jsx`, `src/components/AgendaMes.jsx`, `src/components/ReprogramarCita.jsx`

## Decisiones y notas
- Las columnas se llaman "lugares" y no "bahías": las citas no guardan bahía asignada y el rótulo sería un dato falso.
- Si la cita cambió mientras se veía: "Esta cita ya fue modificada. Se actualizó la lista."

## Siguiente paso
- F02: gestión de empleados.
