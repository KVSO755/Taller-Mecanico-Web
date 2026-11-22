# Feature F11: Facturación y mano de obra

## Objetivo

Que el cliente pueda pedir, cuando su servicio ya fue entregado, una factura simple imprimible (o PDF) con las refacciones usadas y la mano de obra, y que el taller capture la mano de obra de cada orden y vea las facturas emitidas.

## Actor

Cliente (pide y consulta sus facturas). Empleado y Administrador (capturan la mano de obra en la orden y consultan cualquier factura en solo lectura).

## Precondiciones

- Existe una orden en estatus `entregado` (F06, F07) con mano de obra capturada (Q48).
- El cliente es dueño del vehículo de la orden.
- Depende de F07 (estatus), F08 (historial) y F10 (refacciones usadas con su costo).

## Datos de entrada

- **Mano de obra** (taller): monto en MXN, ≥ 0, en la orden (`ordenes.mano_obra`).
- **Datos fiscales** (cliente): RFC, razón social, régimen fiscal (select con nombres del SAT), código postal, uso de CFDI (select) y correo.

## Flujo — Capturar la mano de obra (Q45, Q48)

1. En `/taller/ordenes/:id` el campo "Mano de obra (MXN)" aparece junto a las notas; se guarda con "Guardar notas" (`update` directo de `diagnostico`, `trabajo_realizado` y `mano_obra`; admin o mecánico asignado, solo con la orden no entregada).
2. El resumen de refacciones muestra además "Mano de obra" y "Total estimado (sin IVA)" (refacciones + mano de obra).
3. Para "Avanzar a entregado" la mano de obra debe estar capturada (0 es válido); si no, `avanzar_estatus_orden` rechaza el avance.
4. Si la orden ya tiene factura, el detalle muestra el enlace "Ver factura {folio}" (`/taller/facturas/:id`).

## Flujo — Pedir la factura (Q44, Q46, Q50)

1. En `cliente/HistorialServicios` y `cliente/DetalleVehiculo`, cada servicio `entregado` sin factura muestra "Pedir factura"; si ya tiene, "Ver factura {folio}".
2. "Pedir factura" abre `/cliente/facturas/nueva?ordenId=` con RFC, Razón social, Régimen fiscal, Código postal, Uso de CFDI y Correo. Los datos se precargan desde la última factura del cliente (Q50); no se guardan en su perfil.
3. Las validaciones del formulario son iguales a las de la base de datos.
4. Al enviar, `solicitar_factura` (`rpc`) crea la factura con sus conceptos y la pantalla abre `/cliente/facturas/:id`.

## Flujo — Ver, listar e imprimir facturas (Q44, Q49)

1. `/cliente/facturas` ("Mis facturas", ítem en el menú del cliente) lista Folio, Fecha, Placa y Total.
2. `/cliente/facturas/:id` y `/taller/facturas/:id` (mismo componente) muestran: encabezado "Factura" con folio y fecha; emisor (datos de demostración, Q49) y receptor; tabla de conceptos (Descripción, Cant., Precio unit., Importe); Subtotal, IVA 16 % y Total en MXN; vehículo (placa, marca y modelo) y orden; y la leyenda "Este documento no es un Comprobante Fiscal Digital por Internet (CFDI)."
3. El botón "Imprimir / Guardar PDF" ejecuta `window.print()`; con `@media print` se oculta el menú y los botones y queda una hoja carta limpia, en blanco y negro, con el estilo del sistema.

## Reglas

