# Bitácora de IA

## 1. Herramientas y forma de trabajo

- **Herramienta:** Claude Code (CLI) con el modelo Claude Opus como "líder" del proyecto y agentes con Claude Sonnet para escribir código y documentos.
- **Reparto de roles que definí:**
  - **Yo:** decido qué se construye (todas las decisiones Q1–Q52), configuro Supabase y Vercel, corro el SQL en Supabase, pruebo en el navegador y reviso.
  - **IA líder (Opus):** me hace preguntas antes de construir, revisa calidad y seguridad de todo lo que escriben los agentes y me reporta.
  - **Agentes (Sonnet):** escriben el código, el SQL y las specs a partir de un "contrato" escrito.
- **Método:** SDD (Spec-Driven Development). Primero la spec, luego el SQL, luego las pantallas, luego las pruebas. Si algo cambia, se actualiza la spec.
- **Skills usadas:** `grilling` (me entrevistó para cerrar huecos de las specs) e `impeccable` (diseño de la interfaz).

## 2. Reglas que le puse a la IA

1. Decisiones de producto las tomo yo: la IA propone con una recomendación y yo acepto, cambio o rechazo.
2. El líder revisa todo lo que hacen los agentes antes de darlo por bueno.
3. Todo en español.
4. **El repositorio no puede tener credenciales** (contraseñas, llaves, URL del proyecto).
5. **Commits pequeños y documentados:** un commit por cada unidad de trabajo, cada uno con su archivo en `bitacora/` (qué se hizo, archivos, decisiones y siguiente paso), para que el avance se vea gradual en GitHub.

## 3. Etapas

### Sábado 21 de noviembre de 2026

| Etapa | Qué pedí | Qué hizo la IA | Cómo lo verifiqué |
|---|---|---|---|
| Análisis | "Con toda la documentación y requerimientos, analiza el proyecto" | Me hizo 26 preguntas en rondas (Q1–Q26) con una recomendación en cada una | Acepté la mayoría y cambié Q14 y Q16 (ver §5) |
| Specs | Aplicar las decisiones a `specs/` | Un agente actualizó todas las specs; el líder encontró 3 huecos de seguridad y los corrigió | Revisión del líder (§4) |
| SQL | Tablas, reglas y seguridad | Agentes escribieron `schema`, `functions`, `policies`, `seed` y `tests` | Corrí todo en el SQL Editor de Supabase; `tests.sql` pasó |
| Pantallas F01–F08 | Construir las features | Agentes en paralelo; el líder revisó cada entrega | QA automático contra la BD real: 41/41 pasos |
| Diseño | Usar la skill Impeccable | Me presentó 4 direcciones visuales con boceto; elegí «Manual de servicio» | Capturas en escritorio y celular + revisor de diseño (veredicto "ship" tras 2 rondas de correcciones) |
| F09 | Que el admin cree empleados y asigne trabajos | Preguntas de diseño, contrato BD↔frontend, 2 agentes | `tests.sql` grupo 15 + capturas |
| F10 | Inventario de piezas por marca | Preguntas, contrato, catálogo de 76 piezas, filtros por marca/modelo | `tests.sql` grupo 16 + capturas |
| F11 | Factura al terminar el servicio | Preguntas (CFDI vs factura simple), contrato, 2 agentes | `tests.sql` grupo 17 + captura de la factura |
| Agenda por mes y tamaños | Vista por mes; recuadros menos grandes | Calendario mensual y ajuste de densidad | Capturas |
| Seguridad | "Revisa que no puedan hacer XSS ni interceptar información" | Auditoría + cabeceras de seguridad (CSP, HSTS) + restricciones en la BD | `npm audit` 0 vulnerabilidades, `tests.sql` grupo 18 |

### Domingo 22 de noviembre de 2026

| Etapa | Qué pedí | Qué hizo la IA | Cómo lo verifiqué |
|---|---|---|---|
| Specs al día | Actualizar las specs con F09–F11 y la seguridad | Specs nuevas F09–F11 y registro de cambios Q1–Q52 en el plan de trabajo | Revisión del líder contra el código y el SQL |
| Documentación | Documentos para instalar, ubicar y probar el proyecto | `README.md`, `GUIA_DEL_PROYECTO.md`, `CASOS_LIMITE.md` y `CLAUDE.md` (contexto para la IA) | Revisé que no tuvieran contraseñas, llaves ni la URL de Supabase |
| Herramientas y diseño | Dejar en el repo la skill usada y el sistema de diseño al día | Skill `grilling` en el repo, `DESIGN.md` con los tamaños compactos y componentes nuevos, `.gitignore` para archivos locales | Revisé que la configuración local y `.env.local` no se subieran |
| Metodología | Regenerar el documento de metodología SDD | Lo armó a partir de las specs actuales (portada, índice y 16 secciones) | Revisé la portada con el escudo y que las tablas estuvieran completas |
| Marca y modelo del vehículo | Que al registrar un carro salgan listas de marcas y de modelos de esa marca, con opción "Otros" para escribirlo a mano | Reutilizó el catálogo de marcas del inventario; listas de marca y modelo con "Otra marca" y "Otro modelo"; actualizó la spec F03 | Lo probé en el navegador como cliente; `npm run build` y `npm run lint` sin errores |
| Recuperar contraseña | Que se pueda recuperar la contraseña si se olvida (estaba fuera del MVP) | Me preguntó qué pasa al terminar y cómo enviar el correo; escribió primero la spec (Q53) y luego las pantallas `/recuperar` y `/restablecer` con Supabase Auth, sin cambios en la BD | Configuré las *Redirect URLs* en Supabase y lo probé con mi correo: llegó el enlace, cambié la contraseña y entré con la nueva |

