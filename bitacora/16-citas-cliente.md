# 16 · Agendar cita y mis citas (cliente)

**Fecha:** 21/11/2026 19:22
**Feature / área:** F04 · Agendar cita

## Qué se trabajó
- Agendar cita en 3 pasos numerados: 1) vehículo, 2) día, 3) hora y motivo.
  Solo se muestran las horas con lugar; domingo → "El taller no abre ese día."; día lleno → "No hay horarios disponibles…".
- Si el último lugar se ocupa mientras el cliente elige: "Ese horario se acaba de ocupar. Elige otro." y se recargan las horas.
- Mis citas separadas en "Próximas" y "Anteriores", con estatus en texto
  ("Pendiente de confirmar", "Cancelada por ti", "Cancelada: no se confirmó a tiempo", "No se presentó"…).
- Cancelar con confirmación hasta 1 hora antes; después: "Ya no puedes cancelar en línea. Llama al taller."

## Archivos
- `src/pages/cliente/NuevaCita.jsx`
- `src/pages/cliente/Citas.jsx`
- `src/utils/estatusCita.js` — textos de estatus para cliente y taller.

## Decisiones y notas
- Un cliente sin vehículos ve "Primero registra un vehículo" con el botón para hacerlo.
- El botón "Agendar" queda fijo al pie en celular.

## Siguiente paso
- F05: agenda del taller (día y mes).
