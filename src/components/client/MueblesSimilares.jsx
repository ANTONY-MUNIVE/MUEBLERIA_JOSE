import React, { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fixImageURL, formatPrice } from '../../utils/images';
import { estadoStock } from '../../utils/stock';
import { mueblesSimilares } from '../../utils/similares';

/**
 * Fila deslizable de muebles parecidos al que se está viendo.
 * - Sin `onElegir`: cada tarjeta enlaza a /producto/:id (página de detalle).
 * - Con `onElegir`: cambia el mueble mostrado (modal del catálogo).
 */
const MueblesSimilares = ({ producto, muebles, onElegir, titulo = 'Muebles similares', cantidad = 8, compacto = false }) => {
  const fila = useRef(null);
  const lista = useMemo(() => mueblesSimilares(producto, muebles, cantidad), [producto, muebles, cantidad]);
  if (!lista.length) return null;

  const desplazar = (dir) => {
    const el = fila.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  const tarjeta = (m) => {
    const estado = estadoStock(m);
    const contenido = (
      <>
        <span className={`relative block ${compacto ? 'aspect-square' : 'aspect-[4/3]'} rounded-2xl overflow-hidden bg-arena`}>
          <img src={fixImageURL(m.imagen)} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          {estado && !compacto && <span className={`absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${estado.clase}`}>{estado.texto}</span>}
        </span>
        <span className={`block font-bold leading-snug mt-2 ${compacto ? 'text-sm line-clamp-2' : 'line-clamp-2'}`}>{m.nombre}</span>
        <span className={`block font-extrabold ${compacto ? 'text-sm' : ''}`}>{formatPrice(m.precio)}</span>
      </>
    );
    const clase = 'group block text-left w-full rounded-3xl p-2 hover:bg-white transition';
    return onElegir
      ? <button type="button" onClick={() => onElegir(m)} className={clase} aria-label={`Ver ${m.nombre}`}>{contenido}</button>
      : <Link to={`/producto/${m.id}`} className={clase}>{contenido}</Link>;
  };

  return (
    <section aria-label={titulo} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className={`font-display font-semibold ${compacto ? 'text-lg' : 'text-2xl md:text-[28px]'}`}>{titulo}</h2>
        {lista.length > 3 && (
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={() => desplazar(-1)} className="w-11 h-11 rounded-full border border-linea bg-white hover:bg-espresso hover:text-hueso transition" aria-label="Ver anteriores"><i className="fas fa-chevron-left"></i></button>
            <button type="button" onClick={() => desplazar(1)} className="w-11 h-11 rounded-full border border-linea bg-white hover:bg-espresso hover:text-hueso transition" aria-label="Ver siguientes"><i className="fas fa-chevron-right"></i></button>
          </div>
        )}
      </div>
      <ul
        ref={fila}
        className={`flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 sin-barra ${compacto ? '' : 'scroll-smooth'}`}
      >
        {lista.map((m, i) => (
          <li
            key={m.id}
            className={`snap-start shrink-0 animate-fade-in-up ${compacto ? 'w-32' : 'w-[70%] sm:w-[42%] md:w-[30%] lg:w-[23%]'}`}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {tarjeta(m)}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default MueblesSimilares;
