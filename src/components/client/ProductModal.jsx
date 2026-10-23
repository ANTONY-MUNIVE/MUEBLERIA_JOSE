import React, { useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../utils/images';

const ProductModal = ({ product, onClose, onNext, onPrev, hasNext }) => {
  const { addToCart } = useCart();

  useEffect(() => {
    // 1. Bloquear Scroll
    document.body.style.overflow = 'hidden';

    // 2. Escuchar teclas del teclado (Flecha Derecha / Izquierda / Escape)
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown); // Limpieza
    };
  }, [onNext, onPrev, onClose]); // Se recrea si cambian las funciones

  if (!product) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/70 backdrop-blur-sm p-4 animate-fade-in" role="dialog" aria-modal="true" aria-label={product.nombre}
      onClick={onClose}
    >
      
      {/* === FLECHA IZQUIERDA (Solo si hay más de 1 producto) === */}
      {hasNext && (
        <button 
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            aria-label="Mueble anterior"
            className="absolute left-2 md:left-8 text-white hover:text-gray-300 z-50 p-4 transition-transform hover:-translate-x-1"
        >
            <i className="fas fa-chevron-left text-4xl shadow-black drop-shadow-lg"></i>
        </button>
      )}

      {/* CONTENIDO DEL MODAL */}
      <div 
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden relative flex flex-col md:flex-row animate-aparecer"
        onClick={(e) => e.stopPropagation()} 
      >
        
        {/* BOTÓN CERRAR (X) */}
        <button 
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4 z-10 bg-white/80 hover:bg-white text-gray-800 rounded-full w-10 h-10 flex items-center justify-center transition shadow-sm hover:rotate-90 duration-300"
        >
          <i className="fas fa-times text-lg"></i>
        </button>

        {/* IMAGEN */}
        <div className="w-full md:w-1/2 h-64 md:h-auto bg-gray-100 relative group">
            <img 
                src={product.imagen || 'https://via.placeholder.com/400'} 
                alt={product.nombre}
                className="w-full h-full object-cover"
            />
        </div>

        {/* DETALLES */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
            
            <span className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-2">
                {product.categoria || 'Muebles'}
            </span>
            
            <h2 className="font-display text-3xl font-semibold text-gray-900 mb-4 leading-tight">
                {product.nombre}
            </h2>
            
            <p className="text-gray-600 mb-6 leading-relaxed max-h-40 overflow-y-auto">
                {product.descripcion || 'Sin descripción detallada.'}
            </p>

            <div className="mt-auto border-t border-gray-100 pt-6">
                <div className="flex items-center justify-between mb-6">
                    <span className="text-3xl font-bold text-gray-900">
                        {formatPrice(product.precio)}
                    </span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">
                        Disponible
                    </span>
                </div>

                <div className="flex gap-4">
                    <button 
                        onClick={() => { addToCart(product); onClose(); }}
                        className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition transform active:scale-95 flex items-center justify-center gap-2"
                    >
                        <i className="fas fa-shopping-cart"></i>
                        Agregar
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* === FLECHA DERECHA === */}
      {hasNext && (
        <button 
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            aria-label="Mueble siguiente"
            className="absolute right-2 md:right-8 text-white hover:text-gray-300 z-50 p-4 transition-transform hover:translate-x-1"
        >
            <i className="fas fa-chevron-right text-4xl shadow-black drop-shadow-lg"></i>
        </button>
      )}

    </div>
  );
};

export default ProductModal;