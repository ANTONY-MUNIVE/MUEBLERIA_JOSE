// Intermediario de IA para Mueblería Jose (función serverless de Vercel).
// La clave de NVIDIA vive solo aquí, como variable de entorno; el navegador nunca la ve.
//
// Variables de entorno (Vercel → Project → Settings → Environment Variables):
//   NVIDIA_API_KEY        (obligatoria) clave de build.nvidia.com
//   MODELO_PRINCIPAL      (opcional) por defecto nvidia/nemotron-3.5-lightning-30b-a3b
//   MODELO_RESPALDO       (opcional) por defecto meta/llama-3.1-8b-instruct
//   ORIGENES_PERMITIDOS   (opcional) dominios separados por comas que pueden llamar al intermediario

const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

const ORIGENES_POR_DEFECTO = [
  'https://munive-b3ba5.web.app',
  'https://munive-b3ba5.firebaseapp.com',
  'http://localhost:5173',
];

// Límites por tipo de tarea (el navegador no puede pedir más que esto)
const TAREAS = {
  chat: { max_tokens: 600, temperature: 0.5 },
  diagnostico: { max_tokens: 1000, temperature: 0.3 },
};

const MAX_MENSAJES = 24;
const MAX_CARACTERES = 150000; // el chatbot envía el catálogo completo
const TIEMPO_POR_MODELO_MS = 25000;
const PETICIONES_POR_MINUTO = 20; // por IP, para que nadie agote el límite gratuito de NVIDIA

const origenesPermitidos = () => (process.env.ORIGENES_PERMITIDOS
  ? process.env.ORIGENES_PERMITIDOS.split(',').map((o) => o.trim()).filter(Boolean)
  : ORIGENES_POR_DEFECTO);

const modelos = () => [
  process.env.MODELO_PRINCIPAL || 'nvidia/nemotron-3.5-lightning-30b-a3b',
  process.env.MODELO_RESPALDO || 'meta/llama-3.1-8b-instruct',
].filter((m, i, a) => m && a.indexOf(m) === i);

// --- Límite simple por IP (en memoria; se reinicia cuando Vercel recicla la función) ---
const visitas = new Map();
const superaLimite = (ip) => {
  const ahora = Date.now();
  const recientes = (visitas.get(ip) || []).filter((t) => ahora - t < 60000);
  recientes.push(ahora);
  visitas.set(ip, recientes);
  if (visitas.size > 5000) visitas.clear();
  return recientes.length > PETICIONES_POR_MINUTO;
};

const validarMensajes = (messages) => {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MENSAJES) {
    return 'La conversación debe tener entre 1 y 24 mensajes.';
  }
  let total = 0;
  for (const m of messages) {
    if (!m || !['system', 'user', 'assistant'].includes(m.role) || typeof m.content !== 'string') {
      return 'Formato de mensaje no válido.';
    }
    total += m.content.length;
  }
  if (total > MAX_CARACTERES) return 'La conversación es demasiado larga.';
  return null;
};

// Algunos modelos devuelven su «razonamiento» entre <think>…</think>: no se muestra al cliente
export const limpiarTexto = (texto) => String(texto || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

const llamarModelo = async (modelo, messages, opciones) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIEMPO_POR_MODELO_MS);
  try {
    const r = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ model: modelo, messages, stream: false, ...opciones }),
      signal: ctrl.signal,
    });
    const data = await r.json().catch(() => ({}));
    return { status: r.status, data };
  } catch (err) {
    return { status: err.name === 'AbortError' ? 504 : 502, data: {} };
  } finally {
    clearTimeout(timer);
  }
};

export default async function handler(req, res) {
  const origen = req.headers.origin || '';
  const permitido = origenesPermitidos().includes(origen);
  if (permitido) {
    res.setHeader('Access-Control-Allow-Origin', origen);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  res.setHeader('Vary', 'Origin');

  if (!permitido) return res.status(403).json({ error: 'Origen no permitido.' });
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  if (!process.env.NVIDIA_API_KEY) return res.status(500).json({ error: 'Falta configurar NVIDIA_API_KEY en Vercel.' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'desconocida';
  if (superaLimite(ip)) return res.status(429).json({ error: 'Demasiadas consultas seguidas. Espere un minuto.' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  const { messages, tarea = 'chat' } = body || {};
  const error = validarMensajes(messages);
  if (error) return res.status(400).json({ error });
  const opciones = TAREAS[tarea] || TAREAS.chat;

  for (const modelo of modelos()) {
    const { status, data } = await llamarModelo(modelo, messages, opciones);
    const texto = limpiarTexto(data?.choices?.[0]?.message?.content);
    if (status === 200 && texto) return res.status(200).json({ texto, modelo });
    if (status === 401 || status === 403) {
      return res.status(502).json({ error: 'NVIDIA rechazó la clave. Revise NVIDIA_API_KEY en Vercel.' });
    }
    // 404 (modelo no existe), 429 (saturado), 5xx o tiempo agotado: se prueba el siguiente modelo
    console.warn(`Modelo ${modelo} falló con estado ${status}`, data?.detail || data?.error || '');
  }
  return res.status(503).json({ error: 'La IA está saturada en este momento. Intente en unos segundos.' });
}
