import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Se lee una sola vez por sesión: lo usan el pie de página y la franja de muebles a medida.
let cache = null;
let pendiente = null;

const cargar = () => {
  if (cache) return Promise.resolve(cache);
  if (!pendiente) {
    pendiente = getDoc(doc(db, 'content', 'about'))
      .then((snap) => { cache = snap.exists() ? snap.data() : {}; return cache; })
      .catch((err) => { console.error('Info de la empresa:', err); pendiente = null; return {}; });
  }
  return pendiente;
};

/** Enlace de WhatsApp a partir del teléfono guardado en «Nosotros» (se asume Perú si tiene 9 dígitos). */
export const enlaceWhatsApp = (telefono, mensaje = '') => {
  let num = String(telefono || '').replace(/\D/g, '');
  if (!num) return null;
  if (num.length === 9) num = `51${num}`;
  return `https://wa.me/${num}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`;
};

/** Datos de «Nosotros y contacto» (content/about): dirección, teléfono, correo, horario. */
const useInfoEmpresa = () => {
  const [info, setInfo] = useState(cache);
  useEffect(() => {
    let vivo = true;
    if (!cache) cargar().then((d) => { if (vivo) setInfo(d); });
    return () => { vivo = false; };
  }, []);
  return info || {};
};

export default useInfoEmpresa;
