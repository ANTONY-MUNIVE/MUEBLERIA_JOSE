/**
 * Comprime una imagen en el navegador y la devuelve como data URL (base64) en JPEG.
 * Sirve para guardar la captura de Yape en Firestore sin usar Storage (plan Spark).
 * Firestore acepta como máximo 1 MiB por documento; se apunta a quedar muy por debajo.
 */

const MAX_BYTES_POR_DEFECTO = 400 * 1024; // ~400 KB de texto base64

const cargarImagen = (archivo) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(archivo);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen. Use una foto JPG o PNG.')); };
  img.src = url;
});

const dibujar = (img, maxLado) => {
  const escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // los PNG con transparencia quedan con fondo blanco
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
};

/** Tamaño aproximado en bytes del texto de un data URL. */
export const pesoDataUrl = (dataUrl) => (dataUrl ? dataUrl.length : 0);

/**
 * @param {File} archivo
 * @param {{ maxLado?: number, maxBytes?: number }} opciones
 * @returns {Promise<{ dataUrl: string, ancho: number, alto: number, bytes: number }>}
 */
export const comprimirImagen = async (archivo, { maxLado = 1400, maxBytes = MAX_BYTES_POR_DEFECTO } = {}) => {
  if (!archivo || !String(archivo.type).startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen (captura de pantalla o foto).');
  }
  const img = await cargarImagen(archivo);
  let lado = maxLado;
  for (let intento = 0; intento < 4; intento += 1) {
    const canvas = dibujar(img, lado);
    for (const calidad of [0.72, 0.6, 0.5, 0.4]) {
      const dataUrl = canvas.toDataURL('image/jpeg', calidad);
      if (pesoDataUrl(dataUrl) <= maxBytes) {
        return { dataUrl, ancho: canvas.width, alto: canvas.height, bytes: pesoDataUrl(dataUrl) };
      }
    }
    lado = Math.round(lado * 0.75); // aún pesa mucho: se achica más
  }
  throw new Error('La imagen es demasiado grande incluso comprimida. Tome una captura más pequeña.');
};
