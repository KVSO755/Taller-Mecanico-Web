# Proyecto final — Sistema de Gestión para Taller Mecánico

## Nombre

**TallerApp** (nombre provisional).

## Problema

Los talleres mecánicos pequeños y medianos manejan sus citas, órdenes de servicio y el historial de los vehículos en papel, libretas o por teléfono. Esto provoca:

- citas que se empalman porque nadie ve la agenda completa;
- pérdida de información sobre qué se le hizo a cada vehículo;
- clientes que llaman varias veces para saber si su carro ya está listo;
- falta de seguimiento del trabajo de cada mecánico.

## Usuario objetivo

| Rol | Descripción |
|---|---|
| **Cliente** | Persona dueña de uno o más vehículos que necesita agendar servicio y saber el estado de su carro sin llamar al taller. |
| **Empleado / Mecánico** | Trabajador del taller que recibe vehículos, hace el diagnóstico y actualiza el avance de la reparación. |
| **Administrador** | Dueño o encargado del taller que da de alta empleados y supervisa todas las citas y órdenes. |

Usuario principal: **el cliente**, porque es quien inicia el proceso agendando una cita.

## Propuesta de solución

Una aplicación web con acceso por rol donde:

- el cliente registra sus vehículos, agenda citas según los horarios disponibles y consulta el estatus y el historial de su vehículo;
- el taller confirma, reprograma o cancela citas, crea órdenes de servicio y actualiza su estatus;
- todo servicio terminado queda guardado en una bitácora por vehículo.

## MVP

| ID | Feature | Rol(es) | Módulo |
|---|---|---|---|
| F01 | Registro e inicio de sesión con roles | Todos | Usuarios |
| F02 | Gestión de empleados | Administrador | Usuarios |
| F03 | Registrar vehículo | Cliente | Vehículos |
| F04 | Agendar cita | Cliente | Citas |
| F05 | Gestionar citas (confirmar, reprogramar, cancelar) | Empleado, Administrador | Citas |
| F06 | Crear orden de servicio | Empleado, Administrador | Órdenes |
| F07 | Actualizar estatus de orden | Empleado, Administrador | Órdenes |
| F08 | Consultar historial del vehículo | Todos | Historial |
| F09 | Asignar órdenes a un mecánico | Administrador, Empleado | Órdenes |
| F10 | Inventario de refacciones | Empleado, Administrador (el cliente ve las piezas usadas, sin costos) | Inventario |
| F11 | Facturación (factura simple imprimible) y mano de obra | Cliente (pide y ve su factura), Empleado, Administrador (capturan la mano de obra y ven las facturas) | Facturación |

Cada feature tiene su spec en `specs/features/`.

## Tecnología

JavaScript · React (Vite) · Tailwind CSS · Supabase (Auth + PostgreSQL + RLS). Detalle en `03-decisiones-tecnicas.md`.

## Funcionalidades futuras (fuera del MVP)

- Notificaciones por correo o WhatsApp cuando cambia el estatus de la orden.
- Cotización con desglose de refacciones y mano de obra (el costo de las refacciones ya existe en F10 y la mano de obra se captura en F11; la cotización previa con aprobación del cliente sigue fuera del MVP).
- Timbrado CFDI con un PAC (la factura de F11 es un documento simple, no un Comprobante Fiscal Digital por Internet).
- Subir fotos del vehículo al recibirlo.
- Recuperación de contraseña por correo.
- Reportes (servicios por mes, mecánico con más órdenes).

## Supuestos (validados)

Estos puntos no vienen en la propuesta original; fueron validados y son decisiones firmes:

1. **Horario del taller:** lunes a viernes de 08:00 a 18:00 y sábado de 08:00 a 14:00. Domingo cerrado.
2. **Bloques de cita:** de 1 hora.
3. **Capacidad:** máximo **3 citas por bloque** (3 lugares simultáneos; las citas no guardan bahía, solo cuentan por hora). Es el valor que define "disponibilidad" y evita traslapes.
   - **Zona horaria:** fija, `America/Tijuana`, para validar horarios y fechas.
4. Todo el que se registra entra como **cliente**. El administrador convierte a un usuario en **empleado** (F02) cambiándole el rol, ya sea buscándolo por correo o creándole la cuenta desde la pantalla de Empleados (Q30: se registra con un cliente Supabase secundario y luego se cambia el rol con `cambiar_rol`; no se usa la llave `service_role`, que nunca debe ir en el navegador). El primer administrador se asigna a mano en el panel de Supabase.
5. Un vehículo pertenece a un solo cliente. La placa es única en el sistema.
6. El historial (F08) se forma con las órdenes de servicio del vehículo; no es una tabla aparte que se llene a mano.

## Índice de specs

```text
specs/
├── 00-project.md               ← este archivo
├── 01-navigation.md            pantallas, rutas y acceso por rol
├── 02-data-model.md            entidades y reglas de datos
├── 03-decisiones-tecnicas.md   tecnología elegida (después de los datos)
├── 04-plan-de-trabajo.md       tareas y calendario hasta la entrega
└── features/
    ├── F01-registro-login.md
    ├── F02-gestion-empleados.md
    ├── F03-registrar-vehiculo.md
    ├── F04-agendar-cita.md
    ├── F05-gestionar-citas.md
    ├── F06-crear-orden.md
    ├── F07-actualizar-estatus-orden.md
    ├── F08-historial-vehiculo.md
    ├── F09-asignar-ordenes.md
    ├── F10-inventario.md
    └── F11-facturacion.md
```
