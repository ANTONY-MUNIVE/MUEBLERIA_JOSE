import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import ProductCard from '../../components/client/ProductCard';
import { hayStock, normalizarTexto } from '../../utils/similares';
import ProductModal from '../../components/client/ProductModal';
import { useSearchParams } from 'react-router-dom'; // <--- 1. IMPORTANTE: Agregado para leer la URL

const Catalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // === ESTADOS DE FILTRO AVANZADO ===
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriesData, setCategoriesData] = useState([]); 
  
  // Guardamos qué categoría padre está activa y cuál subcategoría
  const [activeCategory, setActiveCategory] = useState('Todos'); 
  const [activeSubcategory, setActiveSubcategory] = useState(null); 
  const [soloDisponibles, setSoloDisponibles] = useState(false);

  // === HOOK PARA LEER URL (CONEXIÓN CON NAVBAR) ===
  const [searchParams] = useSearchParams();

  // 1. Efecto para Cargar Datos
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Cargar Estructura de Categorías
        const catsSnapshot = await getDocs(collection(db, "categories"));
        const catsStructure = catsSnapshot.docs.map(doc => ({
            id: doc.id,
            nombre: doc.data().nombre,
            subcategorias: doc.data().subcategorias || []
        }));
        setCategoriesData(catsStructure);

        // Cargar Muebles
        const prodsSnapshot = await getDocs(collection(db, "muebles"));
        const prodsList = prodsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(prodsList);

      } catch (error) {
        console.error("Error cargando:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2. Efecto para Sincronizar URL con el Buscador (NUEVO)
  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
        setSearchTerm(query); // Pone el texto de la URL en el buscador
        setActiveCategory('Todos'); // Resetea categorías para buscar en todo
    }
  }, [searchParams]);

  // === LÓGICA DE FILTRADO ===
  // Se muestran todos los muebles (los agotados al final, se pueden pedir a medida).
  // Categorías y búsqueda se comparan sin mayúsculas ni tildes (hay datos guardados como «sala»).
  const filteredProducts = products
    .filter((product) => {
      if (soloDisponibles && !hayStock(product)) return false;
      const term = normalizarTexto(searchTerm);
      const matchSearch = !term || [product.nombre, product.codigo, product.color].some((v) => normalizarTexto(v).includes(term));
      const matchCat = activeCategory === 'Todos' || normalizarTexto(product.categoria || 'Otros') === normalizarTexto(activeCategory);
      const matchSub = activeCategory === 'Todos' || !activeSubcategory || normalizarTexto(product.subcategoria) === normalizarTexto(activeSubcategory);
      return matchSearch && matchCat && matchSub;
    })
    .sort((x, y) => Number(hayStock(y)) - Number(hayStock(x)));

  // Funciones navegación Modal
  const navigateModal = (direction) => {
    if (!selectedProduct) return;
    const currentIndex = filteredProducts.findIndex(p => p.id === selectedProduct.id);
    let newIndex;
    if (direction === 'next') newIndex = (currentIndex + 1) % filteredProducts.length;
    else newIndex = (currentIndex - 1 + filteredProducts.length) % filteredProducts.length;
    setSelectedProduct(filteredProducts[newIndex]);
  };

  const limpiarFiltros = () => { setSearchTerm(''); setActiveCategory('Todos'); setActiveSubcategory(null); setSoloDisponibles(false); };
  const etiquetaFiltro = activeCategory === 'Todos' ? 'Todos los muebles' : [activeCategory, activeSubcategory].filter(Boolean).join(' · ');

  if (loading) {
    return (
      <div className="flex flex-col lg:flex-row gap-6" aria-busy="true" aria-label="Cargando catálogo">
        <div className="lg:w-72 h-80 rounded-3xl bg-arena animate-pulse"></div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-80 rounded-3xl bg-arena animate-pulse"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mb-7">
        <h1 className="font-display font-semibold text-4xl md:text-[44px]">Nuestro catálogo</h1>
        <p className="text-cafe mt-1">
          {searchTerm ? <>Resultados para «<strong className="text-espresso">{searchTerm}</strong>»</> : 'Muebles diseñados para tu hogar.'}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Filtros */}
        <aside aria-label="Filtros" className="w-full lg:w-72 shrink-0 bg-white rounded-3xl p-5 flex flex-col gap-4 lg:sticky lg:top-24">
          <div>
            <label htmlFor="buscar-catalogo" className="block text-[13px] font-extrabold mb-1.5">Buscar en el catálogo</label>
            <div className="relative">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-cafe/70" aria-hidden="true"></i>
              <input
                id="buscar-catalogo"
                type="search"
                placeholder="Ej. ropero"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 pl-10 pr-3 rounded-2xl border border-gray-400 bg-white outline-none focus:border-terracota focus:ring-2 focus:ring-terracota/30 transition"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[13px] font-extrabold pb-1">Categorías</span>
            <button
              type="button"
              onClick={() => { setActiveCategory('Todos'); setActiveSubcategory(null); }}
              className={`text-left px-4 min-h-11 rounded-2xl font-bold transition ${activeCategory === 'Todos' ? 'bg-espresso text-hueso' : 'hover:bg-hueso'}`}
            >
              Ver todo
            </button>
            {categoriesData.map((cat) => {
              const activa = activeCategory === cat.nombre;
              return (
                <div key={cat.id}>
                  <button
                    type="button"
                    aria-expanded={cat.subcategorias.length > 0 ? activa : undefined}
                    onClick={() => {
                      if (activa) setActiveSubcategory(null);
                      else { setActiveCategory(cat.nombre); setActiveSubcategory(null); }
                    }}
                    className={`w-full flex justify-between items-center text-left px-4 min-h-11 rounded-2xl font-bold transition ${activa ? 'bg-espresso text-hueso' : 'hover:bg-hueso'}`}
                  >
                    <span>{cat.nombre}</span>
                    {cat.subcategorias.length > 0 && <i className={`fas fa-chevron-down text-xs transition-transform duration-300 ${activa ? 'rotate-180' : ''}`}></i>}
                  </button>
                  {activa && cat.subcategorias.length > 0 && (
                    <ul className="ml-5 mt-1 mb-2 pl-3 border-l-2 border-linea flex flex-col gap-0.5 animate-fade-in-down">
                      {cat.subcategorias.map((sub) => (
                        <li key={sub}>
                          <button
                            type="button"
                            onClick={() => setActiveSubcategory(sub)}
                            className={`w-full text-left px-2.5 min-h-10 rounded-xl text-[15px] transition ${activeSubcategory === sub ? 'font-extrabold text-terracota-oscuro' : 'text-cafe hover:text-espresso'}`}
                          >
                            {sub}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          <label className="flex items-center justify-between gap-3 px-1 pt-3 border-t border-linea cursor-pointer select-none">
            <span className="font-bold text-[15px]">Solo disponibles en tienda</span>
            <input type="checkbox" checked={soloDisponibles} onChange={(e) => setSoloDisponibles(e.target.checked)} className="peer sr-only" />
            <span aria-hidden="true" className="relative w-12 h-7 rounded-full bg-linea peer-checked:bg-terracota transition-colors after:content-[''] after:absolute after:top-1 after:left-1 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5 peer-focus-visible:ring-4 peer-focus-visible:ring-terracota/40"></span>
          </label>
        </aside>

        {/* Resultados */}
        <section aria-label="Resultados" className="flex-1 min-w-0 flex flex-col gap-4 w-full">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <p className="text-cafe"><strong className="text-espresso">{etiquetaFiltro}</strong> · {filteredProducts.length} {filteredProducts.length === 1 ? 'mueble' : 'muebles'}</p>
            {(searchTerm || activeCategory !== 'Todos' || soloDisponibles) && (
              <button type="button" onClick={limpiarFiltros} className="font-extrabold text-sm text-terracota-oscuro hover:text-espresso px-1 min-h-10">
                <i className="fas fa-times mr-1.5"></i>Limpiar filtros
              </button>
            )}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 px-6 bg-white rounded-3xl border border-dashed border-linea animate-fade-in">
              <i className="fas fa-couch text-4xl text-piedra mb-4"></i>
              <p className="font-bold text-lg">No encontramos muebles con esos filtros.</p>
              <p className="text-cafe mt-1">Prueba con otra palabra o revisa todas las categorías.</p>
              <button type="button" onClick={limpiarFiltros} className="mt-5 bg-espresso text-hueso px-6 py-3 rounded-full font-extrabold hover:bg-espresso-2 transition">Ver todo el catálogo</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredProducts.map((product, i) => (
                <ProductCard key={product.id} product={product} onVerDetalle={setSelectedProduct} retraso={Math.min(i, 8) * 50} />
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onNext={() => navigateModal('next')}
          onPrev={() => navigateModal('prev')}
          hasNext={filteredProducts.length > 1}
          productos={products}
          onElegir={setSelectedProduct}
        />
      )}
    </div>
  );
};

export default Catalog;
