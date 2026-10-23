import React, { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext'; 
import { useAuth } from '../../context/AuthContext'; 
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const formatPrice = (amount) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(amount);
};

const Checkout = () => {
  const { cart = [], totalPrice = 0, clearCart } = useCart();
  const { user, loading } = useAuth(); 
  const navigate = useNavigate();
  const [procesando, setProcesando] = useState(false);
  
  // Estado inicial
  const [clientData, setClientData] = useState({
    email: '', // Importante inicializarlo
    nombre: '',
    telefono: '',
    direccion: ''
  });

  // --- LÓGICA DE RECUPERACIÓN DE DATOS ---
  useEffect(() => {
    if (loading || !user) return;

    const fetchUserData = async () => {
        try {
            // 1. Buscamos en la colección 'users'
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                console.log("Datos recuperados:", data);
                
                // 2. Llenamos el formulario
                setClientData({
                    nombre: data.nombre || '',
                    telefono: data.telefono || '',
                    direccion: data.direccion || '',
                    // Prioridad: Email de BD > Email de Auth > Vacío
                    email: data.email || user.email || '' 
                });
            } else {
                // Si no hay datos en BD, usamos el de Auth
                setClientData(prev => ({
                    ...prev,
                    email: user.email || ''
                }));
            }
        } catch (error) {
            console.error("Error recuperando datos:", error);
        }
    };

    fetchUserData();
  }, [user, loading]);

  const handleInputChange = (e) => {
    setClientData({
        ...clientData,
        [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcesando(true);

    // Validación final: El email NO puede estar vacío
    if (!clientData.email) {
        alert("Error: El campo email es obligatorio.");
        setProcesando(false);
        return;
    }

    try {
        const order = {
            cliente: clientData, // Enviamos clientData completo (ya incluye email)
            productos: cart.map(item => ({
                id: item.id,
                nombre: item.nombre,
                precio: item.precio,
                cantidad: item.quantity
            })),
            total: totalPrice,
            fecha: serverTimestamp(),
            userId: user ? user.uid : null,
            estado: 'pendiente',
            metodoPago: 'Transferencia'
        };

        const docRef = await addDoc(collection(db, "orders"), order);
        clearCart();
        alert(`¡Pedido creado! ID: ${docRef.id}`);
        navigate('/');
    } catch (error) {
        console.error("Error creando orden:", error);
        alert("Hubo un error al procesar el pedido.");
    } finally {
        setProcesando(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Cargando...</div>;
  if (!cart.length) return <div className="p-10 text-center">Carrito vacío. <button onClick={() => navigate('/')}>Volver</button></div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="font-display text-2xl font-semibold mb-6">Finalizar Compra</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* --- ESTE ES EL CAMPO QUE TE FALTA EN LA PANTALLA --- */}
            <div>
                <label className="block text-sm font-bold mb-1">Email</label>
                <input 
                    type="email" 
                    name="email"
                    value={clientData.email} 
                    onChange={handleInputChange}
                    className="w-full border p-2 rounded bg-gray-100"
                    placeholder="tu@email.com"
                    readOnly={!!user} // Si está logueado, no se edita
                    required 
                />
            </div>
            {/* ----------------------------------------------------- */}

            <div>
                <label className="block text-sm font-bold mb-1">Nombre Completo</label>
                <input 
                    type="text" 
                    name="nombre"
                    value={clientData.nombre} 
                    onChange={handleInputChange}
                    className="w-full border p-2 rounded"
                    required 
                />
            </div>

            <div>
                <label className="block text-sm font-bold mb-1">Teléfono</label>
                <input 
                    type="tel" 
                    name="telefono"
                    value={clientData.telefono} 
                    onChange={handleInputChange}
                    className="w-full border p-2 rounded"
                    required 
                />
            </div>

            <div>
                <label className="block text-sm font-bold mb-1">Dirección</label>
                <input 
                    type="text" 
                    name="direccion"
                    value={clientData.direccion} 
                    onChange={handleInputChange}
                    className="w-full border p-2 rounded"
                    required 
                />
            </div>

            <button 
                type="submit" 
                disabled={procesando}
                className="w-full bg-green-600 text-white font-bold py-3 rounded hover:bg-green-700"
            >
                {procesando ? 'Procesando...' : 'Confirmar Compra'}
            </button>
        </form>

        <div className="bg-gray-50 p-6 rounded h-fit">
            <h2 className="font-display text-xl font-semibold mb-4">Resumen</h2>
            {cart.map(item => (
                <div key={item.id} className="flex justify-between py-2 border-b text-sm">
                    <span>{item.quantity} x {item.nombre}</span>
                    <span>{formatPrice(item.precio * item.quantity)}</span>
                </div>
            ))}
            <div className="flex justify-between mt-4 text-xl font-bold">
                <span>Total:</span>
                <span>{formatPrice(totalPrice)}</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;