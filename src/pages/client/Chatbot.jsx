import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import pepeGrilloGif from '../../assets/pinocho-07.gif';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [productos, setProductos] = useState([]);
  
  // Ref para hacer auto-scroll al último mensaje
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    { role: "assistant", content: "¡Hola! Soy el asistente virtual de Mueblería Jose 🛋️. ¿Qué tipo de mueble estás buscando hoy?" }
  ]);

  // Cargar productos de Firebase
  useEffect(() => {
    const fetchProductosParaBot = async () => {
      try {
        const prodsSnapshot = await getDocs(collection(db, "muebles"));
        const prodsList = prodsSnapshot.docs.map(doc => doc.data());
        setProductos(prodsList);
      } catch (error) {
        console.error("El bot no pudo cargar el catálogo:", error);
      }
    };
    fetchProductosParaBot();
  }, []);

  // Auto-scroll hacia abajo cada vez que hay un nuevo mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    const newConversation = [...messages, userMessage];
    setMessages(newConversation);
    setInput("");
    setIsTyping(true);

    try {
      const catalogoTexto = productos && productos.length > 0 
        ? productos.map(p => `[Mueble: ${p.nombre} | Precio: S/. ${p.precio}]`).join('\n')
        : "Actualmente estamos actualizando nuestro catálogo.";

      const reglasOcultas = `[INSTRUCCIONES: Eres el vendedor de Mueblería Jose. Amable, persuasivo y muy breve. VENDES ESTO: ${catalogoTexto}. NUNCA inventes productos.]\n\nEl cliente dice: `;
      const historialLimpio = newConversation.filter((msg, index) => index !== 0);
      
      const mensajesParaLaAPI = historialLimpio.map((msg, index) => {
        if (index === historialLimpio.length - 1 && msg.role === "user") {
          return { role: "user", content: reglasOcultas + msg.content };
        }
        return msg;
      });

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "Chatbot Muebleria",
        },
        body: JSON.stringify({
          model: "google/gemma-3-12b-it:free",
          messages: mensajesParaLaAPI 
        })
      });

      if (!response.ok) throw new Error("Error al conectar");
      
      const data = await response.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.choices[0].message.content }]);

    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: "Uy, mi sistema está un poco lento. 😅 ¿Me lo repites?" }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[55] flex flex-col items-end">
      
      {/* VENTANA DEL CHAT */}
      {isOpen && (
        <div className="mb-4 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 transition-all transform origin-bottom-right scale-100 opacity-100">
          
          {/* Header con Degradado */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 flex justify-between items-center text-white shadow-md relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-inner">
                <span className="text-xl">🤖</span>
              </div>
              <div>
                <h3 className="font-bold text-sm">Asistente Virtual</h3>
                <p className="text-xs text-blue-200 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> En línea
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          {/* Área de Mensajes */}
          <div className="flex-1 h-96 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
                  msg.role === "user" 
                    ? "bg-blue-600 text-white rounded-br-none" 
                    : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {/* Animación de "Escribiendo" moderna */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 text-gray-500 p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} /> {/* Ancla para el auto-scroll */}
          </div>

          {/* Área de Input */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu mensaje..."
              disabled={isTyping}
              className="flex-1 bg-gray-100 text-sm px-4 py-3 rounded-full outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
            />
            <button 
              type="submit" 
              disabled={isTyping || !input.trim()} 
              className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
            </button>
          </form>
        </div>
      )}

      {/* BOTÓN FLOTANTE ANIMADO */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="relative group bg-blue-600 text-white w-16 h-16 rounded-full flex justify-center items-center shadow-2xl hover:bg-blue-700 hover:scale-110 transition-all duration-300"
        >
          {/* Anillo de pulso (para llamar la atención) */}
          <span className="absolute w-full h-full bg-blue-500 rounded-full opacity-50 animate-ping"></span>
          
          {/* Ícono de Chat */}
          {/* === USAMOS TU GIF LOCAL === */}
          <img 
            src={pepeGrilloGif} 
            alt="Pepe Grillo Asistente"
            className="w-full h-full rounded-full object-cover relative z-10 border-2 border-blue-600 bg-white"
          />
          
          {/* Tooltip (Aparece al pasar el mouse) */}
          <span className="absolute right-20 bg-gray-900 text-white text-sm font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
            ¿Necesitas ayuda?
            <div className="absolute top-1/2 -right-1 w-2 h-2 bg-gray-900 rotate-45 transform -translate-y-1/2"></div>
          </span>
        </button>
      )}
    </div>
  );
}