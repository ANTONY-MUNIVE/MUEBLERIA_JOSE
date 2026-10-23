# Intermediario de IA (NVIDIA) — Mueblería Jose

El chatbot de la tienda y el diagnóstico del Dashboard no llaman a NVIDIA directamente desde el
navegador:

- NVIDIA no acepta llamadas directas desde páginas web (bloqueo CORS);
- la clave quedaría visible en el sitio publicado.

Por eso pasan por esta función de Vercel, que guarda la clave como variable secreta.

```
Navegador ──POST /api/ia──▶ Vercel (esta carpeta) ──▶ integrate.api.nvidia.com
```

- **Modelo principal:** `nvidia/nemotron-3.5-lightning-30b-a3b`.
- **Respaldo:** `meta/llama-3.1-8b-instruct`, que se usa si el principal está saturado, tarda o no existe.
- Solo acepta llamadas de los dominios permitidos y como máximo 20 por minuto por IP.
- La respuesta no puede pasar de 800 tokens en el chat ni de 1200 en el diagnóstico.
- A los modelos Nemotron se les desactiva el razonamiento (`chat_template_kwargs.enable_thinking = false`).
  Así responden más rápido y no gastan los tokens «pensando».

## Desplegar (una sola vez)

1. Cree una clave en <https://build.nvidia.com>: inicie sesión → «Get API Key».
   En la página del modelo, el botón «View code» muestra el ID exacto (`model: "..."`).
2. En <https://vercel.com> → **Add New → Project** → importe el repositorio de GitHub.
3. En la configuración del proyecto:
   - **Root Directory:** `proxy-ia`
   - **Framework Preset:** Other (sin comando de build)
4. En **Environment Variables** agregue:
   - `NVIDIA_API_KEY`: su clave de NVIDIA.
   - `MODELO_PRINCIPAL` (opcional): úsela si el ID exacto de «View code» es distinto de
     `nvidia/nemotron-3.5-lightning-30b-a3b`.
   - `MODELO_RESPALDO` (opcional): por defecto `meta/llama-3.1-8b-instruct`.
   - `ORIGENES_PERMITIDOS` (opcional): por defecto
     `https://munive-b3ba5.web.app,https://munive-b3ba5.firebaseapp.com,http://localhost:5173`.
5. Pulse **Deploy**. La URL queda como `https://<proyecto>.vercel.app/api/ia`.
   Vercel publica en producción la rama `main`, donde ya está `proxy-ia/` desde la integración de la v2.

   **Alternativa por terminal** (la que usa el equipo, sin conectar GitHub), desde la carpeta `proxy-ia`:
   ```
   npx vercel login
   npx vercel                                  # en «Code directory» pulse Enter (no escriba ./)
   npx vercel env add NVIDIA_API_KEY production
   npx vercel --prod
   ```
6. En el `.env` de la app (no se sube a GitHub) ponga:
   ```
   VITE_IA_URL=https://<proyecto>.vercel.app/api/ia
   ```
   Luego `npm run build` y `firebase deploy --only hosting`.

Si cambia una variable en Vercel, vuelva a desplegar el proyecto (Deployments → Redeploy).

## Probar

```
curl -X POST https://<proyecto>.vercel.app/api/ia \
  -H "Origin: http://localhost:5173" -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hola, ¿qué muebles venden?"}]}'
```

Responde `{"texto":"...","modelo":"..."}`.

## Errores comunes

| Estado | Mensaje | Qué revisar |
|---|---|---|
| 403 | Origen no permitido | El dominio desde el que llama no está en `ORIGENES_PERMITIDOS` |
| 500 | Falta configurar NVIDIA_API_KEY | Falta la variable en Vercel (y volver a desplegar) |
| 502 | NVIDIA rechazó la clave | La clave está mal copiada o vencida |
| 503 | La IA está saturada | Los dos modelos fallaron: plan gratuito saturado o un ID de modelo incorrecto (vea los logs en Vercel) |

## Privacidad

El plan gratuito de NVIDIA registra lo que se envía y puede usarlo para mejorar sus modelos. No envíe
datos personales de clientes: DNI, celulares ni direcciones.
