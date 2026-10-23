/**
 * Lecturas de Firestore que no se caen juntas: si una colección falla
 * (por ejemplo, por reglas de seguridad), las demás igual se cargan
 * y el mensaje dice cuál falló y por qué.
 */

export const mensajeError = (coleccion, err) => {
  const code = err?.code || '';
  if (code === 'permission-denied' || code === 'firestore/permission-denied') {
    return `Firestore no da permiso para leer «${coleccion}». Actualice las reglas de Firestore (vea docs/FIRESTORE_REGLAS.md).`;
  }
  if (code === 'failed-precondition') {
    return `Falta un índice en «${coleccion}». Abra la consola del navegador (F12): Firebase muestra un enlace para crearlo.`;
  }
  if (code === 'unavailable') return `Sin conexión con Firestore al leer «${coleccion}». Revise el internet.`;
  return `No se pudo leer «${coleccion}» (${code || err?.message || 'error desconocido'}).`;
};

/**
 * @param {Record<string, Promise>} consultas  { nombre: getDocs(...) }
 * @returns {Promise<{ datos: Record<string, object[]>, errores: string[] }>}
 */
export const leerVarias = async (consultas) => {
  const claves = Object.keys(consultas);
  const res = await Promise.allSettled(Object.values(consultas));
  const datos = {};
  const errores = [];
  res.forEach((r, i) => {
    const k = claves[i];
    if (r.status === 'fulfilled') {
      datos[k] = r.value.docs.map((d) => ({ id: d.id, ...d.data() }));
    } else {
      console.error(`Error leyendo ${k}:`, r.reason);
      datos[k] = [];
      errores.push(mensajeError(k, r.reason));
    }
  });
  return { datos, errores };
};
