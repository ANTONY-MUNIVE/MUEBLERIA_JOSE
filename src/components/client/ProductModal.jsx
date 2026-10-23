import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { fixImageURL, formatPrice } from '../../utils/images';
import { estadoStock } from '../../utils/stock';
import MueblesSimilares from './MueblesSimilares';

/**
 * Vista rápida de un mueble desde el catálogo.
 * Flechas del teclado: anterior/siguiente; Escape: cerrar.
 * `productos` (todos los muebles) permite sugerir similares; `onElegir` cambia el mueble mostrado.
 */
const ProductModal = ({ product, onClose, onNext, onPrev, hasNext, productos = [], onElegir }) => {
  const { addToCart } = useCart();
  const [agregado, setAgregado] = useState(false);
  const panel = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onNext, onPrev, onClose]);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Al cambiar de mueble, el panel vuelve arriba
  useEffect(() => { panel.current?.scrollTo({ top: 0 }); }, [product?.id]);

  if (!product) return null;
  const estado = estadoStock(product);

  const agregar = () => {
    addToCart(product);
    setAgregado(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAgregado(false), 1600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={product.nombre}>
      <button type="button" className="absolute inset-0 bg-espresso/70 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-label="Cerrar"></button>

      {hasNext && (
        <button type="button" onClick={onPrev} aria-label="Mueble anterior" className="hidden md:flex absolute left-4 lg:left-8 z-10 w-12 h-12 rounded-full bg-hueso text-espresso items-center justify-center shadow-lg hover:bg-terracota transition">
          <i className="fas fa-chevron-left"></i>
        </button>
      )}

      <div ref={panel} className="relative bg-white w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl animate-aparecer">
        <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute top-3 right-3 z-10 w-11 h-11 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-sm transition hover:rotate-90 duration-300">
          <i className="fas fa-times text-lg"></i>
        </button>

        <div key={product.id} className="flex flex-col md:flex-row animate-fade-in">
          <div className="relative w-full md:w-1/2 aspect-[4/3] md:aspect-auto md:min-h-[420px] bg-arena">
            <img src={fixImageURL(product.imagen)} alt={product.nombre} className="absolute inset-0 w-full h-full object-cover" />
            {estado && <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-extrabold shadow-sm ${estado.clase}`}>{estado.texto}</span>}
          </div>

          <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col gap-3">
            <span className="text-xs font-extrabold tracking-widest uppercase text-terracota-oscuro pr-10">
              {[product.categoria, product.subcategoria].filter(Boolean).join(' · ') || 'Mueble'}
            </span>
            <h2 className="font-display text-3xl font-semibold leading-tight">{product.nombre}</h2>
            {(product.color || product.medidas) && (
              <p className="text-sm text-cafe">{[product.codigo, product.color, product.medidas].filter(Boolean).join(' · ')}</p>
            )}
            <p className="text-cafe leading-relaxed line-clamp-5">{product.descripcion || 'Sin descripción detallada.'}</p>

            <div className="mt-auto pt-4 border-t border-linea flex flex-col gap-3">
              <span className="text-3xl font-extrabold">{formatPrice(product.precio)}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={agregar}
                  disabled={estado?.agotado}
                  className={`flex-1 h-12 rounded-full font-extrabold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${agregado ? 'bg-exito text-white' : 'bg-terracota text-espresso hover:bg-terracota-claro'}`}
                >
                  {agregado ? <><i className="fas fa-check mr-2"></i>Agregado</> : estado?.agotado ? 'Agotado' : <><i className="fas fa-shopping-bag mr-2"></i>Agregar al carrito</>}
                </button>
                <Link to={`/producto/${product.id}`} onClick={onClose} className="h-12 px-5 rounded-full border border-gray-400 font-extrabold flex items-center hover:bg-espresso hover:text-hueso hover:border-espresso transition">
                  Ver más
                </Link>
              </div>
            </div>
          </div>
        </div>

        {productos.length > 1 && (
          <div className="px-6 md:px-8 pb-6 pt-2 border-t border-linea">
            <MueblesSimilares producto={product} muebles={productos} onElegir={onElegir} titulo="También te puede gustar" cantidad={10} compacto />
          </div>
        )}
      </div>

      {hasNext && (
        <button type="button" onClick={onNext} aria-label="Mueble siguiente" className="hidden md:flex absolute right-4 lg:right-8 z-10 w-12 h-12 rounded-full bg-hueso text-espresso items-center justify-center shadow-lg hover:bg-terracota transition">
          <i className="fas fa-chevron-right"></i>
        </button>
      )}
    </div>
  );
};

export default ProductModal;
