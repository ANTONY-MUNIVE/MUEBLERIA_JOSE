import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fixImageURL, formatPrice } from '../../utils/images';
import { useCart } from '../../context/CartContext';
import { estadoStock } from '../../utils/stock';

/**
 * Tarjeta de mueble de la tienda (diseño B, colores C).
 * onVerDetalle: si se pasa, abre el modal; si no, enlaza a la página del producto.
 */
const ProductCard = ({ product, onVerDetalle, mostrarDescripcion = false, retraso = 0 }) => {
  const { addToCart } = useCart();
  const [agregado, setAgregado] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const estado = estadoStock(product);
  const ruta = `/producto/${product.id}`;

  const agregar = () => {
    addToCart(product);
    setAgregado(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAgregado(false), 1600);
  };

  const imagen = (
    <>
      <img
        src={fixImageURL(product.imagen)}
        alt={product.nombre}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />
      {estado && <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-extrabold shadow-sm ${estado.clase}`}>{estado.texto}</span>}
    </>
  );

  return (
    <article
      className="group bg-white rounded-3xl p-3 pb-5 flex flex-col gap-2 shadow-[0_1px_2px_rgba(36,26,20,0.08)] hover:shadow-[0_12px_28px_-12px_rgba(36,26,20,0.35)] hover:-translate-y-1 transition duration-300 animate-fade-in-up"
      style={{ animationDelay: `${retraso}ms` }}
    >
      {onVerDetalle ? (
        <button type="button" onClick={() => onVerDetalle(product)} className="relative block aspect-[4/3] rounded-2xl overflow-hidden bg-arena" aria-label={`Ver detalle de ${product.nombre}`}>
          {imagen}
        </button>
      ) : (
        <Link to={ruta} className="relative block aspect-[4/3] rounded-2xl overflow-hidden bg-arena">{imagen}</Link>
      )}

      <div className="px-2 pt-1 flex flex-col gap-0.5 flex-1">
        {(product.categoria || product.subcategoria) && (
          <span className="text-xs font-extrabold tracking-wide uppercase text-cafe">
            {[product.categoria, product.subcategoria].filter(Boolean).join(' · ')}
          </span>
        )}
        <h3 className="font-display text-xl font-semibold leading-snug">
          <Link to={ruta} className="text-espresso hover:text-terracota-oscuro transition-colors">{product.nombre}</Link>
        </h3>
        {mostrarDescripcion && product.descripcion && <p className="text-sm text-cafe line-clamp-2">{product.descripcion}</p>}
      </div>

      <div className="px-2 pt-1 flex items-center justify-between gap-3">
        <span className="text-[22px] font-extrabold">{formatPrice(product.precio)}</span>
        <div className="flex gap-1.5">
          {onVerDetalle && (
            <button type="button" onClick={() => onVerDetalle(product)} className="w-11 h-11 rounded-full border border-linea bg-white flex items-center justify-center hover:bg-hueso transition" aria-label={`Ver detalle de ${product.nombre}`}>
              <i className="far fa-eye"></i>
            </button>
          )}
          {onVerDetalle ? (
            // En el catálogo (tarjeta angosta) el botón es solo un ícono
            <button
              type="button"
              onClick={agregar}
              disabled={estado?.agotado}
              aria-label={agregado ? `${product.nombre} agregado al carrito` : `Agregar ${product.nombre} al carrito`}
              title="Agregar al carrito"
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${agregado ? 'bg-exito text-white' : 'bg-terracota text-espresso hover:bg-terracota-claro hover:scale-105'}`}
            >
              <i key={String(agregado)} className={`fas ${agregado ? 'fa-check' : 'fa-plus'} animate-aparecer`}></i>
            </button>
          ) : (
            <button
              type="button"
              onClick={agregar}
              disabled={estado?.agotado}
              className={`h-11 px-4 rounded-full font-extrabold text-sm flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${agregado ? 'bg-exito text-white' : 'bg-terracota text-espresso hover:bg-terracota-claro'}`}
              aria-live="polite"
            >
              {agregado ? <><i className="fas fa-check animate-aparecer"></i>Agregado</> : <><i className="fas fa-plus"></i>Agregar</>}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
