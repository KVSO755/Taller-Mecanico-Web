# Casos límite para practicar antes de presentar

Cada caso se probó contra el código actual de la app. En todos, la app **no se rompe**: muestra un mensaje en español, impide la acción o se recupera sola. Nunca debe haber pantalla en blanco, error en consola ni registros duplicados.

Roles: **Cliente** (`/cliente`), **Empleado** (`/taller`) y **Admin** (`/taller` + `/admin/empleados`).

## Campos vacíos, números y textos largos

| Caso | Dónde probarlo | Qué pasa (resultado esperado) |
|---|---|---|
| Enviar el formulario vacío | Cliente > Agregar vehículo, Registro, Agendar cita, Pedir factura; Admin > Crear empleado | No se envía. Cada campo vacío muestra su mensaje en rojo debajo ("La placa es obligatoria.", "Elige el vehículo para la cita.", etc.) y el foco salta al primer campo con error. |
| Placa con guiones y minúsculas: `abc-123` | Cliente > Agregar vehículo; buscador de placa en Inicio taller; Nueva orden (búsqueda directa) | El campo la convierte sola a `ABC123` (mayúsculas, sin guiones ni espacios) y la encuentra o guarda con ese formato. Con menos de 5 o más de 8 caracteres: "La placa debe tener de 5 a 8 letras o números, sin símbolos." |
| Placa repetida | Cliente > Agregar vehículo con una placa ya registrada | "Ya hay un vehículo registrado con esta placa." El formulario conserva lo escrito. |
| Año o kilometraje con texto, negativo o decimal: `abc`, `-5`, `12.5`, `1900` | Agregar vehículo; Nueva orden (kilometraje de llegada) | Mensaje bajo el campo ("El kilometraje debe ser un número entero, sin letras ni decimales.", "no puede ser negativo.", "El año debe estar entre 1950 y …"). El teclado móvil es numérico y nunca se manda `NaN` a la base. |
| Kilometraje de llegada menor al registrado | Taller > Nueva orden | "El kilometraje no puede ser menor a X km (último registrado)." |
| Nombre de 200 letras, o 200 caracteres sin espacios | Registro (nombre), Agregar vehículo (marca/modelo), Nueva pieza (nombre) | El campo deja de aceptar texto en el límite (nombre 120, marca y modelo 60, pieza 120). El diseño no se desborda, porque el texto largo sin espacios se corta en varias líneas. |
| Motivo de cita de 200 caracteres sin espacios | Cliente > Agendar cita, luego Mis citas y Citas del taller | El contador marca `200/200` y no deja escribir más. Con menos de 5 caracteres: "El motivo debe tener al menos 5 caracteres." En las listas el texto se parte y no rompe la tabla ni las fichas. |
| Diagnóstico o trabajo realizado de más de 2000 caracteres (pegar un texto enorme) | Taller > detalle de orden; Nueva orden (diagnóstico inicial) | El área de texto corta en 2000 y muestra el contador `n/2000`. |
| Costo o mano de obra con letras, negativo o más de 2 decimales: `abc`, `-50`, `12.345` | Inventario > Nueva pieza, Editar pieza; detalle de orden > Mano de obra | Mensaje bajo el campo ("El costo no puede ser negativo.", "… máximo 2 decimales (ej. 150.50)."). No se guarda nada. |
| Registrar entrada con cantidad `0`, `-3` o `2.5`; ajuste de existencias sin motivo o sin cambio | Taller > detalle de pieza | "La cantidad debe ser mayor a 0.", "… sin letras ni decimales.", "Escribe el motivo del ajuste." o "Las existencias no cambiaron." El motivo admite hasta 300 caracteres con contador. |
| Código de pieza repetido o de más de 20 caracteres | Inventario > Nueva pieza | El campo no deja pasar de 20 caracteres. Si el código ya existe: "Ya existe una pieza con ese código." |
| Contraseñas distintas, teléfono de 9 dígitos, correo sin `@` | Registro; Admin > Crear empleado | Mensajes bajo cada campo. Correo ya registrado: "Ya existe una cuenta con este correo." |

## Búsquedas sin resultado

| Caso | Dónde probarlo | Qué pasa (resultado esperado) |
|---|---|---|
| Buscar una placa que no existe: `ZZZ999` | Taller > Inicio (buscador) y Nueva orden (búsqueda directa) | "No se encontró ningún vehículo con la placa ZZZ999…" (en Nueva orden agrega "El cliente debe registrarlo primero."). No queda la pantalla vacía. |
| Buscar texto inexistente en inventario: `xyzxyz` | Taller > Inventario | "No se encontró ninguna pieza que coincida con «xyzxyz»…" y el botón **Limpiar filtros**. |
| Buscar por correo que no existe | Admin > Empleados > pestaña "Ya tiene cuenta" | "No hay ninguna cuenta con ese correo. Pide a la persona que se registre primero." |

## Dobles clics y concurrencia

| Caso | Dónde probarlo | Qué pasa (resultado esperado) |
|---|---|---|
| Doble clic rápido en Agendar, Guardar, Crear orden, Generar factura, Agregar refacción, Registrar entrada, Avanzar, Asignar o Cancelar | Cualquier formulario o botón de acción | La acción se ejecuta **una sola vez**: el botón se bloquea desde el primer clic (con candado síncrono, no solo con el estado). No se duplican citas, órdenes, facturas ni movimientos. |
| Agendar el 4.º lugar de una hora llena | Cliente > Agendar cita | Una hora con 3 citas ya no aparece entre los horarios. Si alguien la ocupa justo mientras tú eliges: "Ese horario se acaba de ocupar. Elige otro." y la lista de horas se actualiza sola. |
| Pedir factura dos veces | Cliente > Pedir factura (doble clic o repetir desde el historial) | Se genera una sola. Al intentar de nuevo: "Esta orden ya tiene la factura …". En el historial aparece "Ver factura" en lugar de "Pedir factura". |
| Usar más piezas de las que hay | Taller > detalle de orden > Agregar refacción (cantidad mayor a las existencias) | "Solo hay N en existencia de esta pieza." (y, si otro la gastó antes, "No hay suficientes existencias: quedan N."). Las piezas agotadas salen deshabilitadas en la lista. |
| Cambiar rápido de fecha o de filtro | Agendar cita, Citas del taller, Órdenes, Inventario | Solo se muestra el resultado de la última selección; una respuesta lenta anterior no pisa a la nueva. |

