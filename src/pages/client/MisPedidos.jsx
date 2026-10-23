import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';

// --- IMPORTACIONES PARA PDF ---
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const MisPedidos = () => {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Función auxiliar para formatear precio
  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(price);
  };

  useEffect(() => {
    const fetchPedidos = async () => {
      if (!user || !user.email) {
        setLoading(false);
        return;
      }

      try {
        const ordersRef = collection(db, "orders");
        // Consulta filtrando por el email dentro del objeto cliente
        const q = query(
            ordersRef, 
            where("cliente.email", "==", user.email)
        );

        const querySnapshot = await getDocs(q);
        
        const docs = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Ordenamiento local (más reciente primero)
        docs.sort((a, b) => {
            const dateA = a.fecha?.seconds || 0;
            const dateB = b.fecha?.seconds || 0;
            return dateB - dateA; 
        });

        setPedidos(docs);

      } catch (error) {
        console.error("Error cargando pedidos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
  }, [user]);

  // --- LOGICA DEL PDF ---
  const handleDownloadPDF = (pedido) => {
    const doc = new jsPDF();

    // 1. Encabezado
    doc.setFontSize(18);
    doc.setTextColor(234, 88, 12); // Naranja
    doc.text("MUEBLERÍA JOSE", 14, 22);
    
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text("Recibo de Compra", 14, 30);
    
    // 2. Datos del Pedido
    const fecha = pedido.fecha?.seconds 
        ? new Date(pedido.fecha.seconds * 1000).toLocaleDateString() 
        : new Date().toLocaleDateString();

    doc.setFontSize(10);
    doc.text(`N° Pedido: ${pedido.id}`, 14, 38);
    doc.text(`Fecha: ${fecha}`, 14, 44);
    doc.text(`Estado: ${pedido.estado || 'Pendiente'}`, 14, 50);

    // 3. Datos del Cliente
    doc.text(`Cliente: ${pedido.cliente?.nombre || '---'}`, 14, 60);
    doc.text(`Email: ${pedido.cliente?.email || user.email}`, 14, 65);
    doc.text(`Dirección: ${pedido.cliente?.direccion || '---'}`, 14, 70);

    // 4. Tabla de Productos
    // Normalizamos los productos (por si usaste 'items' o 'productos')
    const items = pedido.productos || pedido.items || [];

    const rows = items.map(item => [
        item.nombre,
        item.cantidad, // Asegúrate de que en BD se guarde como 'cantidad' o 'quantity'
        formatPrice(item.precio),
        formatPrice(item.precio * item.cantidad)
    ]);

    autoTable(doc, {
        startY: 80,
        head: [["Producto", "Cant.", "Precio Unit.", "Subtotal"]],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [234, 88, 12] }
    });

    // 5. Total
    const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || 90;
    doc.setFontSize(12);
    doc.fontStyle = "bold";
    doc.text(`TOTAL PAGADO: ${formatPrice(pedido.total)}`, 14, finalY + 15);

    // 6. Abrir PDF
    const pdfBlob = doc.output('bloburl');
    window.open(pdfBlob, '_blank');
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 fade-in">
      <h1 className="font-display text-3xl font-semibold text-gray-800 mb-6 flex items-center gap-3">
        <i className="fas fa-box-open text-orange-600"></i> Mis Pedidos
      </h1>

      {pedidos.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-gray-200">
            <i className="fas fa-shopping-basket text-6xl text-gray-300 mb-4"></i>
            <p className="text-xl text-gray-500 mb-6">No encontramos pedidos para: <b>{user?.email}</b></p>
            <Link to="/catalogo" className="bg-orange-600 text-white px-6 py-2 rounded-full hover:bg-orange-700 transition">
                Ir al Catálogo
            </Link>
        </div>
      ) : (
        <div className="space-y-6">
            {pedidos.map(pedido => (
                <div key={pedido.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition">
                    
                    {/* Encabezado del Pedido */}
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Pedido</p>
                            <p className="font-mono font-bold text-gray-800 text-lg">#{pedido.id.slice(0, 10)}...</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Fecha</p>
                            <p className="text-sm font-medium text-gray-700">
                                {pedido.fecha?.seconds 
                                    ? new Date(pedido.fecha.seconds * 1000).toLocaleDateString() 
                                    : 'Sin fecha'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Total</p>
                            <p className="text-xl font-bold text-orange-600">
                                {pedido.total ? formatPrice(pedido.total) : '$0.00'}
                            </p>
                        </div>
                        
                        {/* --- BOTÓN NUEVO PARA PDF --- */}
                        <button 
                            onClick={() => handleDownloadPDF(pedido)}
                            className="flex items-center gap-2 bg-white border border-orange-600 text-orange-600 px-4 py-2 rounded-lg hover:bg-orange-50 transition text-sm font-bold"
                        >
                            <i className="fas fa-file-pdf"></i> Ver Recibo
                        </button>
                    </div>

                    {/* Lista de Productos */}
                    <div className="p-6">
                        <div className="space-y-3">
                            {(pedido.productos || pedido.items || []).map((item, index) => (
                                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 text-xs font-bold">
                                            {item.cantidad}x
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm md:text-base">
                                                {item.nombre || "Producto"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="font-medium text-gray-600">
                                        {item.precio ? formatPrice(item.precio * item.cantidad) : '-'}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col md:flex-row justify-between text-sm text-gray-500 gap-2">
                            <span>Estado: <span className={`font-bold uppercase ${
                                pedido.estado === 'entregado' ? 'text-green-600' : 'text-yellow-600'
                            }`}>{pedido.estado || 'Pendiente'}</span></span>
                            <span>Pago: <span className="font-medium text-gray-700">{pedido.metodoPago || "Transferencia"}</span></span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default MisPedidos;