## 4. Errores de la IA y cómo nos dimos cuenta

| Error | Cómo se detectó | Corrección |
|---|---|---|
| El primer plan de seguridad solo quitaba permisos al rol `authenticated`; olvidaba que Supabase le da permiso total también al rol `anon` (usuarios sin sesión) | Revisión del líder a la spec del modelo de datos | Se revocan permisos a `anon` y `authenticated`, y se otorga solo lo mínimo |
| RLS filtra filas, no columnas: con la política original un cliente podía cambiarse el rol a `admin` | Pregunta Q2 del análisis | Permisos por columna + funciones RPC para todo cambio de estado |
| `mi_rol()` sin `SECURITY DEFINER` habría causado recursión infinita en las políticas de `perfiles` | Revisión del líder | Se declaró `SECURITY DEFINER` |
| Una prueba esperaba "permission denied" al editar el diagnóstico como cliente, pero la BD (correctamente) devolvía 0 filas | Falló `tests.sql` al correrlo en Supabase | Se corrigió la prueba, no la seguridad |
| Pruebas que dependían del estado de los datos (una cita activa del seed, una orden ya avanzada) | Fallaron al correr `tests.sql` | Cada grupo de pruebas crea sus propios datos dentro de la transacción |
| Un agente **borró el escudo de la UABC** de `specs/img` sin que se le pidiera | Al regenerar el documento de metodología, la imagen no existía | Lo repuse yo; desde entonces el líder revisa archivos borrados |
| La contraseña de demo quedó escrita en el `seed.sql` del repositorio público | Pedí revisar que no hubiera credenciales en el repositorio | Se quitó de todos los archivos, se agregó una revisión automática de credenciales y **cambié la contraseña** de las cuentas demo, porque borrarla del historial no basta: la que se filtró ya no sirve. |
| El archivo temporal para tomar capturas contenía la contraseña y estaba en `public/`, que el build copia al sitio | Lo señaló el agente de seguridad | Se borró |
| El filtro de inventario "CX-3" también encontraba piezas del "CX-30" | Revisión del agente al construir el filtro | Término de búsqueda más específico |
| En el diseño, el revisor encontró detalles que rompían las reglas de calidad (fecha como "eyebrow" sobre el título, barras de color en un solo lado, tarjetas estiradas) | Revisión con capturas | 2 rondas de correcciones |
| Al inicio de la app la sesión se cerraba si fallaba la red al cargar el perfil | Revisión de código del líder | Ahora muestra "Reintentar" sin cerrar la sesión |

## 5. Propuestas de la IA que rechacé o cambié

| Propuesta de la IA | Lo que decidí | Por qué |
|---|---|---|
| Q14: la orden se crea desde una cita pendiente o confirmada de hoy | **Si en 15 min no se confirma, la cita se cancela sola** | Así la agenda no se llena de citas fantasma |
| Q16: el cliente puede cancelar hasta la hora de la cita | **Hasta 1 hora antes** | El taller necesita tiempo para reacomodar |
| Mantener la contraseña mínima de Supabase (6) | **Mínimo 8** | Más segura |
| Rotular la agenda como "Bahía 1/2/3" (lo sugirió el revisor de diseño) | **Rechazado**: se rotula "3 lugares por hora" | Las citas no guardan qué bahía usan; el rótulo mostraría un dato falso |
| Inventario: solo el admin lo gestiona | **Admin y empleados** gestionan todo | En un taller chico todos reciben piezas |
| Inventario sin precios | **Con costo por pieza** | Lo necesito para la factura |
| Factura CFDI timbrada | **Factura simple imprimible** (con leyenda "no es un CFDI") | Un CFDI real requiere contratar un PAC; no es viable para la entrega |

## 6. Qué aprendí usando la IA

- La IA es rápida escribiendo, pero **se equivoca en supuestos** (qué datos existen, en qué estado quedan las pruebas, qué permisos da Supabase por defecto). Las pruebas contra la base real fueron las que encontraron esos errores.
- Pedirle que **pregunte antes de construir** evitó rehacer trabajo.
- Hay que **revisar lo que borra**, no solo lo que agrega.
- Las reglas importantes van en la base de datos, no solo en la pantalla: la IA tendía a validar solo en el formulario.
- Hacer un cuestrionario con la herramienta grilling que es una skill que me pidio como queria el proyecto, el me dio unas preguntas pero yo midifique algunas cosas que no me gustaban
- Tambien usa una skill que se llama impeccable para poder hacer un diseño mas a mi gusto, me dio muchos diseños pero me llamo la atencion ese por que era simple y claro
- Puede ir haciendo todo lo que le parece que quedara mejor pero si debi meterme a ver la decisiones por que muchas veces se quedaba en bucle con ciertas desiciones
- Hacer tests manuales si funcionan demaciado por que encontre algunas cosas que no me parecian correctas y las modifique 