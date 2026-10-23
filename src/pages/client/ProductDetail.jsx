import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { fixImageURL, formatPrice } from '../../utils/images';
import { useCart } from '../../context/CartContext';
import { estadoStock } from '../../utils/stock';
import useMuebles from '../../hooks/useMuebles';
import useInfoEmpresa, { enlaceWhatsApp } from '../../hooks/useInfoEmpresa';
import MueblesSimilares from '../../components/client/MueblesSimilares';

const Ficha = ({ label, valor }) => (valor ? (
  <div className="flex justify-between gap-4 py-2.5 border-b border-linea last:border-0">
    <dt className="text-cafe">{label}</dt>
    <dd className="font-bold text-right">{valor}</dd>
  </div>
) : null);

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const muebles = useMuebles();
  const info = useInfoEmpresa();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    let vivo = true;
    getDoc(doc(db, 'muebles', id))
      .then((snap) => {
        if (!vivo) return;
        setProduct(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setCantidad(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch((error) => console.error('Error obteniendo producto:', error))
      .finally(() => { if (vivo) setLoading(false); });
    return () => { vivo = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8" aria-busy="true">
        <div className="h-96 rounded-3xl bg-arena animate-pulse"></div>
        <div className="h-96 rounded-3xl bg-arena animate-pulse"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl">
        <i className="fas fa-couch text-4xl text-piedra mb-3"></i>
        <h1 className="font-display text-2xl font-semibold">No encontramos este mueble</h1>
        <p className="text-cafe mt-1">Puede que ya no esté en el catálogo.</p>
        <Link to="/catalogo" className="inline-block mt-5 h-11 leading-[44px] px-6 rounded-full bg-espresso text-hueso font-extrabold">Ver el catálogo</Link>
      </div>
    );
  }

  const estado = estadoStock(product);
  const stockNum = Number(product.stock);
  const maximo = Number.isFinite(stockNum) && stockNum > 0 ? stockNum : 20;
  const whatsapp = enlaceWhatsApp(info.telefono, `Hola, quisiera consultar por el mueble «${product.nombre}»${product.codigo ? ` (${product.codigo})` : ''}.`);

  const agregar = () => {
    addToCart(product, cantidad);
    setAgregado(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAgregado(false), 1800);
  };

  return (
    <div className="flex flex-col gap-14">
      <div>
        {/* Migas de pan */}
        <nav aria-label="Ruta" className="flex flex-wrap items-center gap-2 text-sm text-cafe mb-5">
          <Link to="/catalogo" className="font-bold hover:text-espresso"><i className="fas fa-arrow-left mr-2"></i>Catálogo</Link>
          {product.categoria && <><span aria-hidden="true">/</span><span>{product.categoria}</span></>}
          {product.subcategoria && <><span aria-hidden="true">/</span><span>{product.subcategoria}</span></>}
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 bg-white p-4 md:p-8 rounded-3xl animate-fade-in-up">
          <div className="relative aspect-square md:aspect-auto md:min-h-[480px] rounded-3xl overflow-hidden bg-arena">
            <img src={fixImageURL(product.imagen)} alt={product.nombre} className="absolute inset-0 w-full h-full object-cover" />
            {estado && <span className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-extrabold shadow-sm ${estado.clase}`}>{estado.texto}</span>}
          </div>

          <div className="flex flex-col gap-5 md:py-4">
            <div>
              <span className="text-xs font-extrabold tracking-widest uppercase text-terracota-oscuro">
                {[product.categoria, product.subcategoria].filter(Boolean).join(' · ') || 'Mueble'}
              </span>
              <h1 className="font-display text-3xl md:text-4xl font-semibold mt-1 leading-tight">{product.nombre}</h1>
              {product.codigo && <p className="text-sm text-cafe mt-1">Código {product.codigo}</p>}
            </div>

            <p className="text-3xl font-extrabold">{formatPrice(product.precio)}</p>

            {product.descripcion && <p className="text-cafe leading-relaxed whitespace-pre-line">{product.descripcion}</p>}

            {(product.color || product.medidas || product.unidad) && (
              <dl className="bg-hueso rounded-2xl px-4 py-1">
                <Ficha label="Color" valor={product.color} />
                <Ficha label="Medidas" valor={product.medidas} />
                <Ficha label="Se vende por" valor={product.unidad === 'juego' ? 'Juego' : product.unidad ? 'Pieza' : ''} />
              </dl>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-auto">
              <div className="flex items-center rounded-full border border-gray-400" role="group" aria-label="Cantidad">
                <button type="button" onClick={() => setCantidad((c) => Math.max(1, c - 1))} className="w-11 h-11 rounded-full font-extrabold text-lg hover:bg-arena" aria-label="Quitar uno">−</button>
                <span className="w-10 text-center font-extrabold" aria-live="polite">{cantidad}</span>
                <button type="button" onClick={() => setCantidad((c) => Math.min(maximo, c + 1))} className="w-11 h-11 rounded-full font-extrabold text-lg hover:bg-arena" aria-label="Agregar uno">+</button>
              </div>
              <button
                type="button"
                onClick={agregar}
                disabled={estado?.agotado}
                className={`flex-1 min-w-[200px] h-12 rounded-full font-extrabold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${agregado ? 'bg-exito text-white' : 'bg-terracota text-espresso hover:bg-terracota-claro'}`}
              >
                {agregado ? <><i className="fas fa-check mr-2 animate-aparecer"></i>Agregado al carrito</> : estado?.agotado ? 'Agotado' : <><i className="fas fa-shopping-bag mr-2"></i>Agregar al carrito</>}
              </button>
            </div>

            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noreferrer" className="h-12 rounded-full border border-gray-400 font-extrabold flex items-center justify-center gap-2 hover:bg-espresso hover:text-hueso hover:border-espresso transition">
                <i className="fab fa-whatsapp text-lg"></i>{estado?.agotado ? 'Consultar si lo fabricamos' : 'Consultar por WhatsApp'}
              </a>
            )}
          </div>
        </div>
      </div>

      <MueblesSimilares producto={product} muebles={muebles} />
    </div>
  );
};

export default ProductDetail;
