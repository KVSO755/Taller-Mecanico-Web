# 10 · Componentes base de la interfaz

**Fecha:** 21/11/2026 14:52
**Feature / área:** F01 y todas las pantallas

## Qué se trabajó
- Componentes reutilizables con el sistema visual «Manual de servicio».
- Estados de lista estándar (cargando, vacía, error con "Reintentar") para cumplir la regla de `01-navigation.md`.

## Archivos
- `src/components/Boton.jsx` y `clasesBoton.js` — variantes primario, secundario, peligro, fantasma y claro; tamaño compacto; estado "cargando".
- `src/components/Input.jsx` — etiqueta, error con icono y texto (no solo color), atributos ARIA.
- `src/components/Alerta.jsx` — error / éxito / info con tinte y borde completo.
- `src/components/EstadoLista.jsx` — los 4 estados de una lista.
- `src/components/Spinner.jsx` — indicador de carga.
- `src/components/EncabezadoPagina.jsx` — título, fecha al lado (escritorio) o debajo (celular) y acciones.
- `src/components/PantallaAcceso.jsx` — marco de Login/Registro con panel cobalto y horario real del taller.

## Decisiones y notas
- Controles de 44 px en celular para tocarlos con facilidad; 40 px (o 36 px compacto) en escritorio.
- El estado siempre se comunica con texto además del color (accesibilidad).

## Siguiente paso
- Sesión y rutas protegidas de F01.
