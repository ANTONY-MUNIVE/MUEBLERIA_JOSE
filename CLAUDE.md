# Mueblería Jose — guía para Claude Code

Aplicación web de la tesis «Implementación de una aplicación web para optimizar la gestión de ventas
en la mueblería JOSE S.A. - 2026» (Universidad Continental, Taller de Investigación II).
Responde en español; todo el texto visible de la app va en español de Perú.

## Stack y comandos

- React 19 + Vite 7 + Tailwind CSS 4 (tema en `src/index.css`, sin `tailwind.config` activo para colores).
- Firebase 12: Firestore y Auth; Storage no se usa (`src/firebase/config.js`, variables en `.env`, que no se sube).
- `npm run dev` (desarrollo), `npm run build`, `npx eslint src`.
- Hosting: Firebase Hosting (`firebase deploy --only hosting`, sirve `dist/`).

## Estructura

- `src/pages/client/*`: tienda pública. `src/pages/admin/*`: panel del personal.
- `src/services/ventasService.js`: transacciones de venta, corrección, anulación, inventario,
  muebles, pedidos personalizados y medición. Toda escritura que cambie el stock pasa por aquí y deja
  un documento en `movimientos` (kárdex). **No actualice `muebles.stock` directamente.**
- `src/utils/validaciones.js`: validaciones puras (`validarVenta`, `validarMueble`, ...).
- `src/utils/firestoreSeguro.js`: `leerVarias()` lee varias colecciones sin que un error tumbe a las demás.
- `src/config/redes.js`: redes sociales (CRUD en Admin › Info de la empresa, guardadas en `content/about.redes`).
- `src/utils/similares.js` + `components/client/MueblesSimilares.jsx`: «muebles similares» en el detalle y el modal.
- IA (chatbot y diagnóstico del Dashboard): `src/services/iaService.js` llama a `VITE_IA_URL`, un intermediario en Vercel (`proxy-ia/`, ver su README) que guarda `NVIDIA_API_KEY` y usa Nemotron 3.5 Lightning con Llama 3.1 8B de respaldo. Nunca ponga claves de IA en el frontend.
- `src/config/app.js`: `APP_VERSION` (se guarda en cada venta y métrica; súbala al cambiar la interfaz).

## Diseño

- Paleta: espresso `#241A14`, hueso `#F6F2EC`, terracota `#D9825B`; tokens `bg-espresso`, `text-cafe`,
  `bg-terracota`, `border-linea`, etc. en `src/index.css`. Las escalas gray/orange/blue están
  redefinidas a esa paleta.
- Títulos: `font-display` (Fraunces); texto: Nunito Sans (paquetes `@fontsource`).
- Tarjetas `rounded-3xl`, botones `rounded-full`, alto mínimo de 44 px en controles.
- Animaciones disponibles: `animate-fade-in-up`, `animate-paso-adelante`, `animate-aparecer`, etc.
  Se respetan las preferencias de «reducir movimiento».

## Reglas de la tesis (no romper)

- Requisitos RF01–RF25: `docs/CASOS_DE_PRUEBA.md` (casos CP01–CP25).
- T1 (tiempo de venta): `VentaForm` guarda `abiertoEn` al montar y `guardadoEn` al guardar.
  No cambie esa medición.
- Lo público que no es catálogo ni disponibilidad (carrito, chatbot, publicaciones, contacto, la
  franja de muebles a medida) está **fuera del alcance de la medición**. No agregue requisitos
  nuevos (por ejemplo, un formulario público de pedidos) sin avisar: obligaría a cambiar la
  Tabla 23 y a validar de nuevo con los jueces.

## Git

- Trabajo actual: rama `feature/tesis-ventas-inventario` (PR #1 hacia `main`).
- **No toque** las ramas `respaldo/main-v1-antes-del-merge` ni `respaldo/v2.0.0-antes-del-rediseno`.

## Pendientes conocidos

- Reglas en `firestore.rules` (versión compatible: reglas originales + `esPersonal()` para la v2; se publican con `firebase deploy --only firestore:rules`). No se usa Storage (plan Spark): la captura de Yape se comprime con `src/utils/imagenes.js` y va en `capturasYape/{ventaId}` dentro de la transacción de la venta. Explicación en `docs/FIRESTORE_REGLAS.md`. Los roles se guardan con el nombre como ID (`roles/{nombre}`).
- Los muebles antiguos no tienen código: Inventario → «Generar códigos faltantes».
- La importación desde Excel no revisa códigos duplicados.
- Hay 4 errores de ESLint anteriores a la v2 (AuthContext, CartContext, AdminCategories, AdminPublications).
