# Instalación, configuración y despliegue

Esta guía permite ejecutar la aplicación desde un clon nuevo del repositorio, ya sea con el proyecto de
Firebase del equipo o con un proyecto propio. Versión de referencia: **2.1.2**.

## 1. Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| Node.js | 20.19 o superior, o 22.12 o superior (lo exige Vite 7) | Instalar y compilar |
| npm | La que trae Node.js | Dependencias |
| Git | Cualquiera reciente | Clonar el repositorio |
| Firebase CLI | `npm install -g firebase-tools` | Publicar reglas y el sitio |
| Cuenta de Google | — | Firebase |
| Vercel y NVIDIA (opcional) | Cuenta gratuita | Asistente de IA y diagnóstico del Dashboard |
| Google Maps (opcional) | Clave de navegador | Mapa de Contacto y botón de dirección |

Compruebe la versión con `node -v`. Si Vite muestra un error de versión, actualice Node.js.

## 2. Clonar e instalar

```bash
git clone https://github.com/ANTONY-MUNIVE/MUEBLERIA_JOSE.git
cd MUEBLERIA_JOSE
npm ci                    # instala exactamente lo de package-lock.json
cp .env.example .env      # Windows (cmd): copy .env.example .env
```

Use `npm ci` y no `npm install`, para obtener las mismas versiones que el equipo.

## 3. Proyecto de Firebase

### Opción A: usar el proyecto del equipo (munive-b3ba5)

Pida a un integrante los valores del `.env` y que lo agregue como colaborador en la consola de Firebase
(Configuración del proyecto → Usuarios y permisos) si va a publicar. Luego pase al paso 4.

### Opción B: crear un proyecto propio (pruebas aisladas)

1. En <https://console.firebase.google.com> → **Agregar proyecto**. El plan gratuito **Spark** basta:
   la aplicación no usa Storage ni Cloud Functions.
2. **Authentication → Comenzar → Correo electrónico/contraseña → Habilitar.**
3. **Firestore Database → Crear base de datos** (modo producción; la región no se puede cambiar después).
4. **Configuración del proyecto → Tus apps → Web (`</>`)** → registre la app y copie los valores de
   `firebaseConfig` al `.env` (paso 4).
5. En la terminal, dentro del proyecto:
   ```bash
   firebase login
   firebase use --add          # elija su proyecto; actualiza .firebaserc
   ```
6. En `firebase.json`, cambie `"site": "munive-b3ba5"` por el ID de su sitio de Hosting (por defecto,
   el ID del proyecto).
7. Publique las reglas de seguridad:
   ```bash
   firebase deploy --only firestore:rules
   ```
   Sin este paso, el panel muestra «No se pudieron verificar tus permisos».

No se necesitan índices compuestos: las consultas usan un solo campo.

## 4. Variables de entorno (`.env`)

| Variable | Obligatoria | Dónde se obtiene |
|---|---|---|
| `VITE_API_KEY` | Sí | Firebase → Configuración del proyecto → Tus apps → `apiKey` |
| `VITE_AUTH_DOMAIN` | Sí | `authDomain` |
| `VITE_PROJECT_ID` | Sí | `projectId` |
| `VITE_STORAGE_BUCKET` | Sí (lo pide la configuración de Firebase, aunque Storage no se usa) | `storageBucket` |
| `VITE_MESSAGING_SENDER_ID` | Sí | `messagingSenderId` |
| `VITE_APP_ID` | Sí | `appId` |
| `VITE_IA_URL` | No | URL del intermediario de IA en Vercel, terminada en `/api/ia` (paso 8) |
| `VITE_GOOGLE_MAPS_KEY` | No | Google Cloud Console (paso 9) |

- El `.env` **nunca** se sube a GitHub (está en `.gitignore`).
- Vite lee el `.env` al arrancar: después de editarlo, detenga `npm run dev` y vuelva a ejecutarlo.
- Las variables `VITE_*` terminan dentro del sitio publicado. Por eso solo van ahí claves pensadas para
  el navegador (Firebase web y Google Maps restringida). La clave de NVIDIA va solo en Vercel.

## 5. Ejecutar en local

```bash
npm run dev
```

Abra <http://localhost:5173>. La tienda funciona sin sesión; el panel está en `/admin`.

## 6. Primer administrador

Las reglas impiden que un usuario se cambie su propio rol, así que el primer administrador se asigna
desde la consola:

1. En la app, **Registrarse** (`/register`) con nombre, DNI de 8 dígitos, correo y contraseña. La cuenta
   se crea con el rol `cliente`.
2. En la consola de Firebase → **Firestore → users → (documento con su UID)** → cambie el campo `role`
   de `cliente` a `admin`.
3. Cierre sesión en la app y vuelva a entrar. Ya puede abrir `/admin`.

## 7. Personal, roles y datos iniciales

1. **Roles y permisos:** cree un rol (por ejemplo, `encargado`) y marque sus módulos (Ventas,
   Disponibilidad, Inventario…). Los roles se guardan con el nombre como ID (`roles/{nombre}`).
