# Registro de cambios

Formato: versión, fecha, cambios agrupados. La versión vigente aparece en el menú del panel y se guarda
en cada venta, movimiento de inventario y métrica (`APP_VERSION` en `src/config/app.js`). Los RF son los
requisitos de la Tabla 23 de la tesis; los casos de prueba están en `docs/CASOS_DE_PRUEBA.md`.

## [2.1.2] — 2026-10-23

### Seguridad y configuración
- Las claves salen del código: Firebase, Google Maps y la URL del intermediario de IA se leen del `.env`.
  Se agrega `.env.example`; `.gitignore` ignora `.env`, `.env.*` y `.vercel`.
- Se quita la consulta a RENIEC (APIsPerú) del registro: el DNI se escribe a mano (8 dígitos) y el
  nombre es siempre editable.
- Se retiran la dependencia `@google/generative-ai` y la inicialización de Firebase Storage, que ya no se
  usaban.

### Asistente de IA
- Nuevo intermediario `proxy-ia/` (función sin servidor en Vercel) que guarda `NVIDIA_API_KEY` y llama a
  NVIDIA NIM. Modelo principal `nvidia/nemotron-3.5-lightning-30b-a3b` sin razonamiento
  (`enable_thinking: false`); respaldo `meta/llama-3.1-8b-instruct`. Solo dominios permitidos,
  20 consultas por minuto por IP y límite de tokens por tarea.
- `src/services/iaService.js` (`consultarIA`) reemplaza a OpenRouter y Gemini en el chatbot y en el
  diagnóstico del Dashboard.
- Chatbot rediseñado: ventana adaptable, sugerencias, «escribiendo», reinicio, cierre con Escape y
  errores visibles con «Reintentar».

### Tienda
- El modal del catálogo se dibuja sobre la cabecera y oculta las barras de desplazamiento.

### Documentación
- `README.md`, `CHANGELOG.md` y `docs/INSTALACION.md` (instalación desde cero, despliegue y problemas
  frecuentes); `proxy-ia/README.md`.

## [2.1.1] — 2026-10-22

### Ventas
- La captura de Yape se comprime en el navegador (JPEG, máximo 1400 px, menos de 400 KB) y se guarda en
  `capturasYape/{ventaId}` dentro de la transacción de la venta, sin Firebase Storage (plan Spark).
- Visor de la captura; al corregir una venta se conserva la captura anterior si no se adjunta otra.
- Corrección: `corregirVenta` usaba el pago antes de calcularlo.

### Contenido y tienda
- Info de la empresa: secciones en modo lectura con botón Editar; redes sociales como CRUD (agregar,
  editar, ocultar, ordenar y eliminar) en `content/about.redes`.
- Catálogo completo (los agotados al final), interruptor «Solo disponibles en tienda» y búsqueda por
  nombre, código o color sin importar tildes.
- Detalle del producto con ficha, stock real, consulta por WhatsApp y «Muebles similares»; el modal
  muestra «También te puede gustar».

### Firestore
- Reglas versionadas en `firestore.rules` (versión compatible): reglas originales más `esPersonal()`
  para las colecciones nuevas; nadie puede cambiarse su propio rol; `movimientos` y `metricas` solo
  admiten creación; `capturasYape` solo para el personal y menor de 1 MB.
- Los roles se guardan con el nombre como ID (`roles/{nombre}`); los roles antiguos se migran al abrir
  Roles y permisos.
- Ventas y Reportes leen cada colección por separado (`leerVarias`) y explican qué falló.
- El panel muestra el error de permisos en lugar del 404 falso; el 404 queda para el rol `cliente`.
- `firebase.json` indica el sitio de Hosting.

## [2.1.0] — 2026-10-22

### Diseño
- Logo nuevo «Mueblería Jose», favicon e ícono.
- Paleta espresso, hueso y terracota; Fraunces para títulos y Nunito Sans para el texto.
- Tienda: cabecera oscura con menú móvil, carrusel con barra de progreso, «Recién agregados», franja
  informativa de muebles a medida, novedades y pie con los datos de la empresa.
- Panel: menú lateral oscuro por secciones y menú deslizable en celular.
- Accesibilidad: controles de 44 px, foco visible, enlace para saltar al contenido y respeto a «reducir
  movimiento».

### Ventas
- Formulario de venta en 3 pasos (Cliente → Muebles → Pago) con validación por paso, búsqueda de muebles
  con Enter, cantidades con botones, resumen y botón «Exacto». La medición de T1 no cambia.

## [2.0.0] — 2026-10-22

Requisitos de la Tabla 23 que estaban parciales o por desarrollar:

- **Ventas en tienda (RF13–RF19):** campos obligatorios, validación, varios muebles por venta, pago en
  efectivo o Yape con boleta, descuento de stock en una transacción, corrección y anulación con motivo e
  historial, nota de venta en PDF y correlativo `V-00001`.
- **Muebles (RF07, RF08):** código único, color, medidas, unidad (pieza o juego) y stock mínimo; el
  stock solo cambia mediante movimientos.
- **Disponibilidad (RF12):** consulta por código o nombre con estado y tiempo de respuesta.
- **Pedidos personalizados (RF20, RF21):** adelanto, saldo, pagos y estados con historial.
- **Inventario (RF22–RF24):** ingresos, ajustes por conteo físico, kárdex por mueble y alertas de stock
  mínimo.
- **Personal (RF04) y reportes (RF25):** lista del personal, reportes semanales y mensuales en PDF y
  exportación a Excel (Ventas, Detalle, Movimientos, Stock actual y Métricas).
- **Medición:** modo medición de tiempos de respuesta (ED1) y duración del formulario de venta (apoyo a T1).
- `docs/CASOS_DE_PRUEBA.md` con los casos CP01–CP25.

## [1.0.0] — 2026 (versión académica previa)

Commit `4aa4ab5` de `main`, descrito en el expediente técnico 1.1: tienda con catálogo, carrito y
pedidos en línea; panel con productos, categorías, pedidos, dashboard, publicaciones, mensajes y roles.
