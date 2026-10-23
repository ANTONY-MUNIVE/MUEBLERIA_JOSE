import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc, collection, query, limit, getDocs } from 'firebase/firestore';
import { fixImageURL } from '../../utils/images';
import ProductCard from '../../components/client/ProductCard';
import useInfoEmpresa, { enlaceWhatsApp } from '../../hooks/useInfoEmpresa';

const INTERVALO = 10000;

const SLIDE_POR_DEFECTO = {
  titulo: 'Bienvenido a Mueblería Jose',
  subtitulo: 'Configura este banner desde el panel, en Portada.',
  imagen: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=1770&q=80',
  botonTexto: 'Ir al catálogo',
  botonLink: '/catalogo',
};

const ETIQUETA_POST = {
  oferta: 'bg-terracota text-espresso',
  novedad: 'bg-espresso text-hueso',
  temporada: 'bg-aviso-fondo text-aviso',
};

const prefiereMenosMovimiento = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Carrusel de portada: los slides se editan en Admin › Portada. */
const Carrusel = ({ slides }) => {
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const total = slides.length;

  const ir = useCallback((i) => setActual(((i % total) + total) % total), [total]);

  useEffect(() => {
    if (total < 2 || pausado || prefiereMenosMovimiento()) return undefined;
    const t = setTimeout(() => ir(actual + 1), INTERVALO);
    return () => clearTimeout(t);
  }, [actual, pausado, total, ir]);

  const slide = slides[actual] || slides[0];

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Destacados"
      className="relative bg-espresso text-hueso rounded-[32px] overflow-hidden flex flex-col md:flex-row min-h-[460px]"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <div key={actual} className="flex-1 px-7 py-10 md:px-12 md:py-14 flex flex-col justify-center gap-5 animate-fade-in-up" aria-live="polite">
        <span className="self-start bg-terracota text-espresso text-xs font-extrabold tracking-widest px-3 py-1 rounded-full">DESTACADO</span>
        <h1 className="font-display font-semibold text-4xl md:text-5xl lg:text-[54px] leading-[1.05]">{slide.titulo}</h1>
        {slide.subtitulo && <p className="text-lg text-piedra max-w-md">{slide.subtitulo}</p>}
        {slide.botonTexto && (
          <Link to={slide.botonLink || '/catalogo'} className="group/btn self-start inline-flex items-center gap-3 bg-hueso text-espresso px-7 py-3.5 rounded-full font-extrabold hover:bg-terracota transition-colors">
            {slide.botonTexto}
            <i className="fas fa-arrow-right transition-transform group-hover/btn:translate-x-1"></i>
          </Link>
        )}
      </div>

      <div className="relative md:flex-[1.3] min-h-[280px] m-3 md:m-4 rounded-3xl overflow-hidden bg-espresso-2">
        {slides.map((s, i) => (
          <img
            key={i}
            src={fixImageURL(s.imagen)}
            alt={i === actual ? s.titulo : ''}
            aria-hidden={i !== actual}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-out ${i === actual ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
          />
        ))}
        {total > 1 && (
          <div className="absolute right-4 bottom-4 flex gap-2">
            <button type="button" onClick={() => ir(actual - 1)} aria-label="Slide anterior" className="w-12 h-12 rounded-full bg-hueso text-espresso flex items-center justify-center shadow-lg hover:bg-terracota transition">
              <i className="fas fa-chevron-left"></i>
            </button>
            <button type="button" onClick={() => ir(actual + 1)} aria-label="Slide siguiente" className="w-12 h-12 rounded-full bg-hueso text-espresso flex items-center justify-center shadow-lg hover:bg-terracota transition">
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        )}
      </div>

      {total > 1 && (
        <div className="flex gap-2 px-7 pb-6 md:p-0 md:absolute md:left-12 md:bottom-6" role="group" aria-label="Elegir slide">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => ir(i)}
              aria-label={`Slide ${i + 1}`}
              aria-current={i === actual}
              className={`relative h-2.5 rounded-full overflow-hidden transition-all duration-300 ${i === actual ? 'w-10 bg-cafe' : 'w-2.5 bg-cafe hover:bg-piedra'}`}
            >
              {i === actual && (
                <span
                  key={`${actual}-${pausado}`}
                  className="absolute inset-0 bg-terracota origin-left animate-progreso"
                  style={{ animationPlayState: pausado ? 'paused' : 'running' }}
                ></span>
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

const Esqueleto = () => (
  <div className="space-y-16" aria-busy="true" aria-label="Cargando">
    <div className="h-[460px] rounded-[32px] bg-arena animate-pulse"></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[0, 1, 2].map((i) => <div key={i} className="h-80 rounded-3xl bg-arena animate-pulse"></div>)}
    </div>
  </div>
);

/** Franja informativa de muebles a medida. Fuera del alcance de la medición (no registra pedidos). */
const FranjaAMedida = () => {
  const info = useInfoEmpresa();
  const whatsapp = enlaceWhatsApp(info.telefono, 'Hola, quisiera cotizar un mueble a medida.');
  const etapas = ['Registrado', 'En fabricación', 'Terminado', 'Entregado'];
  return (
    <section className="bg-terracota text-espresso rounded-[32px] p-8 md:p-12 flex flex-col lg:flex-row gap-8 lg:items-center">
      <div className="flex-[2] flex flex-col gap-3">
        <span className="text-[13px] font-extrabold tracking-widest">MUEBLES A MEDIDA</span>
        <h2 className="font-display font-semibold text-3xl md:text-[38px] leading-tight">¿No encuentras la medida? Te lo hacemos.</h2>
        <p className="text-[17px] font-semibold max-w-xl">Acércate a la tienda o escríbenos. Con un adelanto empezamos a fabricar y te avisamos en cada etapa hasta la entrega.</p>
        <div className="flex flex-wrap gap-3 mt-2">
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-espresso text-hueso px-6 py-3.5 rounded-full font-extrabold hover:bg-espresso-2 transition">
              <i className="fab fa-whatsapp text-lg"></i>Escríbenos por WhatsApp
            </a>
          )}
          <Link to="/contacto" className="inline-flex items-center gap-2 bg-hueso text-espresso px-6 py-3.5 rounded-full font-extrabold hover:bg-white transition">
            <i className="fas fa-map-marker-alt"></i>Ver dónde estamos
          </Link>
        </div>
      </div>
      <ol aria-label="Etapas del pedido" className="flex-1 grid grid-cols-2 gap-2.5">
        {etapas.map((e, i) => (
          <li key={e} className={`rounded-2xl px-4 py-3.5 font-bold ${i === etapas.length - 1 ? 'bg-hueso font-extrabold' : 'bg-white/35'}`}>
            {i + 1} · {e}
          </li>
        ))}
      </ol>
    </section>
  );
};

const Home = () => {
  const [slides, setSlides] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [homeSnap, postsSnap, prodSnap] = await Promise.all([
          getDoc(doc(db, 'content', 'home')),
          getDocs(collection(db, 'publications')),
          getDocs(query(collection(db, 'muebles'), limit(3))),
        ]);
        const s = homeSnap.exists() ? homeSnap.data().slides : null;
        setSlides(s && s.length ? s : [SLIDE_POR_DEFECTO]);
        setPosts(postsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setFeaturedProducts(prodSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error('Error Home:', error);
        setSlides([SLIDE_POR_DEFECTO]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Esqueleto />;

  return (
    <div className="flex flex-col gap-16 md:gap-20">
      <Carrusel slides={slides} />

      {featuredProducts.length > 0 && (
        <section>
          <div className="flex flex-wrap justify-between items-baseline gap-3 mb-6">
            <h2 className="font-display font-semibold text-3xl md:text-[34px]">Recién agregados</h2>
            <Link to="/catalogo" className="font-extrabold text-terracota-oscuro hover:text-espresso inline-flex items-center gap-2 group">
              Ver todo el catálogo <i className="fas fa-arrow-right transition-transform group-hover:translate-x-1"></i>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((p, i) => <ProductCard key={p.id} product={p} mostrarDescripcion retraso={i * 80} />)}
          </div>
        </section>
      )}

      <FranjaAMedida />

      {posts.length > 0 && (
        <section>
          <div className="text-center mb-8">
            <h2 className="font-display font-semibold text-3xl md:text-[34px]">Novedades y ofertas</h2>
            <p className="text-cafe mt-1">Entérate de lo último en nuestra tienda</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post, i) => (
              <article key={post.id} className="group bg-white rounded-3xl overflow-hidden flex flex-col hover:shadow-[0_12px_28px_-12px_rgba(36,26,20,0.35)] hover:-translate-y-1 transition duration-300 animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="relative aspect-video overflow-hidden bg-arena">
                  <img src={fixImageURL(post.imagen)} alt={post.titulo} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  {post.tipo && (
                    <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${ETIQUETA_POST[post.tipo] || 'bg-white text-espresso'}`}>
                      {post.tipo}
                    </span>
                  )}
                </div>
                <div className="p-6 flex flex-col gap-2.5 flex-1">
                  <h3 className="font-display text-[22px] font-semibold leading-snug">{post.titulo}</h3>
                  <p className="text-cafe line-clamp-3 flex-1">{post.contenido}</p>
                  {post.botonTexto && (
                    <Link to={post.botonLink || '/catalogo'} className="self-start font-extrabold text-terracota-oscuro hover:text-espresso inline-flex items-center gap-2 group/l">
                      {post.botonTexto} <i className="fas fa-arrow-right text-xs transition-transform group-hover/l:translate-x-1"></i>
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