2. Cada trabajador se registra en `/register`; luego, en **Roles y permisos → Asignar rol a empleado**,
   busque su correo y asígnele el rol. El trabajador cierra sesión y vuelve a entrar.
3. **Categorías:** cree las categorías y subcategorías.
4. **Productos:** registre cada mueble con código único, color, medidas, unidad (pieza o juego), precio,
   stock inicial y stock mínimo. El stock inicial queda como ingreso en el kárdex.
   - Para cargar muchos, use **Exportar Excel** para obtener la plantilla y luego **Importar Excel**.
     Columnas: `codigo`, `nombre`, `categoria`, `subcategoria`, `precio`, `stock`, `stockMinimo`,
     `unidad`, `color`, `medidas`, `imagen`, `descripcion`. La importación no revisa códigos duplicados.
   - Los muebles antiguos sin código: **Inventario → Generar códigos faltantes**.
5. **Info de la empresa:** dirección, coordenadas, teléfono/WhatsApp, horario, historia y redes sociales.
6. **Portada y Publicaciones:** carrusel de la página de inicio y novedades.

## 8. Intermediario de IA en Vercel (opcional)

Sin él, la tienda funciona igual y el asistente muestra «No disponible por ahora». Pasos resumidos
(detalle en [proxy-ia/README.md](../proxy-ia/README.md)):

1. Cree una clave en <https://build.nvidia.com> («Get API Key»).
2. Desde la carpeta `proxy-ia`:
   ```bash
   npx vercel login
   npx vercel                              # crea o vincula el proyecto; en «Code directory» pulse Enter
   npx vercel env add NVIDIA_API_KEY production
   npx vercel --prod                       # copie la URL de «Production»
   ```
3. Abra `https://<su-proyecto>.vercel.app/api/ia` en el navegador: debe responder
   `{"error":"Origen no permitido."}` (eso indica que está vivo).
4. En el `.env` de la app: `VITE_IA_URL=https://<su-proyecto>.vercel.app/api/ia`.
5. Si publica la app en otro dominio, agréguelo en Vercel como `ORIGENES_PERMITIDOS`
   (separados por comas) y vuelva a desplegar.

## 9. Google Maps (opcional)

En Google Cloud Console habilite **Maps JavaScript API**, **Directions API** y **Geocoding API**, cree una
clave y **restrínjala** por referente HTTP a sus dominios (por ejemplo, `https://munive-b3ba5.web.app/*`
y `http://localhost:5173/*`). Póngala en `VITE_GOOGLE_MAPS_KEY`. Sin clave, Contacto muestra un aviso en
lugar del mapa.

## 10. Publicar

```bash
npm run build
firebase deploy --only hosting
```

Si cambió `firestore.rules`, publíquelas aparte con `firebase deploy --only firestore:rules`.
Antes de una medición de la tesis, anote en la ficha F4 la versión que muestra el menú del panel.

## 11. Actualizar una copia local existente

Después de la integración de la v2 en `main`:

```bash
git checkout main
git pull
npm ci
```

Compare su `.env` con `.env.example`: desde la v2.1.2 se usan `VITE_IA_URL` y `VITE_GOOGLE_MAPS_KEY`, y
`VITE_GEMINI_API_KEY` ya no se usa (puede borrarla).

## 12. Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| Pantalla en blanco o error de Firebase al abrir la app | Falta el `.env` o tiene valores vacíos | Complete el `.env` y reinicie `npm run dev` |
| «No se pudieron verificar tus permisos» (`permission-denied`) | Reglas no publicadas o usuario sin documento en `users` | `firebase deploy --only firestore:rules`; revise el campo `role` |
| `/admin` muestra 404 y regresa a la tienda | El usuario tiene rol `cliente` | Asigne un rol en Roles y permisos (o `admin` desde la consola) |
| Un módulo no aparece en el menú | El rol no tiene ese módulo | Edite el rol en Roles y permisos y vuelva a iniciar sesión |
| `firebase deploy`: «Assertion failed: resolving hosting target» | `firebase.json` sin `hosting.site` o con un sitio de otro proyecto | Ponga el ID de su sitio en `hosting.site` |
| `firebase deploy`: error 401 | Sesión vencida de Firebase CLI | `firebase login --reauth` |
| El asistente dice «No disponible por ahora» | `VITE_IA_URL` vacío | Paso 8 y volver a compilar |
| El asistente muestra un error rojo | El intermediario respondió con error | Vea la tabla de errores de `proxy-ia/README.md` |
| Vercel: «Root Directory must be a relative path not starting with ./» | Se escribió `./` en «Code directory» | Vuelva a ejecutar `npx vercel` y pulse Enter sin escribir nada |
| El mapa no aparece | Falta la clave, la API no está habilitada o la restricción no incluye el dominio | Paso 9 |
| La venta dice «Stock insuficiente» | Otro usuario vendió antes o el stock real es menor | Revise el kárdex del mueble en Inventario |
| Vite: «You are using Node.js X. Vite requires…» | Node.js antiguo | Instale Node.js 22 LTS |
