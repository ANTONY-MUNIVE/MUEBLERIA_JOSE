// Consultas a la IA a través del intermediario de Vercel (carpeta proxy-ia/).
// La clave de NVIDIA no está en la app: solo la URL del intermediario (VITE_IA_URL).

const URL_IA = import.meta.env.VITE_IA_URL;

export const iaConfigurada = () => Boolean(URL_IA);

/**
 * @param {{ role: 'system'|'user'|'assistant', content: string }[]} messages
 * @param {{ tarea?: 'chat'|'diagnostico', timeoutMs?: number }} opciones
 * @returns {Promise<string>} texto de la respuesta
 */
export const consultarIA = async (messages, { tarea = 'chat', timeoutMs = 60000 } = {}) => {
  if (!URL_IA) throw new Error('La IA no está configurada: falta VITE_IA_URL en el archivo .env.');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(URL_IA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, tarea }),
      signal: ctrl.signal,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.texto) {
      throw new Error(data.error || (r.status === 429
        ? 'Demasiadas consultas seguidas. Espere un minuto.'
        : 'No se pudo contactar a la IA. Intente de nuevo.'));
    }
    return data.texto;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('La IA tardó demasiado en responder. Intente de nuevo.');
    if (err instanceof TypeError) throw new Error('No hay conexión con el servicio de IA.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
};
