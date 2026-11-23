# Guía del proyecto: ¿dónde está cada cosa?

Mapa rápido de **TallerApp** para encontrar cualquier parte del sistema: documentación, base de datos, pantallas y lógica. Para instalar y correr el proyecto, ver [`README.md`](README.md).

---

## 1. Vista general

```text
Taller_Mecanico/
├── README.md                         instalación, configuración y guion de demo
├── GUIA_DEL_PROYECTO.md              este archivo
├── Metodologia_SDD_Taller_Mecanico.md documento de entrega (se genera a partir de specs/)
├── PRODUCT.md                        quiénes usan el sistema y para qué (producto)
├── DESIGN.md                         sistema de diseño: colores, tipografía, componentes
├── specs/                            especificaciones SDD (fuente de verdad)
├── supabase/                         base de datos: tablas, reglas, seguridad, datos demo y pruebas
├── src/                              código de la aplicación (React)
├── public/                           archivos estáticos (fuentes Barlow, ícono)
├── bitacora/                         registro de lo trabajado en cada commit
├── .impeccable/                      decisiones de diseño (dirección visual elegida)
├── vercel.json                       despliegue en Vercel y cabeceras de seguridad
├── vite.config.js · package.json     configuración de Vite y dependencias
└── .env.example                      variables de entorno necesarias (sin valores)
```

> `.env.local` (con la URL y la llave pública de Supabase) existe solo en tu computadora y **nunca** se sube a GitHub.

---

## 2. Documentación (`specs/` y raíz)

| Archivo | Qué contiene |
|---|---|
| `specs/00-project.md` | Problema, usuarios, lista de features (F01–F11), supuestos y funciones futuras |
| `specs/01-navigation.md` | Todas las pantallas y rutas por rol, flujo principal, reglas de acceso |
| `specs/02-data-model.md` | Entidades, relaciones, reglas de negocio, permisos por rol y funciones de la BD |
| `specs/03-decisiones-tecnicas.md` | Tecnología elegida, estructura del repo, reglas y sección de **Seguridad** |
| `specs/04-plan-de-trabajo.md` | Calendario, avance por feature, **registro de cambios (Q1–Q52)** y pendientes de prueba manual |
| `specs/features/F01…F11-*.md` | Una spec por funcionalidad: flujos, validaciones, mensajes de error, criterios de aceptación y tareas |
| `PRODUCT.md` | Usuarios, propósito y principios del producto |
| `DESIGN.md` | Sistema visual «Manual de servicio»: tokens, componentes y reglas |
| `bitacora/NN-*.md` | Qué se hizo en cada commit, con archivos y decisiones |

---

## 3. Base de datos (`supabase/`)

Se ejecutan en el **SQL Editor de Supabase** en este orden. Todos se pueden volver a correr sin problema.

| Orden | Archivo | Qué contiene |
|---|---|---|
| 1 | `schema.sql` | Tipos, **tablas**, índices, restricciones de formato/longitud y RLS activado |
| 2 | `functions.sql` | `mi_rol()`, trigger que crea el perfil al registrarse, **funciones RPC** con las reglas de negocio y tarea `pg_cron` |
| 3 | `policies.sql` | **Seguridad**: permisos por columna y políticas RLS (quién ve y edita qué) |
| 4 | `seed.sql` | Datos de demostración (requiere crear antes las 4 cuentas desde `/registro`) |
| 5 | `tests.sql` | 18 grupos de pruebas de seguridad y reglas; todo se deshace al final (`rollback`) |

### Tablas

| Tabla | Para qué |
|---|---|
| `perfiles` | Usuarios: nombre, teléfono, rol (cliente/empleado/admin), activo |
| `vehiculos` | Carros de cada cliente (placa única) |
| `citas` | Citas por bloque de 1 hora (pendiente, confirmada, cancelada, atendida) |
| `ordenes` | Órdenes de servicio: estatus, diagnóstico, trabajo, mecánico asignado, mano de obra |
| `cambios_estatus` | Bitácora de cada avance de una orden |
| `piezas` | Inventario de refacciones: código, compatibilidad, costo, existencias, mínimo |
| `movimientos_inventario` | Entradas, salidas, devoluciones y ajustes de existencias |
| `orden_piezas` | Refacciones usadas en cada orden |
| `facturas` · `factura_conceptos` | Facturas simples (no CFDI) y sus conceptos congelados |

