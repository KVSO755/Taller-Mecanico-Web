# 14 · Pantallas del cliente: inicio y registro de vehículo

**Fecha:** 21/11/2026 17:52
**Feature / área:** F03 · Registrar vehículo

## Qué se trabajó
- Inicio del cliente: "Mis vehículos" como fichas con la placa en grande, marca, modelo, año y km;
  si un vehículo tiene una orden abierta, muestra su folio y el avance en 5 pasos.
- "Próximas citas" en tabla (escritorio) o fichas (celular) con su estatus.
- Pantalla para registrar un vehículo nuevo con el formulario reutilizable.
- Estado vacío: "Aún no tienes vehículos registrados" con botón para agregar el primero.

## Archivos
- `src/pages/cliente/Inicio.jsx`
- `src/pages/cliente/NuevoVehiculo.jsx`

## Decisiones y notas
- El cliente ve en su inicio en qué paso va su carro sin abrir otra pantalla (objetivo principal del producto).
- Las fichas no se estiran a la altura de la más alta; la ficha con orden abierta ocupa dos columnas en escritorio.

## Siguiente paso
- F04: horarios y agendado de citas.
