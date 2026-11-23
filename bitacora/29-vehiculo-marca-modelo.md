# 29 · Marca y modelo del vehículo desde listas

**Fecha:** 22/11/2026
**Feature / área:** F03 — Registrar vehículo

## Qué se trabajó
- En el formulario del vehículo, la marca y el modelo se eligen de listas (catálogo de 11 marcas, el mismo del inventario F10).
- El modelo muestra solo los modelos de la marca elegida; al cambiar de marca se borra el modelo.
- "Otra marca" permite escribir marca y modelo a mano; "Otro modelo" permite escribir solo el modelo.
- Al editar, si lo guardado no coincide exacto con el catálogo, se muestra como "Otra marca"/"Otro modelo" con su texto, sin cambiarlo.

## Archivos
- `src/components/FormVehiculo.jsx`
- `src/components/CampoSelect.jsx` (opciones sin el formato "valor · texto")
- `specs/features/F03-registrar-vehiculo.md`

## Decisiones y notas
- Sin cambios en la BD: marca y modelo siguen como texto libre con los mismos límites.
- Probado por el usuario en el navegador como cliente; `npm run build` y `npm run lint` sin errores.

## Siguiente paso
- Bitácora de IA y diario de decisiones.