### Funciones RPC principales (en `functions.sql`)

| Área | Funciones |
|---|---|
| Citas | `bloques_ocupados`, `agendar_cita`, `confirmar_cita`, `reprogramar_cita`, `cancelar_cita`, `cancelar_citas_vencidas` |
| Órdenes | `crear_orden`, `avanzar_estatus_orden`, `asignar_orden`, `nombre_mecanico` |
| Empleados | `cambiar_rol`, `cambiar_activo` |
| Inventario | `crear_pieza`, `registrar_entrada`, `ajustar_existencias`, `usar_pieza_en_orden`, `quitar_pieza_de_orden`, `piezas_usadas` |
| Facturas | `solicitar_factura` |

---

## 4. Aplicación (`src/`)

```text
src/
├── main.jsx · App.jsx     arranque y todas las rutas (carga diferida por sección)
├── index.css              sistema visual (tokens, fuentes, clases propias, impresión)
├── lib/supabase.js        conexión a Supabase (solo llave pública)
├── context/AuthContext.jsx sesión, perfil y rol del usuario
├── routes/                protección de rutas por rol
├── services/              TODA la comunicación con la base de datos
├── pages/                 pantallas (auth, cliente, taller, admin)
├── components/            piezas de interfaz reutilizables
└── utils/                 funciones de apoyo (fechas, horarios, catálogos…)
```

> Regla del proyecto: **las pantallas nunca llaman a Supabase directamente**; siempre pasan por `src/services/`.

### Servicios (`src/services/`)

| Archivo | Qué hace |
|---|---|
| `auth.js` | Iniciar sesión, registrarse, cerrar sesión, recuperar y cambiar contraseña |
| `perfiles.js` | Perfil propio, empleados, crear cuenta de empleado, cambiar rol/activo |
| `vehiculos.js` | Vehículos del cliente e historial del vehículo |
| `citas.js` | Bloques disponibles, agendar, confirmar, reprogramar, cancelar, agenda por día/mes |
| `ordenes.js` | Crear, listar, detalle, notas, avanzar estatus, asignar mecánico |
| `inventario.js` | Piezas, filtros por marca/modelo, entradas, ajustes, refacciones de la orden |
| `facturas.js` | Pedir factura, ver factura, mis facturas |
| `errores.js` | Traduce los errores a los mensajes en español de las specs |

---

## 5. ¿Dónde está cada funcionalidad?

| Feature | Spec | Pantallas (`src/pages/`) | Componentes / servicios clave |
|---|---|---|---|
| **F01** Registro e inicio de sesión | `F01-registro-login.md` | `auth/Login.jsx`, `auth/Registro.jsx`, `auth/Recuperar.jsx`, `auth/Restablecer.jsx`, `SinPermiso.jsx`, `NoEncontrado.jsx` | `context/AuthContext.jsx`, `routes/RutaProtegida.jsx`, `components/Layout.jsx`, `PantallaAcceso.jsx`, `services/auth.js` |
| **F02** Gestión de empleados | `F02-gestion-empleados.md` | `admin/Empleados.jsx` | `services/perfiles.js` |
| **F03** Registrar vehículo | `F03-registrar-vehiculo.md` | `cliente/Inicio.jsx`, `cliente/NuevoVehiculo.jsx` | `components/FormVehiculo.jsx`, `utils/placa.js`, `services/vehiculos.js` |
| **F04** Agendar cita | `F04-agendar-cita.md` | `cliente/NuevaCita.jsx`, `cliente/Citas.jsx` | `utils/horarios.js`, `services/citas.js` |
| **F05** Gestionar citas (día y mes) | `F05-gestionar-citas.md` | `taller/Citas.jsx` | `components/AgendaRejilla.jsx`, `AgendaMes.jsx`, `ReprogramarCita.jsx` |
| **F06** Crear orden | `F06-crear-orden.md` | `taller/NuevaOrden.jsx` | `services/ordenes.js` |
| **F07** Estatus de la orden | `F07-actualizar-estatus-orden.md` | `taller/Ordenes.jsx`, `taller/DetalleOrden.jsx` | `components/ProgresoOrden.jsx`, `utils/estatusOrden.js`, `utils/trabajo.js` |
| **F08** Historial del vehículo | `F08-historial-vehiculo.md` | `cliente/DetalleVehiculo.jsx`, `taller/HistorialVehiculo.jsx` | `components/HistorialServicios.jsx` |
| **F09** Asignar órdenes a mecánicos | `F09-asignar-ordenes.md` | `taller/Inicio.jsx` (Mis trabajos), `taller/DetalleOrden.jsx` | `services/ordenes.js` (`asignarOrden`) |
| **F10** Inventario de refacciones | `F10-inventario.md` | `taller/Inventario.jsx`, `taller/DetallePieza.jsx` | `components/RefaccionesOrden.jsx`, `RefaccionesCliente.jsx`, `utils/catalogoVehiculos.js`, `utils/inventario.js` |
| **F11** Facturación | `F11-facturacion.md` | `cliente/NuevaFactura.jsx`, `cliente/Facturas.jsx`, `FacturaPage.jsx` | `components/FacturaDocumento.jsx`, `utils/catalogosSat.js`, `services/facturas.js` |

