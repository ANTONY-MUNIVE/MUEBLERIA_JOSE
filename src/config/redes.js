// Redes sociales que se pueden agregar desde Admin › Info de la empresa.
// Se guardan en content/about.redes como [{ id, red, url, activa }].

export const TIPOS_RED = [
  { id: 'facebook', label: 'Facebook', icono: 'fab fa-facebook-f', ejemplo: 'https://facebook.com/muebleriajose' },
  { id: 'instagram', label: 'Instagram', icono: 'fab fa-instagram', ejemplo: 'https://instagram.com/muebleriajose' },
  { id: 'tiktok', label: 'TikTok', icono: 'fab fa-tiktok', ejemplo: 'https://tiktok.com/@muebleriajose' },
  { id: 'whatsapp', label: 'WhatsApp', icono: 'fab fa-whatsapp', ejemplo: '987 654 321 o https://wa.me/51987654321' },
  { id: 'youtube', label: 'YouTube', icono: 'fab fa-youtube', ejemplo: 'https://youtube.com/@muebleriajose' },
  { id: 'x', label: 'X (Twitter)', icono: 'fab fa-twitter', ejemplo: 'https://x.com/muebleriajose' },
  { id: 'linkedin', label: 'LinkedIn', icono: 'fab fa-linkedin-in', ejemplo: 'https://linkedin.com/company/muebleriajose' },
  { id: 'web', label: 'Sitio web', icono: 'fas fa-globe', ejemplo: 'https://muebleriajose.pe' },
  { id: 'otra', label: 'Otra', icono: 'fas fa-link', ejemplo: 'https://...' },
];

export const tipoRed = (id) => TIPOS_RED.find((t) => t.id === id) || TIPOS_RED[TIPOS_RED.length - 1];

/**
 * Normaliza y valida el enlace. Para WhatsApp acepta un número (9 dígitos → Perú).
 * @returns {{ url?: string, error?: string }}
 */
export const normalizarEnlaceRed = (red, valor) => {
  const v = String(valor || '').trim();
  if (!v) return { error: 'Escriba el enlace.' };
  if (red === 'whatsapp' && /^[+\d\s()-]+$/.test(v)) {
    let num = v.replace(/\D/g, '');
    if (num.length === 9) num = `51${num}`;
    if (num.length < 10 || num.length > 15) return { error: 'Escriba un número de 9 dígitos o el enlace wa.me.' };
    return { url: `https://wa.me/${num}` };
  }
  const conProtocolo = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(conProtocolo);
    if (!u.hostname.includes('.')) return { error: 'El enlace no parece válido.' };
    return { url: u.toString() };
  } catch {
    return { error: 'El enlace no parece válido.' };
  }
};

/** Redes visibles en la web: las activas guardadas; si no hay ninguna, las antiguas (facebook/instagram/teléfono). */
export const redesVisibles = (info = {}) => {
  if (Array.isArray(info.redes) && info.redes.length) return info.redes.filter((r) => r.activa !== false && r.url);
  const antiguas = [];
  if (info.facebook) antiguas.push({ id: 'facebook', red: 'facebook', url: info.facebook });
  if (info.instagram) antiguas.push({ id: 'instagram', red: 'instagram', url: info.instagram });
  if (info.telefono) {
    const r = normalizarEnlaceRed('whatsapp', info.telefono);
    if (r.url) antiguas.push({ id: 'whatsapp', red: 'whatsapp', url: r.url });
  }
  return antiguas;
};
