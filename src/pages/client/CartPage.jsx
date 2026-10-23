import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // <--- 1. AGREGAMOS useNavigate
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { fixImageURL, formatPrice } from '../../utils/images';

// FIREBASE
import { doc, runTransaction, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

// LIBRERÍAS PDF
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const CartPage = () => {
  const { cart, totalPrice, clearCart, decreaseQuantity, addToCart, removeFromCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate(); // <--- 2. HOOK PARA REDIRECCIONAR
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState(null); 
  
  const [purchasedItems, setPurchasedItems] = useState([]);
  const [purchasedTotal, setPurchasedTotal] = useState(0);

  const [clientData, setClientData] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
    email: '',
    metodoPago: 'Transferencia'
  });

  // --- EFECTO: Cargar datos del usuario si existe ---
  useEffect(() => {
    if (authLoading || !user) return;

    const fetchUserData = async () => {
        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                setClientData(prev => ({
                    ...prev,
                    nombre: data.nombre || '',
                    telefono: data.telefono || '',
                    direccion: data.direccion || '',
                    email: data.email || user.email || '' 
                }));
            } else {
                setClientData(prev => ({
                    ...prev,
                    email: user.email || ''
                }));
            }
        } catch (error) {
            console.error("Error cargando datos de usuario:", error);
        }
    };
    fetchUserData();
  }, [user, authLoading]);

  // Si el usuario llega al paso 2 y se loguea, los datos se cargarán solos por el useEffect de arriba.

  const handleIncrease = (item) => addToCart(item, 1);
  const handleDecrease = (item) => decreaseQuantity(item.id);

  // --- IR AL LOGIN ---
  const goToLogin = () => {
    navigate('/login'); // Redirige al login manteniendo el carrito en localStorage
  };

  // --- LOGICA DE COMPRA ---
  const handleFinalizePurchase = async () => {
    if (!clientData.nombre || !clientData.telefono || !clientData.direccion || !clientData.email) {
        alert("Por favor completa todos los campos, incluyendo el email.");
        return;
    }

    setLoading(true);

    try {
      const newOrderData = {
        cliente: {
          nombre: clientData.nombre,
          telefono: clientData.telefono,
          direccion: clientData.direccion,
          email: clientData.email
        },
        productos: cart.map(item => ({
          id: item.id,
          nombre: item.nombre,
          cantidad: item.quantity,
          precio: item.precio
        })),
        total: totalPrice,
        metodoPago: clientData.metodoPago,
        estado: "pendiente",
        fecha: Timestamp.now(),
        userId: user ? user.uid : null
      };

      const newId = await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, "counters", "orders_counter");
        const counterSnap = await transaction.get(counterRef);

        let newCount = 1;
        if (counterSnap.exists()) {
          newCount = counterSnap.data().count + 1;
        }

        const customId = `PED-${newCount.toString().padStart(6, '0')}`;
        const orderRef = doc(db, "orders", customId);

        transaction.set(counterRef, { count: newCount });
        transaction.set(orderRef, newOrderData);

        return customId;
      });

      setOrderId(newId);
      setPurchasedItems([...cart]); 
      setPurchasedTotal(totalPrice);
      
      clearCart();
      setStep(3);
      window.scrollTo(0, 0);

    } catch (error) {
      console.error("Error al crear pedido:", error);
      alert("Hubo un error. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  // --- PDF ---
  const handleViewPDF = () => {
    const doc = new jsPDF();
    const safeOrderId = orderId || "---";

    doc.setFontSize(18);
    doc.setTextColor(234, 88, 12);
    doc.text("MUEBLERÍA JOSE", 14, 22);
    
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text("Comprobante de Pedido", 14, 30);
    
    doc.setFontSize(10);
    doc.text(`N° Pedido: ${safeOrderId}`, 14, 38);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 44);

    doc.text(`Cliente: ${clientData.nombre}`, 14, 55);
    doc.text(`Email: ${clientData.email}`, 14, 60);
    doc.text(`Dirección: ${clientData.direccion}`, 14, 65);

    const rows = purchasedItems.map(item => [
        item.nombre,
        item.quantity,
        formatPrice(item.precio),
        formatPrice(item.precio * item.quantity)
    ]);

    autoTable(doc, {
        startY: 75,
        head: [["Producto", "Cant.", "Precio", "Total"]],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [234, 88, 12] }
    });

    const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || 80;
    doc.setFontSize(12);
    doc.fontStyle = "bold";
    doc.text(`TOTAL PAGADO: ${formatPrice(purchasedTotal)}`, 14, finalY + 15);

    const pdfBlob = doc.output('bloburl');
    window.open(pdfBlob, '_blank');
  };


  // --- VISTAS ---

  if (cart.length === 0 && step === 1) {
    return (
      <div className="text-center py-20 min-h-[60vh] flex flex-col justify-center items-center">
        <i className="fas fa-shopping-basket text-6xl text-gray-200 mb-6"></i>
        <h2 className="font-display text-3xl font-semibold text-gray-800 mb-2">Tu carrito está vacío</h2>
        <Link to="/catalogo" className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-full font-bold transition shadow-lg mt-6">
            Ir al Catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 font-sans">
      
      {/* STEPPER */}
      <div className="flex justify-center items-center mb-12">
        <div className={`flex flex-col items-center ${step >= 1 ? 'text-orange-600' : 'text-gray-300'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 ${step >= 1 ? 'bg-orange-600 text-white' : 'bg-gray-200'}`}>1</div>
            <span className="text-sm font-bold">Carrito</span>
        </div>
        <div className={`w-16 h-1 mx-2 ${step >= 2 ? 'bg-orange-600' : 'bg-gray-200'}`}></div>
        <div className={`flex flex-col items-center ${step >= 2 ? 'text-orange-600' : 'text-gray-300'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 ${step >= 2 ? 'bg-orange-600 text-white' : 'bg-gray-200'}`}>2</div>
            <span className="text-sm font-bold">Datos</span>
        </div>
        <div className={`w-16 h-1 mx-2 ${step >= 3 ? 'bg-orange-600' : 'bg-gray-200'}`}></div>
        <div className={`flex flex-col items-center ${step >= 3 ? 'text-green-600' : 'text-gray-300'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 ${step >= 3 ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>3</div>
            <span className="text-sm font-bold">Recibo</span>
        </div>
      </div>

      {/* PASO 1: LISTADO */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 items-center">
                <div className="w-24 h-24 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                    <img src={fixImageURL(item.imagen)} alt={item.nombre} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{item.nombre}</h3>
                    <p className="text-orange-600 font-bold">{formatPrice(item.precio * item.quantity)}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => handleDecrease(item)} className="w-8 h-8 bg-gray-100 rounded-full">-</button>
                    <span className="font-bold">{item.quantity}</span>
                    <button onClick={() => handleIncrease(item)} className="w-8 h-8 bg-gray-100 rounded-full">+</button>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-red-500"><i className="fas fa-trash"></i></button>
              </div>
            ))}
          </div>

          <div className="h-fit bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
             <div className="flex justify-between items-center mb-6">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-extrabold text-orange-600">{formatPrice(totalPrice)}</span>
            </div>
            {/* Al dar click aquí vamos al paso 2, donde validaremos si hay usuario */}
            <button onClick={() => setStep(2)} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition">
                Continuar Compra
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: VALIDACIÓN DE LOGIN Y FORMULARIO */}
      {step === 2 && (
        <>
            {/* OPCIÓN A: NO HAY USUARIO -> MOSTRAR LOGIN REQUERIDO */}
            {!user ? (
                 <div className="max-w-md mx-auto bg-white p-10 rounded-2xl shadow-2xl text-center animate-fade-in border border-orange-100 mt-8">
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-600">
                        <i className="fas fa-lock text-3xl"></i>
                    </div>
                    <h2 className="font-display text-2xl font-semibold text-gray-800 mb-2">Inicia Sesión para Continuar</h2>
                    <p className="text-gray-500 mb-8">
                        Para asegurar tu pedido, necesitas una cuenta. <br/>
                        <b>Tus productos se guardarán automáticamente.</b>
                    </p>
                    
                    <button 
                        onClick={goToLogin}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition shadow-lg mb-4 flex items-center justify-center gap-2"
                    >
                        <i className="fas fa-sign-in-alt"></i> Ir al Login
                    </button>
                    
                    <button 
                        onClick={() => setStep(1)}
                        className="text-gray-500 hover:text-gray-700 text-sm font-semibold underline"
                    >
                        Volver al carrito
                    </button>
                </div>
            ) : (
            /* OPCIÓN B: SI HAY USUARIO -> MOSTRAR FORMULARIO */
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-gray-100 animate-fade-in">
                    
                    <div className="bg-blue-50 text-blue-800 p-3 mb-4 rounded border border-blue-200 text-sm flex items-center gap-2">
                        <i className="fas fa-user-check"></i>
                        <span>Datos autocompletados para <b>{user.email}</b></span>
                    </div>

                    <h2 className="font-display text-2xl font-semibold mb-6">Datos de Entrega</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold mb-1 text-gray-700">Email</label>
                            <input 
                                type="email" 
                                className="w-full border p-3 rounded-lg bg-gray-100 text-gray-600" 
                                value={clientData.email} 
                                readOnly 
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-1 text-gray-700">Nombre Completo</label>
                            <input type="text" placeholder="Nombre Completo" className="w-full border p-3 rounded-lg" value={clientData.nombre} onChange={e => setClientData({...clientData, nombre: e.target.value})} />
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-1 text-gray-700">Teléfono</label>
                            <input type="tel" placeholder="Teléfono" className="w-full border p-3 rounded-lg" value={clientData.telefono} onChange={e => setClientData({...clientData, telefono: e.target.value})} />
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-1 text-gray-700">Dirección</label>
                            <textarea placeholder="Dirección exacta" className="w-full border p-3 rounded-lg" value={clientData.direccion} onChange={e => setClientData({...clientData, direccion: e.target.value})}></textarea>
                        </div>
                        
                        <h3 className="font-bold mt-4">Método de Pago</h3>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" checked={clientData.metodoPago === 'Transferencia'} onChange={() => setClientData({...clientData, metodoPago: 'Transferencia'})} /> Transferencia
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" checked={clientData.metodoPago === 'Efectivo'} onChange={() => setClientData({...clientData, metodoPago: 'Efectivo'})} /> Efectivo
                            </label>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button onClick={() => setStep(1)} className="flex-1 py-3 text-gray-500 font-bold border rounded-xl hover:bg-gray-50">Volver</button>
                            <button 
                                onClick={handleFinalizePurchase} 
                                disabled={loading}
                                className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:bg-gray-400 flex justify-center"
                            >
                                {loading ? 'Procesando...' : 'Confirmar Compra'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
      )}

      {/* PASO 3: CONFIRMACIÓN */}
      {step === 3 && (
        <div className="max-w-2xl mx-auto bg-white p-10 rounded-2xl shadow-2xl border border-gray-100 text-center animate-fade-in-up">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-check text-4xl text-green-600"></i>
            </div>
            
            <h2 className="font-display text-3xl font-semibold text-gray-800">¡Pedido Exitoso!</h2>
            <p className="text-gray-500 mt-2">Tu orden <b>{orderId}</b> ha sido registrada.</p>
            
            <div className="mt-8 border-t border-b py-6 text-left">
                <h3 className="font-bold text-gray-700 mb-4">Resumen de Compra</h3>
                <ul className="space-y-2 mb-4">
                    {purchasedItems.map((item, index) => (
                        <li key={index} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.nombre}</span>
                            <span className="font-bold">{formatPrice(item.precio * item.quantity)}</span>
                        </li>
                    ))}
                </ul>
                <div className="flex justify-between text-xl font-extrabold text-orange-600 pt-2 border-t">
                    <span>Total</span>
                    <span>{formatPrice(purchasedTotal)}</span>
                </div>
            </div>

            <div className="mt-8 space-y-3">
                <button 
                    onClick={handleViewPDF}
                    className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition flex items-center justify-center gap-2"
                >
                    <i className="fas fa-eye"></i> Ver Comprobante (PDF)
                </button>
                
                <Link to="/" className="w-full block bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition">
                    Volver al Inicio
                </Link>
            </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;