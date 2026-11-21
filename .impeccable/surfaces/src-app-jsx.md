---
version: 1
slug: "src-app-jsx"
primary_target: "src/App.jsx"
related_targets: ["src/components","src/pages"]
---

# TallerApp — interfaz completa (cliente, taller, admin)

**Modo:** Operate. Todas las pantallas de la app (auth, cliente, taller, admin), totalmente responsivas en celular y escritorio.

**Audiencia y tarea:** cliente que agenda y sigue su carro desde el celular; empleado/admin que confirma citas, crea órdenes y avanza estatus en mostrador o celular. Datos reales de Supabase; demo en vivo con `supabase/seed.sql`.

**Restricciones:** stack React 19 + Tailwind v4 sin librerías de UI; textos y mensajes de error de las specs se conservan tal cual; servicios en `src/services/` no se tocan; 4 estados de lista (cargando, datos, vacía, error con Reintentar); accesible (labels, foco visible, estado con texto y no solo color).

**Momento memorable:** el avance de la orden dibujado como 5 llamadas numeradas sobre una línea guía; la agenda del taller como eje de tiempo con 3 bahías.

## Direction contract

THESIS: El taller se lee como un manual de servicio: cada vehículo, cita y orden es una pieza con número propio, y el avance es una secuencia de llamadas numeradas. Rechaza el panel SaaS de tarjetas blancas con badges de colores y métricas grandes.

OWN-WORLD: Fondo #F6F7F4, tinta #1B1F24, shell cobalto sólido #1D3FA8 (riel en escritorio, barra superior en celular), amarillo llamada #F2B705 solo para "lo actual" (paso en curso, ítem activo, selección), líneas #C7CCD1. Estados: pendiente ámbar #9A6700, confirmada verde #1E6B3A, cancelada rojo #B42318, atendida/entregado gris #6B7280. Color plano, sin degradados ni sombras difusas; elevación por borde. Barlow Condensed 600/700 para títulos, placas, folios y etiquetas en mayúsculas; Barlow 400/500 para texto; números tabulares. Radios de 2px. Tablas de "refacciones" con encabezado en mayúsculas y regla superior de 2px en tinta.

STORY: El cliente entiende en un vistazo en qué paso va su carro y cuándo es su cita; agenda en tres pasos (vehículo, día, bloque). El taller ve la agenda de hoy por hora y bahía, y cada orden con su siguiente acción única (Confirmar, Crear orden, Avanzar a…).

FIRST VIEWPORT: Inicio del taller (escritorio 1440): riel cobalto 240px a la izquierda con marca, menú (ítem activo con tinte blanco y marca amarilla), usuario y Salir; encabezado con título "Inicio del taller", fecha al lado (no como eyebrow) y buscador por placa a la derecha; debajo, agenda de hoy como retícula hora × 3 lugares (capacidad; las citas no guardan bahía asignada, por eso las columnas no se rotulan "Bahía n": sería afirmar algo que el sistema no registra) (placa grande, cliente, motivo, estado con texto; celdas libres punteadas; fila llena marcada "Lleno") y a la derecha 420px de órdenes abiertas con folio, placa grande y las 5 llamadas. Acción principal: Buscar por placa y las acciones de cada cita. En celular: barra cobalto superior con menú desplegable, agenda como lista por hora y órdenes apiladas.

FORM: Manual de servicio (catálogo de despiece con llamadas numeradas); candidato 7 de 7 de la lista propia; seed:6e82e84f563f9229. Movimiento firma: ProgresoOrden como llamadas numeradas unidas por línea guía; agenda como eje de tiempo con 3 bahías; folios (#0005) como ancla.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
