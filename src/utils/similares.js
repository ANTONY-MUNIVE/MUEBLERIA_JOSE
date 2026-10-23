// Recomendación de «muebles similares» para la tienda (fuera del alcance de la medición).

export const normalizarTexto = (t) => String(t || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

const palabras = (t) => new Set(normalizarTexto(t).split(/[^a-z0-9ñ]+/).filter((p) => p.length > 3));

/** ¿Hay unidades en tienda? Los muebles antiguos sin campo stock se tratan como disponibles. */
export const hayStock = (m) => m.stock === undefined || m.stock === null || m.stock === '' || Number(m.stock) > 0;

/**
 * Ordena los demás muebles por parecido con `base`:
 * misma subcategoría > misma categoría > palabras del nombre en común > precio cercano.
 */
export const mueblesSimilares = (base, todos, cantidad = 8) => {
  if (!base) return [];
  const cat = normalizarTexto(base.categoria);
  const sub = normalizarTexto(base.subcategoria);
  const nombre = palabras(base.nombre);
  const precio = Number(base.precio) || 0;

  return todos
    .filter((m) => m.id !== base.id)
    .map((m) => {
      let puntos = 0;
      if (sub && normalizarTexto(m.subcategoria) === sub) puntos += 6;
      if (cat && normalizarTexto(m.categoria) === cat) puntos += 4;
      const comunes = [...palabras(m.nombre)].filter((p) => nombre.has(p)).length;
      puntos += Math.min(comunes, 2) * 2;
      const p = Number(m.precio) || 0;
      if (precio && p && Math.abs(p - precio) / precio <= 0.35) puntos += 1;
      if (hayStock(m)) puntos += 0.5;
      return { m, puntos, distancia: precio && p ? Math.abs(p - precio) : Infinity };
    })
    .filter((x) => x.puntos >= 1.5)
    .sort((a, b) => b.puntos - a.puntos || a.distancia - b.distancia)
    .slice(0, cantidad)
    .map((x) => x.m);
};
