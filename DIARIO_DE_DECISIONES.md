# Diario de decisiones

> **Borrador para revisar.** Resume las decisiones del proyecto. El detalle completo (Q1–Q52) está en `specs/04-plan-de-trabajo.md` → "Registro de cambios". Ajústalo con tus palabras antes de entregar.

Formato: **Decisión** · alternativas consideradas · **por qué**.

## Sábado 21 de noviembre de 2026

### Producto y reglas del taller
- **Horario L–V 8–18, sábado 8–14, domingo cerrado; bloques de 1 h con 3 lugares** (Q1) · ilimitado / por mecánico · es lo que define "disponible" y evita empalmes.
- **Todo el que se registra es cliente; el admin lo convierte en empleado** (Q1, supuesto 4) · que el admin cree cuentas desde el inicio · crear cuentas ajenas exigía la llave `service_role`, que nunca debe ir en el navegador. Más tarde (Q30) se agregó crear empleados desde el panel con un cliente aparte, también sin `service_role`.
- **"Cita activa" = pendiente o confirmada y con fecha futura** (Q4) · solo por estatus · si un cliente no llega, su carro no quedaría bloqueado para siempre.
- **Zona horaria fija America/Tijuana** en la BD y en la app (Q5) · zona del navegador · las reglas de horario deben dar lo mismo en cualquier dispositivo.
- **Cita pendiente que no se confirma en 15 min se cancela sola** (Q22–Q23, decisión mía) · dejarla pendiente · la agenda no se llena de citas fantasma. Se hace con `pg_cron` cada minuto.
- **El cliente cancela hasta 1 h antes** (Q16/Q25, decisión mía) · hasta la hora de la cita · el taller necesita tiempo para reacomodar.
- **El cliente no edita el kilometraje** (Q8) · editarlo libremente · un km inflado bloquearía la creación de la orden.

### Seguridad
- **Las reglas importantes viven en la base de datos** (RLS + permisos por columna + funciones RPC) · validar solo en React · cualquiera puede llamar a la API de Supabase directamente desde el navegador.
- **Cuentas desactivadas bloqueadas al instante** (`mi_rol()` devuelve null) (Q3) · revisar solo al iniciar sesión · un empleado desactivado podía seguir usando su token.
- **Contraseña mínima de 8** (Q27, decisión mía).
- **Endurecimiento** (Q52): cabeceras CSP/HSTS/anti-clickjacking en Vercel y límites de formato y longitud en la BD.
- **Sin credenciales en el repositorio**: revisión automática de credenciales; la contraseña de demo que se filtró se **cambió**, así que la que quedó en el historial ya no sirve.

### Tecnología y diseño
- **React + Vite + Tailwind + Supabase**, sin librerías de UI ni Redux · más dependencias · el MVP no lo necesita.
- **Dirección visual «Manual de servicio»** elegida entre 4 propuestas (Q28): el taller como un manual de reparación; avance de la orden en 5 pasos numerados; agenda hora × 3 lugares.
- **Sin rótulo "Bahía"** en la agenda · rotular bahías · las citas no guardan bahía y el rótulo mostraría un dato falso.
- **Recuadros más compactos** (decisión mía tras ver la app) · el tamaño original · se veían exagerados.

### Funcionalidades agregadas durante el día
- **F09 Asignar órdenes** (Q30–Q33): el admin asigna y reasigna; solo el mecánico asignado y el admin avanzan la orden; el cliente ve solo el nombre del mecánico.
- **F10 Inventario** (Q34–Q43): admin y empleados gestionan; las piezas usadas se descuentan de la orden; costo por pieza; stock mínimo con alerta; historial de movimientos; filtros por marca y modelo; catálogo base de 11 marcas con precios aproximados de demostración.
- **F11 Facturación** (Q44–Q50): factura simple imprimible (no CFDI); refacciones + mano de obra + IVA 16 %; solo con la orden entregada; una factura por orden; el cliente no ve costos fuera de su factura.
- **Agenda por día y por mes** (Q51) para admin y empleado.

### Proceso
- **SDD**: las specs son la fuente de verdad; si algo cambia, primero se actualiza la spec.
- **Datos de demo relativos a la fecha** · fechas fijas · la demo funciona el día que se presente (el lunes tiene una hora llena para mostrar la capacidad).

## Domingo 22 de noviembre de 2026

### Funcionalidad
- **Marca y modelo del vehículo desde listas** (F03, decisión mía) · texto libre · el modelo muestra solo los de la marca elegida y se reutiliza el catálogo del inventario (11 marcas); "Otra marca" y "Otro modelo" permiten escribirlo a mano. En la BD sigue siendo texto, así que no se cambió el esquema; al editar, el texto guardado no se altera.
- **Recuperar contraseña por correo** (F01, Q53, decisión mía) · dejarla fuera del MVP · un cliente que olvida su contraseña no tendría cómo entrar. El mensaje es el mismo exista o no el correo (no revela quién tiene cuenta); al guardar la contraseña nueva va directo a su inicio. Por ahora se usa el correo integrado de Supabase; para clientes reales hace falta un SMTP propio.

### Seguridad y documentación
- **Contraseñas de demo fuera de la documentación** · ponerlas en el README · el repositorio es público; se entregan por separado.
- **La configuración local no se sube** (`.env.local`, configuración personal del editor y de herramientas) · subir todo · contiene llaves o datos personales.

### Proceso
- **El documento de metodología se genera a partir de las specs** · editarlo a mano · las specs son la fuente de verdad (SDD) y así no se desfasan.
- **Commits pequeños, cada uno con su archivo en `bitacora/`** · un commit grande al final · que el avance se vea gradual en GitHub y cada paso quede documentado.