- **Q44:** la factura es un documento simple imprimible / PDF, no un CFDI.
- **Q45:** conceptos = cada refacción usada (`"{nombre} ({código})"`, cantidad × `costo_unitario` de `orden_piezas`) + "Mano de obra" (cantidad 1, solo si es mayor a 0). Subtotal = suma de importes; IVA = `round(subtotal × 0.16, 2)`; Total = subtotal + IVA. Los conceptos son una copia congelada: no cambian si después cambia la orden, el costo o el inventario.
- **Q46:** solo con la orden `entregado`, una factura por orden, solo el cliente dueño del vehículo; se genera al momento de pedirla.
- **Q47 (descripción del trabajo):** en la agenda se ve el motivo de la cita; en las órdenes del taller (`/taller/ordenes`, tabla y fichas, fichas del inicio y "Mis trabajos") se muestra una columna/fila "Trabajo" con el resumen truncado a 1–2 líneas: el diagnóstico si existe y, si no, el motivo de la cita; si no hay ninguno, "Sin descripción". Sin campos nuevos.
- **Q48:** no se entrega una orden sin mano de obra capturada.
- **Q49:** emisor de demostración: "TallerApp · Taller de demostración", RFC genérico XAXX010101000, CP 22000 (Tijuana), marcado como datos de demostración.
- **Q50:** los datos fiscales se precargan desde la última factura del cliente.
- **Folio:** `'A-' || lpad(id, 6, '0')` (serie A), p. ej. `A-000001`; único.
- **Catálogos cerrados** (validados en la función): régimen fiscal 601, 603, 605, 606, 612, 616, 621, 625, 626; uso de CFDI G01, G02, G03, I01, I02, I03, I04, I08, D01, S01, CP01.
- Nadie inserta, edita ni borra facturas directamente: solo `select` (cliente dueño o taller) y la `rpc`. El empleado y el administrador no piden facturas: reciben "Orden no encontrada." (no son dueños de ningún vehículo).
- Concurrencia: `solicitar_factura` bloquea la orden (`for update`) y `facturas.orden_id` es `unique`, de modo que dos solicitudes simultáneas no generan dos facturas.

## Validaciones

- RFC (se normaliza a mayúsculas y sin espacios): `^([A-ZÑ&]{3,4})[0-9]{6}[A-Z0-9]{3}$`.
- Razón social: 3 a 250 caracteres. Código postal: 5 dígitos. Correo: formato básico (`algo@dominio.ext`).
- Régimen fiscal y uso de CFDI: dentro de los catálogos anteriores.
- Debe haber al menos un concepto con importe > 0.

## Casos de error

| Situación | Mensaje |
|---|---|
| La orden no existe, no es del cliente, o quien llama es empleado/admin/desactivado | "Orden no encontrada." |
| Orden no entregada | "La factura solo se puede pedir cuando el servicio está entregado." |
| La orden ya tiene factura | "Esta orden ya tiene la factura {folio}." |
| RFC inválido | "Escribe un RFC válido." |
| Razón social fuera de 3 a 250 caracteres | "Escribe la razón social (de 3 a 250 caracteres)." |
| Régimen fiscal fuera del catálogo | "Elige un régimen fiscal válido." |
| Código postal inválido | "El código postal debe tener 5 dígitos." |
| Uso de CFDI fuera del catálogo | "Elige un uso de CFDI válido." |
| Correo inválido | "Escribe un correo válido." |
| Sin refacciones y con mano de obra 0 | "Este servicio no tiene montos para facturar." |
| Entregar sin mano de obra (Q48) | "Captura la mano de obra antes de marcar como entregado." |
| Sin facturas (Mis facturas) | "Aún no tienes facturas." |
| Falla de conexión | "No se pudo cargar la factura." + botón "Reintentar" |

## Resultado esperado

Tras la entrega, el cliente pide su factura una sola vez, con sus datos fiscales, y obtiene un documento imprimible con folio, conceptos, IVA y total que nunca cambia; el taller ve la misma factura en solo lectura desde la orden.

## Criterios de aceptación

