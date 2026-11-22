# Navegación y pantallas

## Mapa de pantallas por rol

```text
Público
├── /                           Redirige según sesión y rol (a /login si no hay sesión)
├── /login                      Iniciar sesión               (F01)
├── /registro                   Registro de cliente          (F01)
└── (cualquier otra ruta)       Página no encontrada

Cliente  (/cliente)
├── /cliente                    Inicio: mis vehículos y próximas citas
├── /cliente/vehiculos/nuevo    Registrar vehículo           (F03)
├── /cliente/vehiculos/:id      Detalle + historial; en la orden en curso, "Mecánico: {nombre}"; "Refacciones" (nombre y cantidad, sin costos) en la orden en curso y en cada servicio del historial (F08, F09, F10)
├── /cliente/citas              Mis citas
├── /cliente/citas/nueva        Agendar cita                 (F04)
├── /cliente/facturas           Mis facturas: Folio, Fecha, Placa y Total (F11)
├── /cliente/facturas/nueva     Pedir factura de una orden entregada (admite ?ordenId=); datos fiscales precargados de su última factura (F11)
└── /cliente/facturas/:id       Factura imprimible ("Imprimir / Guardar PDF")  (F11)

Empleado  (/taller)
├── /taller                     Inicio: agenda de hoy (hora × 3 lugares), "Mis trabajos" (empleado) o aviso de órdenes sin asignar (admin), alerta "N piezas con bajo stock o agotadas" (si N > 0), órdenes abiertas y buscador por placa (F09, F10)
├── /taller/citas               Agenda de citas (admite ?vista=dia&fecha=AAAA-MM-DD o ?vista=mes&mes=AAAA-MM) (F05)
├── /taller/ordenes             Lista de órdenes con columnas "Mecánico" y "Trabajo" (diagnóstico o, si no hay, el motivo de la cita; "Sin descripción") y pestañas "Mis trabajos" (por defecto del empleado), "Abiertas", una por estatus y "Sin asignar" (solo admin) (F07, F09)
├── /taller/ordenes/nueva       Crear orden; selector "Mecánico" (admin) o "Se asignará a ti" (empleado) (F06, F09)
├── /taller/ordenes/:id         Detalle y cambio de estatus; línea "Mecánico"; admin: selector "Asignar a"; empleado no asignado: solo lectura con aviso; sección "Refacciones usadas" con total y, para el admin o el asignado (orden no entregada), agregar y "Quitar"; campo "Mano de obra (MXN)" junto a las notas, "Total estimado (sin IVA)" y, si ya se facturó, "Ver factura {folio}" (F07, F09, F10, F11)
├── /taller/vehiculos/:id       Historial del vehículo       (F08)
├── /taller/inventario          Inventario de refacciones: búsqueda, filtros (admite ?filtro=bajo, ?marca= y ?modelo=) y "Nueva pieza" (F10)
├── /taller/inventario/:id      Detalle de pieza: entradas, ajustes, edición, activar/desactivar y movimientos (F10)
└── /taller/facturas/:id        Factura imprimible (mismo componente que la del cliente; solo lectura) (F11)

Administrador  (/admin)
├── todo lo de /taller
└── /admin/empleados            Alta / baja de empleados: "Agregar empleado" con pestañas "Crear cuenta" y "Ya tiene cuenta"; lista con "Trabajos abiertos" (F02, F09)
```

## Flujo principal del sistema

```text
Cliente se registra (F01)
   ↓
Registra su vehículo (F03)
   ↓
Agenda cita (F04)                      estatus cita: pendiente
   ↓
Taller confirma / reprograma (F05)     estatus cita: confirmada
   (si nadie confirma 15 min después de la hora → cancelada por el sistema)
   ↓
Cliente llega → taller crea orden (F06)   cita: atendida · orden: recibido
   (solo si la cita está confirmada y es de hoy)
   ↓
Admin asigna mecánico (F09)  (si crea la orden un empleado, queda asignada a él)
   ↓
El mecánico asignado (o el admin) avanza estatus (F07)
   recibido → en diagnóstico → en reparación → listo → entregado
   ↓
La orden entregada queda en el historial (F08), con las refacciones usadas (F10, sin costos para el cliente)
   (para entregar, el taller captura antes la mano de obra: F07, Q48)
   ↓
El cliente pide la factura de la orden entregada (F11): una por orden, imprimible / PDF
```

## Datos que viajan entre pantallas

| Desde | Hacia | Dato |
|---|---|---|
| `/cliente` | `/cliente/vehiculos/:id` | `vehiculoId` |
| `/cliente/citas/nueva` | (formulario) | `vehiculoId` opcional, si se llega desde un vehículo |
| `/taller/ordenes/nueva` | `/taller/citas` | `fecha` (query `?fecha=AAAA-MM-DD`, para ver la agenda de la cita futura de un vehículo; la vista por día es `?vista=dia&fecha=`, la de mes `?vista=mes&mes=AAAA-MM`) |
| `/taller/citas` | `/taller/ordenes/nueva` | `citaId` (la orden se precarga con el vehículo de la cita) |
| `/taller/ordenes` | `/taller/ordenes/:id` | `ordenId` |
| `/taller` | `/taller/inventario` | `filtro=bajo` (query, desde la alerta de bajo stock) |
| `/taller/inventario` | `/taller/inventario/:id` | `piezaId` |
| `/taller/inventario/:id` | `/taller/ordenes/:id` | `ordenId` (enlace en la columna Orden de los movimientos) |
| `/taller/ordenes/:id` | `/taller/vehiculos/:id` | `vehiculoId` |
| `/cliente/vehiculos/:id`, `/cliente/historial` (servicio entregado) | `/cliente/facturas/nueva` | `ordenId` (query `?ordenId=`) |
| `/cliente/vehiculos/:id`, `/cliente/facturas`, formulario de factura | `/cliente/facturas/:id` | `facturaId` |
| `/taller/ordenes/:id` | `/taller/facturas/:id` | `facturaId` (enlace "Ver factura {folio}") |

## Reglas de acceso

- Sin sesión, cualquier ruta privada redirige a `/login`.
- Al iniciar sesión se redirige según el rol: cliente → `/cliente`; empleado y administrador → `/taller` (el admin entra a Empleados desde el menú).
- Un usuario que entra a una ruta de otro rol recibe la pantalla **"No tienes permiso"**, no la pantalla de otro rol.
- La protección real está en **la base de datos** con políticas RLS, `GRANT` por columna y funciones `rpc` de Supabase (ver `02-data-model.md`). El frontend oculta rutas y botones, pero aunque alguien llame a la API directamente, Supabase rechaza lo que su rol no permite.

## Estados que toda pantalla de lista debe contemplar

- cargando;
- con datos;
- lista vacía (con mensaje y, si aplica, botón para crear el primero);
- error de conexión (con botón "Reintentar").
