import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom'; // useParams lee el ID de la URL
import { doc, getDoc } from 'firebase/firestore'; // Funciones para leer UN solo documento
import { db } from '../../firebase/config';
import { fixImageURL, formatPrice } from '../../utils/images';

import { useCart } from '../../context/CartContext';

const ProductDetail = () => {
  const { id } = useParams(); // Recuperamos el ID de la URL
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getProduct = async () => {
      setLoading(true);
      try {
        // Referencia al documento exacto
        const docRef = doc(db, "muebles", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.log("No se encontró el producto!");
        }
      } catch (error) {
        console.error("Error obteniendo producto:", error);
      } finally {
        setLoading(false);
      }
    };

    getProduct();
  }, [id]);

  if (loading) return <div className="text-center py-20">Cargando detalle...</div>;
  if (!product) return <div className="text-center py-20">Producto no encontrado.</div>;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Botón Volver */}
      <Link to="/catalogo" className="inline-flex items-center text-gray-500 hover:text-orange-600 mb-6 transition-colors">
        <i className="fas fa-arrow-left mr-2"></i> Volver al catálogo
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-gray-100">
        
        {/* COLUMNA IZQUIERDA: IMAGEN */}
        <div className="h-96 md:h-[500px] rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center">
            <img 
                src={fixImageURL(product.imagen)} 
                alt={product.nombre} 
                className="w-full h-full object-contain mix-blend-multiply" // mix-blend ayuda si la foto tiene fondo blanco
            />
        </div>

        {/* COLUMNA DERECHA: INFO */}
        <div className="flex flex-col justify-center">
            <span className="text-orange-600 font-bold tracking-wider text-sm uppercase mb-2">
                {product.categoria || 'Muebles de Diseño'}
            </span>
            
            <h1 className="font-display text-4xl font-semibold text-gray-900 mb-4">{product.nombre}</h1>
            
            <div className="text-3xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-6">
                {formatPrice(product.precio)}
            </div>

            <div className="prose text-gray-600 mb-8">
                <h3 className="font-bold text-gray-800 mb-2">Descripción</h3>
                <p>{product.descripcion}</p>
            </div>

            {/* Selector de Cantidad (Visual por ahora) */}
            <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center border border-gray-300 rounded-lg">
                    <button className="px-4 py-2 hover:bg-gray-100">-</button>
                    <span className="px-4 font-bold">1</span>
                    <button className="px-4 py-2 hover:bg-gray-100">+</button>
                </div>
                <span className="text-sm text-green-600 font-medium">
                    <i className="fas fa-check-circle mr-1"></i> Disponible
                </span>
            </div>

            {/* Botón de Compra ACTUALIZADO */}
            <button 
                onClick={() => {
                    addToCart(product);
                    alert("¡Producto agregado al carrito!"); // Feedback simple
                }}
                className="w-full bg-gray-900 hover:bg-orange-600 text-white py-4 rounded-xl font-bold text-lg transition-transform hover:scale-[1.02] active:scale-95 shadow-lg"
            >
                Añadir al Carrito
            </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;