## Reglas de negocio y permisos

| Caso | Dónde probarlo | Qué pasa (resultado esperado) |
|---|---|---|
| Elegir un domingo, o una fecha fuera de mañana a +30 días | Cliente > Agendar cita; Taller > Reprogramar | Domingo: "El taller no abre ese día." y, al enviar, "El taller no abre los domingos. Elige otro día." bajo la fecha. Fuera de rango: "Elige una fecha a partir de mañana y dentro de los próximos 30 días." |
| Cancelar una cita a menos de 1 hora | Cliente > Mis citas | No aparece el botón Cancelar; sale "Ya no puedes cancelar en línea. Llama al taller." |
| Empleado no asignado intenta avanzar una orden | Empleado > detalle de una orden de otro mecánico o sin asignar | No hay botón Avanzar ni Guardar notas; aviso "Esta orden está asignada a otro mecánico." o "…no tiene mecánico asignado. Pide al administrador que la asigne." |
| Cliente escribe `/taller` (o `/admin/empleados`) en la URL | Sesión de cliente | Pantalla "No tienes permiso" con botón "Ir a mi inicio". Sin sesión, lo manda a `/login`. |
| Desactivar a un empleado con sesión abierta | Admin > Empleados > Desactivar; el empleado ya tenía la app abierta | Al volver a su pestaña (o recargar), se cierra su sesión y ve "Tu cuenta está desactivada. Contacta al taller." No puede volver a entrar. |

## Rutas y parámetros inválidos, recargas

| Caso | Dónde probarlo | Qué pasa (resultado esperado) |
|---|---|---|
| `/taller/ordenes/abc`, `/cliente/vehiculos/999999`, `/cliente/facturas/xyz`, `/taller/inventario/0`, `/taller/vehiculos/abc` | Escribirlas en la barra de direcciones | "Orden no encontrada.", "Vehículo no encontrado.", "Factura no encontrada.", "Pieza no encontrada." con botón o enlace Regresar. Sin pantalla en blanco ni error en consola. |
| `/taller/ordenes/nueva?citaId=basura`; `/cliente/facturas/nueva?ordenId=basura`; `/cliente/citas/nueva?vehiculoId=basura` | Barra de direcciones | "Cita no encontrada."; "Falta indicar el servicio a facturar…" con enlace al inicio; el formulario de cita se abre sin vehículo preseleccionado. |
| `/taller/citas?fecha=2026-99-99`, `?mes=hola`, `?vista=xx`; `/taller/inventario?filtro=basura&marca=hola` | Barra de direcciones (empleado) | Caen al valor por defecto (hoy, mes actual, vista Día, filtro Todas, marca Todas). |
| Una dirección que no existe: `/loquesea` | Barra de direcciones | "Página no encontrada" con botón "Ir al inicio". |
| Recargar a mitad de Agendar cita, Pedir factura, Nueva orden o Crear empleado (F5) | Esos formularios, con datos a medias | La pantalla carga limpia con el formulario vacío (o con los últimos datos fiscales en la factura); nada queda a medias ni se duplica. |

## Red lenta o caída

| Caso | Dónde probarlo | Qué pasa (resultado esperado) |
|---|---|---|
| Abrir una pantalla sin internet (DevTools > Network > Offline, o "Slow 3G") | Cualquier lista: Inicio, Mis citas, Órdenes, Inventario, Empleados | Con red lenta se ve "Cargando…" con esqueleto. Sin red: el mensaje de error y el botón **Reintentar**, que vuelve a cargar al regresar la conexión. |
| Guardar un formulario sin internet | Agregar vehículo, Agendar cita, Nueva orden, Guardar notas, Nueva pieza, etc. | "No se pudo conectar. Revisa tu internet e intenta de nuevo." Lo escrito se conserva y el botón se vuelve a habilitar para reintentar. |

## Listas vacías

| Caso | Dónde probarlo | Qué pasa (resultado esperado) |
|---|---|---|
| Cliente recién registrado | Cliente > Inicio, Mis citas, Mis facturas, detalle de vehículo nuevo | "Aún no tienes vehículos registrados" con botón Agregar vehículo; "Aún no tienes citas."; "Aún no tienes facturas…"; "Este vehículo aún no tiene servicios registrados." |
| Taller sin datos | Taller > Órdenes (filtros), Citas de un día sin citas, Inventario con filtro "Inactivas", orden recién creada, pieza sin movimientos | "No hay órdenes abiertas.", "No hay citas para este día.", "No hay piezas inactivas.", "Esta orden aún no tiene cambios de estatus registrados.", "Esta pieza aún no tiene movimientos." |

## Error inesperado de la pantalla

Si una pantalla falla al dibujarse o un archivo de la app ya no existe (por ejemplo, la pestaña quedó abierta durante un despliegue nuevo), la app muestra "Algo salió mal. Recarga la página." (o el aviso de versión nueva) con el botón **Recargar**, en lugar de una pantalla en blanco. Navegar a otra opción del menú reintenta dibujar. Es difícil provocarlo a mano; se explica, no se practica.
