import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import html2pdf from 'html2pdf.js';
// NUVEO: Importamos el SDK de Google Gemini
import { GoogleGenerativeAI } from '@google/generative-ai';

const Dashboard = () => {
  const [stats, setStats] = useState({ products: 0, orders: 0, users: 0, totalRevenue: 0 });
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [orderStatusData, setOrderStatusData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- NUEVOS ESTADOS PARA LA IA ---
  const [aiDiagnosis, setAiDiagnosis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState("");

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const prodSnap = await getDocs(collection(db, "muebles"));
        const products = prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const outOfStock = products.filter(p => p.stock === undefined || p.stock <= (p.stockMinimo ?? 5));
        outOfStock.sort((a, b) => (a.stock || 0) - (b.stock || 0));
        setLowStockProducts(outOfStock);

        const categoryCount = {};
        products.forEach(p => {
          const cat = p.categoria || p.category || 'Sin Categoría';
          categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });
        setCategoryData(Object.keys(categoryCount).map(key => ({
          name: key, cantidad: categoryCount[key]
        })));

        const orderSnap = await getDocs(collection(db, "orders"));
        const orders = orderSnap.docs.map(doc => doc.data());

        let totalRev = 0;
        const statusCount = {};
        
        orders.forEach(o => {
          totalRev += o.total || 0;
          const status = o.estado || 'desconocido';
          statusCount[status] = (statusCount[status] || 0) + 1;
        });

        setOrderStatusData(Object.keys(statusCount).map(key => ({
          name: key.charAt(0).toUpperCase() + key.slice(1), valor: statusCount[key]
        })));

        setStats({
          products: products.length,
          orders: orders.length,
          users: 5, // Puedes hacer esto dinámico luego consultando la colección de usuarios
          totalRevenue: totalRev
        });

      } catch (error) {
        console.error("Error Dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- NUEVA FUNCIÓN: Generar Diagnóstico con IA ---
  // --- NUEVA FUNCIÓN: Generar Diagnóstico con OpenRouter (Gemma 3) ---
  const handleGenerateAIDiagnosis = async () => {
    setIsAnalyzing(true);
    setAiError("");
    setAiDiagnosis("");

    try {
      // 1. Obtener la API Key de tu .env (¡Asegúrate de que sea la de OpenRouter!)
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY; 
      
      if (!apiKey) {
        throw new Error("No se encontró la API Key. Verifica tu archivo .env");
      }

      // 2. Crear el "Prompt"
      const prompt = `
        Eres un experto analista de e-commerce y asesor de negocios. Analiza los siguientes datos en tiempo real de mi tienda de muebles y dame un diagnóstico ejecutivo claro, profesional y directo (máximo 3 párrafos).
        
        DATOS ACTUALES:
        - Total de Productos en catálogo: ${stats.products}
        - Ventas Totales Acumuladas: $${stats.totalRevenue}
        - Total de Pedidos Realizados: ${stats.orders}
        - Desglose del Inventario por Categoría: ${categoryData.map(c => `${c.name} (${c.cantidad})`).join(', ')}
        - Estado actual de los Pedidos: ${orderStatusData.map(o => `${o.name} (${o.valor})`).join(', ')}
        - Productos con stock crítico o agotados: ${lowStockProducts.length > 0 ? lowStockProducts.map(p => `${p.nombre} (Stock: ${p.stock || 0})`).join(', ') : 'Ninguno. El stock está sano.'}

        Por favor, incluye:
        1. Un resumen breve del estado general de la tienda.
        2. Alertas importantes.
        3. Una sugerencia estratégica rápida.
        No uses formatos markdown complejos, usa guiones para las listas si es necesario.
      `;

      // 3. Llamar a OpenRouter mediante fetch
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          // OpenRouter recomienda enviar estos dos headers
          "HTTP-Referer": window.location.origin, 
          "X-Title": "Dashboard Muebleria", 
        },
        body: JSON.stringify({
          models: [
            "google/gemma-3-12b-it:free",          // Opción 1
            "google/gemma-2-9b-it:free",           // Opción 2 (Respaldo)
            "meta-llama/llama-3-8b-instruct:free"  // Opción 3 (Último respaldo)
          ],
          messages: [
            { role: "user", content: prompt }
          ]
        })
      });

      // 4. Manejar posibles errores de la petición
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Error al conectar con OpenRouter.");
      }

      // 5. Leer la respuesta
      const data = await response.json();
      const text = data.choices[0].message.content;
      
      setAiDiagnosis(text);

    } catch (error) {
      console.error("Error con la IA:", error);
      setAiError(error.message || "Ocurrió un error al contactar a la inteligencia artificial.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGeneratePDF = () => {
    setIsGenerating(true);
    window.scrollTo(0, 0);

    const element = document.getElementById('report-template-hidden');
    
    const opt = {
      margin:       0.5,
      filename:     `Reporte_Dashboard_${new Date().getTime()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, scrollY: 0, scrollX: 0 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).outputPdf('bloburl').then((pdfUrl) => {
      window.open(pdfUrl, '_blank');
      setIsGenerating(false);
    }).catch(err => {
      console.error("Error generando PDF:", err);
      setIsGenerating(false);
    });
  };

  if (loading) return (
    <div className="flex justify-center items-center h-screen text-gray-500">
      <i className="fas fa-spinner fa-spin text-3xl mr-3"></i> Cargando estadísticas...
    </div>
  );

  return (
    <div className="relative overflow-hidden">
      
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Panel de Control</h1>
            <p className="text-gray-500 text-sm mt-1">Métricas y Alertas</p>
          </div>
          <button 
            onClick={handleGeneratePDF}
            disabled={isGenerating}
            className={`px-5 py-2 rounded-lg font-bold transition flex items-center gap-2 text-white shadow-sm ${isGenerating ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {isGenerating ? <><i className="fas fa-spinner fa-spin"></i> Generando PDF...</> : <><i className="fas fa-file-pdf"></i> Generar Reporte PDF</>}
          </button>
        </div>

        {/* MÉTRICAS SUPERIORES */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-blue-500">
            <h3 className="text-gray-500 font-bold mb-1 text-sm">Total Productos</h3>
            <p className="text-3xl font-extrabold text-gray-800">{stats.products}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-green-500">
            <h3 className="text-gray-500 font-bold mb-1 text-sm">Ventas Totales</h3>
            <p className="text-3xl font-extrabold text-gray-800">${stats.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-purple-500">
            <h3 className="text-gray-500 font-bold mb-1 text-sm">Pedidos Totales</h3>
            <p className="text-3xl font-extrabold text-gray-800">{stats.orders}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-orange-500">
            <h3 className="text-gray-500 font-bold mb-1 text-sm">Usuarios</h3>
            <p className="text-3xl font-extrabold text-gray-800">{stats.users}</p>
          </div>
        </div>

        {/* NUEVA SECCIÓN: ASISTENTE DE IA */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl shadow-sm border border-indigo-100 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <i className="fas fa-robot text-8xl text-indigo-900"></i>
          </div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-start md:items-center mb-4 flex-col md:flex-row gap-4">
              <div>
                <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                  <i className="fas fa-sparkles text-yellow-500"></i> Diagnóstico Inteligente
                </h2>
                <p className="text-indigo-700 text-sm mt-1">Análisis de rendimiento y sugerencias basadas en datos actuales.</p>
              </div>
              <button 
                onClick={handleGenerateAIDiagnosis}
                disabled={isAnalyzing}
                className={`px-6 py-2 rounded-full font-bold transition flex items-center gap-2 text-white shadow-md ${isAnalyzing ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'}`}
              >
                {isAnalyzing ? <><i className="fas fa-circle-notch fa-spin"></i> Analizando datos...</> : <><i className="fas fa-magic"></i> Generar Diagnóstico</>}
              </button>
            </div>

            {aiError && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm border border-red-200 mt-4">
                <i className="fas fa-exclamation-circle mr-2"></i> {aiError}
              </div>
            )}

            {aiDiagnosis && (
              <div className="bg-white p-5 rounded-lg border border-indigo-100 shadow-sm mt-4">
                {/* Usamos whitespace-pre-wrap para que respete los saltos de línea de la respuesta de la IA */}
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                  {aiDiagnosis}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* GRÁFICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 mb-6">Inventario por Categoría</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none'}} />
                  <Bar dataKey="cantidad" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 mb-6">Estado de Pedidos</h2>
            <div className="h-72 w-full flex justify-center items-center">
              {orderStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="valor">
                      {orderStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none'}} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400">Sin datos</p>
              )}
            </div>
          </div>
        </div>

        {/* ALERTAS DE STOCK */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-100 bg-red-50 flex items-center gap-3">
            <i className="fas fa-exclamation-triangle text-red-500 text-xl"></i>
            <h2 className="text-xl font-bold text-red-700">Alertas de Stock (Crítico y Bajo)</h2>
          </div>

          <div className="p-0">
            {lowStockProducts.length === 0 ? (
              <div className="p-8 text-center text-green-600">
                <i className="fas fa-check-circle text-4xl mb-3"></i>
                <p className="font-bold">¡Todo en orden! No hay productos con stock bajo o agotados.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase">
                  <tr>
                    <th className="p-4">Producto</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4 text-center">Stock Actual</th>
                    <th className="p-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lowStockProducts.map(product => {
                    const currentStock = product.stock || 0;
                    const isOut = currentStock <= 0;
                    return (
                      <tr key={product.id} className="hover:bg-gray-50 transition">
                        <td className="p-4 font-bold text-gray-800">{product.nombre}</td>
                        <td className="p-4 text-sm text-gray-500">{product.categoria || product.category}</td>
                        <td className={`p-4 text-center font-bold text-lg ${isOut ? 'text-red-600' : 'text-yellow-600'}`}>
                          {currentStock}
                        </td>
                        <td className="p-4">
                          {isOut ? (
                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">AGOTADO</span>
                          ) : (
                            <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">STOCK BAJO</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* PLANTILLA OCULTA PARA EL PDF */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, overflow: 'hidden', zIndex: -100 }}>
        <div id="report-template-hidden" style={{ width: '800px', backgroundColor: '#ffffff', color: '#1f2937', padding: '2rem' }}>
          
          <div style={{ borderBottom: '2px solid #1f2937', paddingBottom: '1rem', marginBottom: '2rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#111827', margin: 0 }}>Reporte Gerencial</h1>
            <p style={{ color: '#6b7280', marginTop: '0.5rem', fontWeight: '500' }}>Generado el {new Date().toLocaleDateString()}</p>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', marginBottom: '1rem' }}>1. Resumen de Indicadores</h2>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '1rem', borderRadius: '0.5rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold', margin: 0 }}>Total Productos</p>
                <p style={{ fontSize: '1.5rem', fontWeight: '900', margin: 0 }}>{stats.products}</p>
              </div>
              <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '1rem', borderRadius: '0.5rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold', margin: 0 }}>Ventas Totales</p>
                <p style={{ fontSize: '1.5rem', fontWeight: '900', color: '#15803d', margin: 0 }}>${stats.totalRevenue.toLocaleString()}</p>
              </div>
              <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '1rem', borderRadius: '0.5rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold', margin: 0 }}>Total Pedidos</p>
                <p style={{ fontSize: '1.5rem', fontWeight: '900', margin: 0 }}>{stats.orders}</p>
              </div>
              <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '1rem', borderRadius: '0.5rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold', margin: 0 }}>Usuarios</p>
                <p style={{ fontSize: '1.5rem', fontWeight: '900', margin: 0 }}>{stats.users}</p>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', marginBottom: '1rem' }}>2. Analítica Visual</h2>
            <div className="flex gap-4">
              <div className="flex-1 flex flex-col items-center" style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', backgroundColor: '#f9fafb' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#4b5563', marginBottom: '0.5rem' }}>Inventario por Categoría</h3>
                <BarChart width={350} height={200} data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{fontSize: 10, fill: '#6b7280'}} axisLine={{stroke: '#e5e7eb'}} tickLine={false} />
                  <Bar dataKey="cantidad" fill="#3b82f6" isAnimationActive={false} />
                </BarChart>
              </div>

              <div className="flex-1 flex flex-col items-center" style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', backgroundColor: '#f9fafb' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#4b5563', marginBottom: '0.5rem' }}>Estado de Pedidos</h3>
                <PieChart width={350} height={200}>
                  <Pie data={orderStatusData} cx="50%" cy="50%" outerRadius={60} dataKey="valor" isAnimationActive={false}>
                    {orderStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Legend wrapperStyle={{fontSize: '10px'}} />
                </PieChart>
              </div>
            </div>
          </div>

          {/* ... (el resto del PDF permanece igual) ... */}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;