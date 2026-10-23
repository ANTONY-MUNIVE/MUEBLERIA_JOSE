import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

// Lista de muebles para «similares»: se lee una vez por sesión (el catálogo es público).
let cache = null;
let pendiente = null;

const cargar = () => {
  if (cache) return Promise.resolve(cache);
  if (!pendiente) {
    pendiente = getDocs(collection(db, 'muebles'))
      .then((snap) => { cache = snap.docs.map((d) => ({ id: d.id, ...d.data() })); return cache; })
      .catch((err) => { console.error('Muebles:', err); pendiente = null; return []; });
  }
  return pendiente;
};

/** @param {object[]|null} lista si ya se tiene la lista (por ejemplo en el catálogo), no se vuelve a leer */
const useMuebles = (lista = null) => {
  const [muebles, setMuebles] = useState(lista || cache || []);
  useEffect(() => {
    if (lista) return undefined;
    let vivo = true;
    if (!cache) cargar().then((m) => { if (vivo) setMuebles(m); });
    return () => { vivo = false; };
  }, [lista]);
  return lista || muebles;
};

export default useMuebles;
