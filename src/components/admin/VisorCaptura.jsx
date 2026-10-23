import React, { useEffect, useState } from 'react';
import { obtenerCapturaYape } from '../../services/ventasService';

/**
 * Muestra la captura de Yape de una venta. La imagen se descarga solo al abrir el visor
 * (vive en capturasYape/{ventaId}); las ventas antiguas pueden traer una URL de Storage.
 */
const VisorCaptura = ({ ventaId, codigo, urlAntigua = null, dataUrlLocal = null, onClose }) => {
  const [src, setSrc] = useState(dataUrlLocal || urlAntigua);
  const [error, setError] = useState('');

  useEffect(() => {
    if (dataUrlLocal || urlAntigua || !ventaId) return undefined;
    let vivo = true;
    obtenerCapturaYape(ventaId)
      .then((d) => { if (vivo) { if (d) setSrc(d); else setError('Esta venta no tiene captura guardada.'); } })
      .catch((e) => { if (vivo) setError(e?.code === 'permission-denied' ? 'Firestore no da permiso para leer las capturas (revise firestore.rules).' : 'No se pudo cargar la captura.'); });
    return () => { vivo = false; };
  }, [ventaId, urlAntigua, dataUrlLocal]);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Captura de Yape ${codigo || ''}`}>
      <button type="button" className="absolute inset-0 bg-espresso/70 animate-fade-in" onClick={onClose} aria-label="Cerrar"></button>
      <div className="relative bg-white rounded-3xl p-4 max-w-md w-full max-h-[90vh] flex flex-col gap-3 animate-aparecer">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Captura de Yape {codigo}</h2>
          <button type="button" onClick={onClose} className="w-10 h-10 rounded-full hover:bg-arena" aria-label="Cerrar"><i className="fas fa-times"></i></button>
        </div>
        <div className="flex-1 min-h-48 overflow-auto rounded-2xl bg-arena flex items-center justify-center">
          {error ? (
            <p className="text-sm text-cafe p-6 text-center">{error}</p>
          ) : src ? (
            <img src={src} alt={`Captura del pago con Yape ${codigo || ''}`} className="max-w-full h-auto" />
          ) : (
            <i className="fas fa-spinner fa-spin text-2xl text-cafe" aria-label="Cargando"></i>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisorCaptura;
