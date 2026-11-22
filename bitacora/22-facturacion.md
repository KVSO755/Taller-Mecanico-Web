# 22 · Facturación

**Fecha:** 21/11/2026 23:52
**Feature / área:** F11 · Facturación

## Qué se trabajó
- El cliente pide factura de un servicio **entregado** desde su historial ("Pedir factura" / "Ver factura {folio}").
- Formulario de datos fiscales: RFC, razón social, régimen fiscal, código postal, uso de CFDI y correo,
  precargado con los de su última factura.
- Factura imprimible: folio, emisor (datos de demostración) y receptor, conceptos (refacciones + mano de obra),
  subtotal, IVA 16 % y total; botón "Imprimir / Guardar PDF" con estilos de impresión en tamaño carta.
- "Mis facturas" con la lista del cliente; el taller puede ver la factura desde la orden.

## Archivos
- `src/services/facturas.js`
- `src/pages/cliente/NuevaFactura.jsx`, `src/pages/cliente/Facturas.jsx`, `src/pages/FacturaPage.jsx`
- `src/components/FacturaDocumento.jsx`
- `src/utils/catalogosSat.js` — régimen fiscal y uso de CFDI (catálogos del SAT) y validación de RFC.

## Decisiones y notas
- Es una **factura simple, no un CFDI**: lleva la leyenda "Este documento no es un Comprobante Fiscal Digital por Internet (CFDI)".
  Timbrar un CFDI requiere contratar un PAC; queda como mejora futura.
- La factura guarda una copia congelada de los conceptos: si después cambia la orden, la factura no cambia.
- Una sola factura por orden (lo garantiza la BD).

## Siguiente paso
- Historial del vehículo (F08) e integración de todas las pantallas.
