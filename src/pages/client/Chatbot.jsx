import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import pepeGrilloGif from '../../assets/pinocho-07.gif';
import { consultarIA, iaConfigurada } from '../../services/iaService';

// Asistente de la tienda (fuera del alcance de la medición de la tesis).
// Las consultas pasan por el intermediario de Vercel (proxy-ia) con NVIDIA Nemotron.

const SALUDO = { role: 'assistant', content: '¡Hola! Soy el asistente de Mueblería Jose. ¿Qué mueble estás buscando hoy?' };
const SUGERENCIAS = ['Busco un ropero', 'Juegos de comedor', '¿Fabrican a medida?', '¿Dónde están ubicados?'];

// Los modelos a veces usan **negritas** de markdown: se quitan los asteriscos
const limpiar = (t) => String(t || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/^\s*[*-]\s+/gm, '• ').trim();

const textoCatalogo = (productos) => (productos.length
  ? productos.slice(0, 300).map((p) => {
      const sinDato = p.stock === undefined || p.stock === null || p.stock === '';
      const stock = sinDato ? '' : Number(p.stock) > 0 ? ' | En tienda' : ' | Agotado (se puede pedir a medida)';
      return `- ${p.nombre}${p.categoria ? ` (${p.categoria})` : ''} | S/ ${p.precio}${stock}`;
    }).join('\n')
  : 'El catálogo se está actualizando.');

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [productos, setProductos] = useState([]);
  const [messages, setMessages] = useState([SALUDO]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const disponible = iaConfigurada();

  useEffect(() => {
    getDocs(collection(db, 'muebles'))
      .then((snap) => setProductos(snap.docs.map((d) => d.data())))
      .catch((error) => console.error('El asistente no pudo cargar el catálogo:', error));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isTyping, isOpen]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 80);
  }, [isOpen]);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  const enviar = async (texto, base = messages) => {
    const contenido = texto.trim();
    if (!contenido || isTyping) return;

    const conversacion = [...base.filter((m) => m.role !== 'error'), { role: 'user', content: contenido }];
    setMessages(conversacion);
    setInput('');
    setIsTyping(true);

    try {
      const sistema = {
        role: 'system',
        content: `Eres el asistente de ventas de Mueblería Jose, una mueblería de Huancayo (Perú).
Responde siempre en español, de forma amable y breve (máximo 4 oraciones), sin usar markdown.
Solo recomienda muebles de este catálogo, con su precio en soles; nunca inventes productos ni precios.
Si algo no está en el catálogo, ofrece fabricarlo a medida y sugiere escribir por WhatsApp desde la página «Nosotros».
No pidas datos personales (DNI, dirección, tarjetas).

CATÁLOGO:
${textoCatalogo(productos)}`,
      };
      // Sin el saludo inicial y solo los últimos 10 mensajes
      const historial = conversacion.slice(1).slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const respuesta = await consultarIA([sistema, ...historial], { tarea: 'chat' });
      setMessages((prev) => [...prev, { role: 'assistant', content: limpiar(respuesta) }]);
    } catch (error) {
      console.error('Asistente:', error);
      setMessages((prev) => [...prev, {
        role: 'error',
        content: disponible ? error.message : 'El asistente no está disponible en este momento. Escríbenos por WhatsApp desde la página «Nosotros».',
        reintento: contenido,
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const reintentar = (msg) => {
    // Se quita el último mensaje del cliente y el error, y se vuelve a enviar
    const sinError = messages.filter((m) => m !== msg);
    const base = sinError[sinError.length - 1]?.role === 'user' ? sinError.slice(0, -1) : sinError;
    enviar(msg.reintento, base);
  };

  const reiniciar = () => { setMessages([SALUDO]); setInput(''); };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[55] flex flex-col items-end">
      {isOpen && (
        <section
          role="dialog"
          aria-label="Asistente de Mueblería Jose"
          className="mb-3 w-[calc(100vw-2rem)] sm:w-[380px] h-[min(600px,calc(100dvh-7.5rem))] bg-hueso rounded-3xl shadow-[0_20px_50px_-12px_rgba(36,26,20,0.45)] flex flex-col overflow-hidden border border-linea origin-bottom-right animate-aparecer"
        >
          {/* Cabecera */}
          <header className="bg-espresso text-hueso px-4 py-3 flex items-center gap-3 shrink-0">
            <img src={pepeGrilloGif} alt="" className="w-11 h-11 rounded-full object-cover bg-white border-2 border-terracota" />
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-lg font-semibold leading-tight">Asistente Jose</h2>
              <p className="text-xs text-piedra flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${disponible ? 'bg-green-400' : 'bg-piedra'}`}></span>
                {disponible ? 'Te ayuda a elegir tu mueble' : 'No disponible por ahora'}
              </p>
            </div>
            <button type="button" onClick={reiniciar} className="w-10 h-10 rounded-full hover:bg-espresso-2 transition" aria-label="Empezar de nuevo" title="Empezar de nuevo">
              <i className="fas fa-redo-alt text-sm"></i>
            </button>
            <button type="button" onClick={() => setIsOpen(false)} className="w-10 h-10 rounded-full hover:bg-espresso-2 transition" aria-label="Cerrar asistente">
              <i className="fas fa-times"></i>
            </button>
          </header>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto sin-barra px-4 py-4 flex flex-col gap-3" aria-live="polite">
            {messages.map((msg, index) => {
              if (msg.role === 'error') {
                return (
                  <div key={index} className="self-start max-w-[88%] bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-2xl rounded-bl-md text-sm animate-fade-in-up">
                    <p><i className="fas fa-exclamation-circle mr-1.5"></i>{msg.content}</p>
                    {disponible && msg.reintento && (
                      <button type="button" onClick={() => reintentar(msg)} className="mt-2 h-9 px-4 rounded-full bg-white border border-red-200 font-extrabold text-xs hover:bg-red-100 transition">
                        <i className="fas fa-redo-alt mr-1.5"></i>Reintentar
                      </button>
                    )}
                  </div>
                );
              }
              const esCliente = msg.role === 'user';
              return (
                <div
                  key={index}
                  className={`max-w-[85%] px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-line animate-fade-in-up ${esCliente
                    ? 'self-end bg-terracota text-espresso rounded-2xl rounded-br-md font-semibold'
                    : 'self-start bg-white text-espresso rounded-2xl rounded-bl-md shadow-[0_1px_2px_rgba(36,26,20,0.08)]'}`}
                >
                  {msg.content}
                </div>
              );
            })}

            {/* Sugerencias para empezar */}
            {messages.length === 1 && !isTyping && (
              <div className="flex flex-wrap gap-2 mt-1">
                {SUGERENCIAS.map((s) => (
                  <button key={s} type="button" onClick={() => enviar(s)} className="h-9 px-3.5 rounded-full border border-terracota/60 bg-white text-sm font-bold hover:bg-terracota transition">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {isTyping && (
              <div className="self-start bg-white px-4 py-3.5 rounded-2xl rounded-bl-md shadow-[0_1px_2px_rgba(36,26,20,0.08)] flex items-center gap-1.5" aria-label="Escribiendo">
                <span className="w-2 h-2 bg-piedra rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-piedra rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                <span className="w-2 h-2 bg-piedra rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Escribir */}
          <form onSubmit={(e) => { e.preventDefault(); enviar(input); }} className="p-3 bg-white border-t border-linea flex items-center gap-2 shrink-0">
            <label htmlFor="chat-mensaje" className="sr-only">Escribe tu mensaje</label>
            <input
              ref={inputRef}
              id="chat-mensaje"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu mensaje..."
              maxLength={500}
              autoComplete="off"
              className="flex-1 min-w-0 h-11 px-4 rounded-full bg-hueso border border-linea outline-none focus:border-terracota focus:ring-4 focus:ring-terracota/25 transition"
            />
            <button
              type="submit"
              disabled={isTyping || !input.trim()}
              className="w-11 h-11 shrink-0 rounded-full bg-terracota text-espresso flex items-center justify-center hover:bg-terracota-claro transition disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Enviar"
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
          <p className="bg-white text-[11px] text-cafe text-center pb-2 -mt-1 shrink-0">Respuestas orientativas: confirma precio y stock en tienda.</p>
        </section>
      )}

      {/* Botón flotante */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="relative group w-16 h-16 rounded-full flex justify-center items-center shadow-[0_8px_24px_-6px_rgba(36,26,20,0.5)] hover:scale-105 transition-transform duration-300"
          aria-label="Abrir el asistente de Mueblería Jose"
        >
          <span className="absolute inset-0 rounded-full bg-terracota opacity-40 animate-ping"></span>
          <img src={pepeGrilloGif} alt="" className="w-full h-full rounded-full object-cover relative z-10 border-[3px] border-terracota bg-white" />
          <span className="pointer-events-none absolute right-20 bg-espresso text-hueso text-sm font-bold px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
            ¿Te ayudo a elegir?
          </span>
        </button>
      )}
    </div>
  );
}