- [ ] El empleado asignado (o el admin) captura "Mano de obra (MXN)" junto a las notas y se guarda con "Guardar notas"; en una orden entregada el campo es de solo lectura.
- [ ] No se puede pasar a `entregado` sin mano de obra: "Captura la mano de obra antes de marcar como entregado."; con 0 sí se puede.
- [ ] El resumen de refacciones muestra "Mano de obra" y "Total estimado (sin IVA)".
- [ ] En un servicio entregado sin factura, el cliente ve "Pedir factura" en el historial y en el detalle del vehículo; con factura ve "Ver factura {folio}".
- [ ] El formulario de factura precarga los datos de la última factura del cliente y valida RFC, razón social, régimen, código postal, uso de CFDI y correo con los mensajes exactos.
- [ ] Una orden no entregada no se puede facturar: "La factura solo se puede pedir cuando el servicio está entregado."
- [ ] Una segunda solicitud para la misma orden muestra "Esta orden ya tiene la factura {folio}."
- [ ] Un cliente ajeno que llama `solicitar_factura` recibe "Orden no encontrada."; empleado y admin también.
- [ ] La factura creada tiene folio `A-` + 6 dígitos, subtotal = suma de conceptos, IVA = `round(subtotal × 0.16, 2)` y total = subtotal + IVA.
- [ ] Los conceptos incluyen cada refacción usada ("{nombre} ({código})") y "Mano de obra" (si es mayor a 0).
- [ ] Si después cambian `orden_piezas`, el costo de la pieza o la mano de obra, la factura y sus conceptos no cambian.
- [ ] Un servicio sin refacciones y con mano de obra 0 muestra "Este servicio no tiene montos para facturar."
- [ ] "Mis facturas" lista Folio, Fecha, Placa y Total y tiene su ítem en el menú del cliente.
- [ ] `/cliente/facturas/:id` y `/taller/facturas/:id` muestran emisor de demostración, receptor, conceptos, Subtotal, IVA 16 %, Total, vehículo, orden y la leyenda de que no es CFDI.
- [ ] "Imprimir / Guardar PDF" deja una hoja carta limpia sin menú ni botones.
- [ ] Un cliente ajeno no ve facturas ni conceptos de otro (0 filas); el taller ve todas.
- [ ] Desde la consola, `insert`, `update` y `delete` directos sobre `facturas` y `factura_conceptos` son rechazados con "permission denied".
- [ ] `anon` no puede leer las tablas ni ejecutar `solicitar_factura`.
- [ ] El detalle de la orden del taller muestra "Ver factura {folio}" cuando existe.
- [ ] `/taller/ordenes` (tabla y fichas), "Mis trabajos" y las fichas del inicio muestran "Trabajo" (diagnóstico o motivo de la cita; "Sin descripción").
- [ ] En la agenda el motivo de la cita se ve siempre, también en celular.
- [ ] Los importes se muestran en pesos mexicanos (ej. "$1,144.92").

## Tasks

- [x] SQL: `ordenes.mano_obra` con `check (>= 0)`, tablas `facturas` y `factura_conceptos`, índices en `facturas (cliente_id)` y `factura_conceptos (factura_id)` y RLS habilitado.
- [x] SQL: `avanzar_estatus_orden` exige `mano_obra` al pasar a `entregado` (Q48).
- [x] SQL: `solicitar_factura(orden_id, rfc, razon_social, regimen_fiscal, codigo_postal, uso_cfdi, correo)` (`SECURITY DEFINER`, `set search_path = public`, lock `for update` de la orden, solo `authenticated`).
- [x] SQL: `revoke all` y `grant select` en las dos tablas, políticas `select` (cliente dueño o taller) y `grant update (diagnostico, trabajo_realizado, mano_obra) on ordenes`.
- [x] `seed.sql`: mano de obra en las órdenes entregadas de ABC123, una factura de demostración en la más antigua y la más reciente sin factura; grupo 17 de `tests.sql`.
- [ ] Ejecutar en Supabase `schema.sql` → `functions.sql` → `policies.sql` → `seed.sql` → `tests.sql`.
- [ ] `services/facturas.js`: `solicitarFactura`, `listarFacturas`, `obtenerFactura` (con conceptos, orden y vehículo), `ultimaFactura` (precarga) y factura de una orden.
- [ ] `utils/facturacion.js`: catálogos con nombres SAT, validaciones iguales a las de la BD y datos del emisor de demostración (Q49).
- [ ] `cliente/NuevaFactura` (`/cliente/facturas/nueva`) y `cliente/Facturas` (`/cliente/facturas`, ítem "Mis facturas" en el menú).
- [ ] Componente `Factura` imprimible (`/cliente/facturas/:id` y `/taller/facturas/:id`) con `@media print`.
- [ ] `cliente/HistorialServicios` y `cliente/DetalleVehiculo`: "Pedir factura" / "Ver factura {folio}".
- [ ] `taller/DetalleOrden`: campo "Mano de obra (MXN)", "Total estimado (sin IVA)" y "Ver factura {folio}".
- [ ] Q47: "Trabajo" en `/taller/ordenes`, "Mis trabajos" y fichas del inicio; verificar el motivo en la agenda (móvil).
- [ ] Probar criterios de aceptación.
