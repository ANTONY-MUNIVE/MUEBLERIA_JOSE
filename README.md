# MUEBLERIA_JOSE

🚀 “Transforma la experiencia de compra y gestión en el mundo del mobiliario”

---

## Descripción general

MUEBLERIA_JOSE es una plataforma web moderna, desarrollada con React y Vite, creada para digitalizar la gestión y venta de una mueblería. Ofrece una experiencia intuitiva tanto para clientes que desean adquirir mobiliario, como para administradores que buscan eficiencia en la gestión de productos, pedidos y métricas de negocio.

---

## Propósito del Proyecto

Facilitar la transformación digital de negocios de muebles, permitiendo:

- A los clientes, descubrir, explorar y comprar muebles de forma ágil y segura.
- A los administradores, controlar el inventario, pedidos, ventas, publicaciones y obtener analíticas inteligentes orientadas al crecimiento comercial.

---

## Funcionalidades Principales

### 👤 Para clientes:

- Navegar por un catálogo visualmente atractivo de muebles, con búsqueda, filtros, categorías y subcategorías dinámicas.
- Visualización detallada de productos con imágenes, descripciones y disponibilidad.
- Carrito de compras con pasos claros y generación automática de comprobante PDF del pedido.
- Área de perfil, historial de pedidos, soporte de ayuda y chatbot inteligente.
- Confirmación de compra y notificaciones intuitivas.

### 🛠️ Para administradores:

- Autenticación y rutas protegidas.
- Dashboard con métricas clave: ventas, usuarios, inventario, pedidos, ingresos y stock crítico.
- Gestión total de productos, pedidos, categorías y publicaciones (ofertas y novedades).
- Alertas automáticas por bajo stock.
- Estadísticas visuales con gráficas interactivas.
- Generación de reportes ejecutivos y PDF en un clic.
- Diagnóstico de negocio mediante inteligencia artificial integrada.

---

## Tecnologías Utilizadas

- **Frontend:** React, Vite, React Router DOM, Context API, TailwindCSS.
- **Backend & Datos:** Firebase Firestore.
- **Autenticación:** Firebase Auth.
- **Estilos:** TailwindCSS, CSS Modules.
- **Gráficas:** Recharts.
- **PDF y reportes:** jsPDF, jsPDF-autotable, html2pdf.js.
- **Inteligencia Artificial:** OpenRouter AI (Google Gemini, Llama 3 integration).
- **Otras libs:** FontAwesome, date-fns, etc.

---

## Estructura del Proyecto

- `/src/pages/client/` — Vistas públicas y funcionalidad de cliente.
- `/src/pages/admin/` — Panel administrativo (protegido, solo admins).
- `/src/components/` — Componentes reutilizables (modales, headers, tablas, etc).
- `/src/context/` — Providers para carrito, autenticación, etc.
- `/src/firebase/` — Configuración e integración con Firestore.
- `/src/layouts/` — Layouts para clientes y administración.
- `/src/utils/` — Helpers y utilidades (formatos, imágenes, etc).

---

## Instalación y Guía de Inicio

### 1. Clonar el repositorio

```bash
git clone https://github.com/ANTONY-MUNIVE/MUEBLERIA_JOSE.git
cd MUEBLERIA_JOSE
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Debes crear un archivo `.env` en la raíz con tus claves de Firebase y OpenRouter AI. Ejemplo:

```env
VITE_API_KEY=tu_firebase_api_key
VITE_AUTH_DOMAIN=xxxx.firebaseapp.com
VITE_PROJECT_ID=xxxx
VITE_STORAGE_BUCKET=xxxx.appspot.com
VITE_MESSAGING_SENDER_ID=xxxx
VITE_APP_ID=xxxx
VITE_MEASUREMENT_ID=xxxx
VITE_GEMINI_API_KEY=tu_api_key_openrouter
```

### 4. Ejecutar el proyecto

```bash
npm run dev
```

La aplicación estará disponible normalmente en http://localhost:5173

---

## Sorpresas y Extras que te encantarán 🚀

- 📊 Dashboard con reportes en PDF para toma de decisiones ejecutivas.
- 🤖 Diagnóstico inteligente para la salud del negocio usando IA en tiempo real.
- 📋 Carrito persistente y experiencia de compra paso a paso con comprobante descargable.
- 🔒 Sistema de roles con rutas protegidas.
- ⚡ Performance premium gracias a Vite y React.
- 🛡️ Integración sólida con Firebase para base de datos y autenticación.
- 🤝 Fácil de extender y adaptar a nuevos requerimientos de negocio.
- ⚙️ Código organizado y fácil de mantener, siguiendo buenas prácticas y arquitectura limpia.

---

## Buenas prácticas

- Mantén tus credenciales y llaves en variables de entorno.
- Antes de hacer PR o deploy, ejecuta linting (`npm run lint`).
- Usa ramas descriptivas: feature/..., fix/..., docs/...
- Haz uso de issues para proponer mejoras o reportar bugs.

---

## ¿Te gustaría contribuir? 🧑‍💻

¡Toda ayuda es bienvenida! Puedes:

1. Revisar los issues abiertos.
2. Proponer nuevas funcionalidades.
3. Mejorar la documentación o la experiencia de usuario.

Por favor, sigue el flujo de GitHub: fork, new branch, pull request.

---

## Autor

Desarrollado con pasión por [Antony Munive](https://github.com/ANTONY-MUNIVE)

---

¿Dudas, sugerencias o quieres saludar? Contáctame por GitHub Issues o directamente a mi correo si lo tienes. ¡Gracias por impulsar la transformación digital del sector muebles!
