import React, { useState } from 'react';

const Ayuda = () => {
  // Simulacion de acordeon FAQ
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    { question: "¿Cuánto tardan los envíos?", answer: "Los envíos dentro de la ciudad tardan de 24 a 48 horas. Para provincias, de 3 a 5 días hábiles." },
    { question: "¿Puedo devolver un producto?", answer: "Sí, tienes 7 días hábiles para devoluciones siempre que el producto esté en su empaque original." },
    { question: "¿Qué métodos de pago aceptan?", answer: "Aceptamos tarjetas de crédito, débito, transferencias bancarias y pago contra entrega." },
    { question: "¿Hacen muebles a medida?", answer: "Sí, contamos con un servicio de personalización. Contáctanos para una cotización." },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-gray-800 mb-8 text-center">Centro de Ayuda</h1>

      {/* Grid de opciones rápidas */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="bg-blue-50 p-6 rounded-xl text-center hover:shadow-md transition cursor-pointer">
            <i className="fas fa-truck text-4xl text-blue-500 mb-4"></i>
            <h3 className="font-bold text-gray-800">Estado del Envío</h3>
            <p className="text-sm text-gray-600">Consulta dónde está tu paquete</p>
        </div>
        <div className="bg-orange-50 p-6 rounded-xl text-center hover:shadow-md transition cursor-pointer">
            <i className="fas fa-undo text-4xl text-orange-500 mb-4"></i>
            <h3 className="font-bold text-gray-800">Devoluciones</h3>
            <p className="text-sm text-gray-600">Política de cambios</p>
        </div>
        <div className="bg-green-50 p-6 rounded-xl text-center hover:shadow-md transition cursor-pointer">
            <i className="fas fa-comments text-4xl text-green-500 mb-4"></i>
            <h3 className="font-bold text-gray-800">Chat en Vivo</h3>
            <p className="text-sm text-gray-600">Habla con un asesor</p>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-12">
        <div className="p-6 border-b border-gray-100">
            <h2 className="font-display text-xl font-semibold text-gray-800">Preguntas Frecuentes</h2>
        </div>
        {faqs.map((faq, index) => (
            <div key={index} className="border-b border-gray-100 last:border-0">
                <button 
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full text-left px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition focus:outline-none"
                >
                    <span className="font-bold text-gray-700">{faq.question}</span>
                    <i className={`fas fa-chevron-down text-gray-400 transition-transform ${openIndex === index ? 'rotate-180' : ''}`}></i>
                </button>
                {openIndex === index && (
                    <div className="px-6 pb-4 text-gray-600 text-sm animate-fade-in-down">
                        {faq.answer}
                    </div>
                )}
            </div>
        ))}
      </div>

      {/* Formulario de Contacto Rápido */}
      <div className="bg-gray-900 text-white rounded-xl p-8 md:p-12">
          <h2 className="font-display text-2xl font-semibold mb-4">¿Aún necesitas ayuda?</h2>
          <p className="text-gray-400 mb-6">Envíanos un mensaje y te responderemos en breve.</p>
          <form className="space-y-4">
              <input type="email" placeholder="Tu correo" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 text-white" />
              <textarea placeholder="¿En qué podemos ayudarte?" rows="4" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 text-white"></textarea>
              <button className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-lg transition w-full md:w-auto">
                  Enviar Mensaje
              </button>
          </form>
      </div>

    </div>
  );
};

export default Ayuda;