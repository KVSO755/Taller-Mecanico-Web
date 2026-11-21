# Navegación y pantallas

## Mapa de pantallas por rol

```text
Público
├── /login                      Iniciar sesión               (F01)
└── /registro                   Registro de cliente          (F01)

Cliente  (/cliente)
├── /cliente                    Inicio: mis vehículos y próximas citas
├── /cliente/vehiculos/nuevo    Registrar vehículo           (F03)
├── /cliente/vehiculos/:id      Detalle + historial          (F08)
├── /cliente/citas              Mis citas
└── /cliente/citas/nueva        Agendar cita                 (F04)

Empleado  (/taller)
├── /taller                     Inicio: citas de hoy y órdenes abiertas
├── /taller/citas               Agenda de citas              (F05)
├── /taller/ordenes             Lista de órdenes             (F07)
├── /taller/ordenes/nueva       Crear orden                  (F06)
├── /taller/ordenes/:id         Detalle y cambio de estatus  (F07)
└── /taller/vehiculos/:id       Historial del vehículo       (F08)

Administrador  (/admin)
├── todo lo de /taller
└── /admin/empleados            Alta / baja de empleados     (F02)
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
Taller avanza estatus (F07)
   recibido → en diagnóstico → en reparación → listo → entregado
   ↓
La orden entregada queda en el historial (F08)
```

## Datos que viajan entre pantallas

| Desde | Hacia | Dato |
|---|---|---|
| `/cliente` | `/cliente/vehiculos/:id` | `vehiculoId` |
| `/cliente/citas/nueva` | (formulario) | `vehiculoId` opcional, si se llega desde un vehículo |
| `/taller/citas` | `/taller/ordenes/nueva` | `citaId` (la orden se precarga con el vehículo de la cita) |
| `/taller/ordenes` | `/taller/ordenes/:id` | `ordenId` |
| `/taller/ordenes/:id` | `/taller/vehiculos/:id` | `vehiculoId` |

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