### Rutas por rol

| Rol | Rutas |
|---|---|
| Público | `/login`, `/registro` |
| Cliente | `/cliente`, `/cliente/vehiculos/nuevo`, `/cliente/vehiculos/:id`, `/cliente/citas`, `/cliente/citas/nueva`, `/cliente/facturas`, `/cliente/facturas/nueva`, `/cliente/facturas/:id` |
| Empleado y admin | `/taller`, `/taller/citas` (`?vista=dia\|mes`), `/taller/ordenes`, `/taller/ordenes/nueva`, `/taller/ordenes/:id`, `/taller/vehiculos/:id`, `/taller/inventario`, `/taller/inventario/:id`, `/taller/facturas/:id` |
| Solo admin | `/admin/empleados` |

---

## 6. Componentes reutilizables (`src/components/`)

| Componente | Uso |
|---|---|
| `Layout.jsx` | Menú lateral (escritorio) / barra superior (celular) según el rol |
| `Boton.jsx` · `clasesBoton.js` | Botones (primario, secundario, peligro, fantasma, claro, compacto) |
| `Input.jsx` · `CampoSelect.jsx` | Campos de formulario con etiqueta y error accesibles |
| `Alerta.jsx` | Mensajes de error, éxito e información |
| `EstadoLista.jsx` | Estados de una lista: cargando, vacía, error con "Reintentar" |
| `BadgeEstatus.jsx` | Etiqueta de estatus (cuadro de color + texto) |
| `EncabezadoPagina.jsx` | Título de página con fecha y acciones |
| `ProgresoOrden.jsx` | Avance de la orden en 5 pasos numerados (firma del diseño) |
| `AgendaRejilla.jsx` · `AgendaMes.jsx` | Agenda por hora × 3 lugares y calendario mensual |
| `FacturaDocumento.jsx` | Hoja de factura imprimible |

---

## 7. Configuración y seguridad

| Qué | Dónde |
|---|---|
| Variables de entorno | `.env.example` (plantilla) → `.env.local` (tu copia, no se sube) |
| Despliegue y cabeceras de seguridad (CSP, HSTS, anti-clickjacking) | `vercel.json` |
| Reglas de acceso a los datos | `supabase/policies.sql` y validaciones dentro de `supabase/functions.sql` |
| Pruebas de seguridad | `supabase/tests.sql` (grupos 1–18) |
| Decisiones de seguridad | `specs/03-decisiones-tecnicas.md` → sección "Seguridad" |

---

## 8. Cómo encontrar algo rápido

- **"¿Qué regla aplica aquí?"** → la spec de la feature en `specs/features/`.
- **"¿Por qué se decidió así?"** → registro de cambios Q1–Q52 en `specs/04-plan-de-trabajo.md`.
- **"¿Dónde se valida esta regla de verdad?"** → la función en `supabase/functions.sql` (el frontend solo ayuda; la BD decide).
- **"¿Qué pantalla es esta URL?"** → `src/App.jsx` (todas las rutas) o la tabla de rutas de arriba.
- **"¿De dónde sale este dato?"** → el servicio correspondiente en `src/services/`.
- **"¿Por qué se ve así?"** → `DESIGN.md` y `src/index.css`.
