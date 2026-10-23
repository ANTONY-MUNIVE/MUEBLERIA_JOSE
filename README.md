# Mueblería Jose — gestión de ventas e inventario

Aplicación web de la tesis «Implementación de una aplicación web para optimizar la gestión de ventas
en la mueblería JOSE S.A. - 2026» (Universidad Continental, Huancayo).

- **Versión:** 2.1.2 (ver [CHANGELOG.md](CHANGELOG.md)).
- **Sitio publicado:** <https://munive-b3ba5.web.app>
- **Autores:** Galvez Siuce, Alexander; Munive Rios, Antony; Soto Escobar, Giancarlo.

La aplicación tiene dos partes:

| Parte | Para quién | Qué hace |
|---|---|---|
| **Tienda** (`/`) | Clientes | Catálogo con búsqueda y filtros, detalle con muebles similares, carrito, contacto con mapa, asistente con IA. |
| **Panel** (`/admin`) | Dueña y encargados | Ventas en tienda en 3 pasos, consulta de disponibilidad, inventario con kárdex, pedidos a medida, reportes, productos, roles y contenido de la web. |

## Funciones principales del panel

- **Ventas en tienda:** formulario en 3 pasos (cliente → muebles → pago), pago en efectivo o Yape
  (con captura comprimida), descuento de stock en una transacción, nota de venta en PDF, corrección y
  anulación con motivo e historial, marca de entrega.
- **Disponibilidad:** búsqueda por código o nombre con stock, estado y tiempo de respuesta.
- **Inventario:** ingresos, ajustes por conteo físico, kárdex por mueble, alertas de stock mínimo,
  generación de códigos faltantes y exportación del corte (hoja H3).
- **Pedidos a medida:** modelo, medidas, color, adelanto, saldo, pagos del saldo y estados con historial.
- **Reportes:** ventas y stock por semana, mes o rango; PDF y Excel con los datos para la tesis;
  modo medición de tiempos de respuesta.
- **Roles y permisos:** roles con módulos permitidos y asignación de rol al personal.
- **Web:** portada (carrusel), publicaciones, información de la empresa y redes sociales.

## Tecnologías

React 19 · Vite 7 · Tailwind CSS 4 · React Router 7 · Firebase 12 (Authentication, Firestore,
Hosting) · Recharts · jsPDF · SheetJS (xlsx) · Google Maps · función sin servidor en Vercel con
NVIDIA NIM (Nemotron 3.5 Lightning) para el asistente.

## Puesta en marcha rápida

Requisitos: **Node.js 20.19 o superior** (o 22.12+), npm y Git.

```bash
git clone https://github.com/ANTONY-MUNIVE/MUEBLERIA_JOSE.git
cd MUEBLERIA_JOSE
npm ci
cp .env.example .env      # en Windows: copy .env.example .env
# complete .env con los datos de su proyecto de Firebase
npm run dev               # http://localhost:5173
```

Sin el archivo `.env` la aplicación no puede conectarse a Firebase. La guía completa (crear el proyecto
de Firebase, publicar las reglas, crear el primer administrador, desplegar el intermediario de IA y
publicar el sitio) está en **[docs/INSTALACION.md](docs/INSTALACION.md)**.

## Comandos

| Comando | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo en `http://localhost:5173` |
| `npm run build` | Genera la versión de producción en `dist/` |
| `npm run preview` | Revisa `dist/` localmente (no publica) |
| `npm run lint` | Revisión estática con ESLint |
| `firebase deploy --only hosting` | Publica `dist/` en Firebase Hosting |
| `firebase deploy --only firestore:rules` | Publica `firestore.rules` |

## Estructura del proyecto

```
src/
  pages/client/        Tienda: Home, Catalog, ProductDetail, CartPage, Checkout, Contact, Chatbot...
  pages/admin/         Panel: AdminVentas, AdminDisponibilidad, AdminInventario, AdminReportes...
  pages/               Login y Register
  components/client/   Navbar, Footer, ProductCard, ProductModal, MueblesSimilares
  components/admin/    VentaForm (venta en 3 pasos), ProductForm, MotivoModal, VisorCaptura
  services/            ventasService.js (ventas, stock, kárdex, pedidos, métricas) · iaService.js
  utils/               validaciones, PDF, imágenes, fechas, stock, similares, firestoreSeguro
  config/              app.js (versión y constantes) · redes.js (redes sociales)
  hooks/               useMuebles, useInfoEmpresa
  context/             AuthContext (sesión) · CartContext (carrito)
  firebase/config.js   Conexión a Firebase (lee el .env)
proxy-ia/              Intermediario de IA para Vercel (ver su README)
docs/                  Instalación, reglas de Firestore y casos de prueba
firestore.rules        Reglas de seguridad de Firestore
```

## Documentación

| Archivo | Contenido |
|---|---|
| [docs/INSTALACION.md](docs/INSTALACION.md) | Instalación desde cero, configuración, despliegue y problemas frecuentes |
| [CHANGELOG.md](CHANGELOG.md) | Cambios de cada versión |
| [docs/CASOS_DE_PRUEBA.md](docs/CASOS_DE_PRUEBA.md) | Casos CP01–CP25 por requisito y datos para los indicadores |
| [docs/FIRESTORE_REGLAS.md](docs/FIRESTORE_REGLAS.md) | Permisos por colección y cómo publicar las reglas |
| [proxy-ia/README.md](proxy-ia/README.md) | Despliegue y errores del intermediario de IA |
| [CLAUDE.md](CLAUDE.md) | Guía de desarrollo: estructura, diseño y reglas de la tesis que no se deben romper |

## Reglas para quien modifique el código

- Toda operación que cambie el stock pasa por `src/services/ventasService.js` y deja un movimiento en
  el kárdex (`movimientos`). No actualice `muebles.stock` directamente.
- No cambie la medición de T1 en `VentaForm` (`abiertoEn` al abrir y `guardadoEn` al guardar).
- Al cambiar la interfaz, suba `APP_VERSION` en `src/config/app.js`: se guarda en cada venta y métrica.
- Las claves van en `.env` (no se sube). La clave de NVIDIA solo existe en Vercel.
