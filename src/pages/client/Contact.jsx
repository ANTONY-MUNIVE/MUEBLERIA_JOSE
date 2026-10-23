import { redesVisibles, tipoRed } from '../../config/redes';
import { enlaceWhatsApp } from '../../hooks/useInfoEmpresa';
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { fixImageURL } from '../../utils/images';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';

// Configuración visual del mapa
const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.75rem' 
};

const Contact = () => {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nombre: '', email: '', mensaje: '' });
  const [sending, setSending] = useState(false);

  // Estados para las rutas
  const [routeResponse, setRouteResponse] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  // Cargamos el script de la API de Google
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyBIZrptkE0IGakPhzMzMpq4PaW_gw_D1vk" 
  });

  // Lógica para cargar la info de Firebase
  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const docRef = doc(db, "content", "about");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setInfo(docSnap.data());
        } else {
           setInfo({
             titulo: 'Sobre Nosotros',
             historia: 'Aquí va la historia de tu empresa...',
             direccion: 'Dirección de la tienda',
             telefono: '+51 999 999 999',
             email: 'contacto@tienda.com',
             horario: 'Lun - Vie: 9am - 6pm'
           });
        }
      } catch (error) {
        console.error("Error cargando info:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, []);

  // Lógica para enviar el formulario a Firebase
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
        await addDoc(collection(db, "messages"), {
            ...form,
            fecha: serverTimestamp(),
            leido: false
        });
        alert("¡Mensaje enviado con éxito! Nos pondremos en contacto pronto.");
        setForm({ nombre: '', email: '', mensaje: '' });
    } catch (error) {
        console.error(error);
        alert("Error al enviar el mensaje.");
    } finally {
        setSending(false);
    }
  };

  // Coordenadas de la tienda (Destino) - Si no hay en Firebase, usa Lima Centro
  const storeLocation = {
    lat: parseFloat(info?.lat) || -12.046374,
    lng: parseFloat(info?.lng) || -77.042793
  };

  // Función para calcular la ruta al hacer clic en el mapa
  const handleMapClick = async (event) => {
    if (!window.google) return;

    const originLocation = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
    };

    const directionsService = new window.google.maps.DirectionsService();
    const geocoder = new window.google.maps.Geocoder();

    try {
        let addressText = "Dirección seleccionada";
        const geoResult = await geocoder.geocode({ location: originLocation });
        if (geoResult.results[0]) {
            addressText = geoResult.results[0].formatted_address;
        }

        const result = await directionsService.route({
            origin: originLocation,
            destination: storeLocation,
            travelMode: window.google.maps.TravelMode.DRIVING,
        });

        setRouteResponse(result);

        const routeData = result.routes[0].legs[0];
        setRouteInfo({
            address: addressText,
            distance: routeData.distance.text,
            duration: routeData.duration.text
        });

    } catch (error) {
        console.error("Error calculando la ruta: ", error);
        alert("No pudimos calcular una ruta en auto desde ese punto exacto. Intenta con un lugar más cercano a una calle principal.");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Cargando...</div>;

  return (
    <div className="bg-gray-50 min-h-screen pb-20 font-sans">
      
      {/* CABECERA */}
      <div className="bg-gray-900 text-white py-20 px-6 text-center">
        <h1 className="font-display text-4xl md:text-5xl font-semibold mb-4">{info?.titulo}</h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Conoce más sobre nuestra pasión por los muebles y cómo encontrarnos.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-10">
        
        {/* SECCIÓN 1: HISTORIA Y FOTO */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row mb-12 animate-fadeInUp">
            <div className="md:w-1/2 h-64 md:h-auto relative bg-gray-200">
                <img 
                    src={info?.imagen ? fixImageURL(info.imagen) : 'https://via.placeholder.com/800x600?text=Nosotros'} 
                    alt="Nosotros" 
                    className="w-full h-full object-cover"
                />
            </div>
            <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                <h2 className="font-display text-2xl font-semibold text-gray-800 mb-6 border-b pb-4">Nuestra Historia</h2>
                <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-line">
                    {info?.historia || 'Agrega tu historia desde el panel de administrador.'}
                </p>
            </div>
        </div>

        {/* SECCIÓN 2: TARJETAS DE CONTACTO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            
            {/* Dirección */}
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition border border-gray-100 text-center group">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl group-hover:bg-blue-600 group-hover:text-white transition">
                    <i className="fas fa-map-marker-alt"></i>
                </div>
                <h3 className="font-bold text-xl mb-2 text-gray-800">Visítanos</h3>
                <p className="text-gray-500 mb-2">{info?.direccion}</p>
                <p className="text-sm font-bold text-blue-600 bg-blue-50 py-1 px-3 rounded-full inline-block">
                    {info?.horario}
                </p>
            </div>

            {/* Teléfono */}
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition border border-gray-100 text-center group">
                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl group-hover:bg-green-600 group-hover:text-white transition">
                    <i className="fas fa-phone"></i>
                </div>
                <h3 className="font-bold text-xl mb-2 text-gray-800">Llámanos</h3>
                <p className="text-gray-500 mb-4">{info?.telefono}</p>
                <a 
                    href={enlaceWhatsApp(info?.telefono) || '#'} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-green-600 font-bold hover:underline"
                >
                    Chat en WhatsApp <i className="fas fa-arrow-right text-xs ml-1"></i>
                </a>
            </div>

            {/* Email */}
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition border border-gray-100 text-center group">
                <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl group-hover:bg-purple-600 group-hover:text-white transition">
                    <i className="fas fa-envelope"></i>
                </div>
                <h3 className="font-bold text-xl mb-2 text-gray-800">Escríbenos</h3>
                <p className="text-gray-500 mb-4">{info?.email}</p>
                <a href={`mailto:${info?.email}`} className="text-purple-600 font-bold hover:underline">
                    Enviar Correo <i className="fas fa-arrow-right text-xs ml-1"></i>
                </a>
            </div>
        </div>

        {/* REDES SOCIALES (Admin › Info de la empresa) */}
        {redesVisibles(info || {}).length > 0 && (
            <div className="bg-white rounded-3xl p-6 md:p-8 mb-16 flex flex-col md:flex-row md:items-center gap-5">
                <div className="md:mr-auto">
                    <h2 className="font-display text-2xl font-semibold">Síguenos</h2>
                    <p className="text-cafe">Novedades, ofertas y muebles recién terminados.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {redesVisibles(info || {}).map((r) => {
                        const t = tipoRed(r.red);
                        return (
                            <a key={r.id || r.red} href={r.url} target="_blank" rel="noreferrer" className="h-11 px-4 rounded-full bg-espresso text-hueso font-bold inline-flex items-center gap-2 hover:bg-terracota hover:text-espresso transition">
                                <i className={t.icono}></i>{t.label}
                            </a>
                        );
                    })}
                </div>
            </div>
        )}

        {/* SECCIÓN 3: MAPA DE GOOGLE (AHORA CON RUTAS) */}
        <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100 mb-16 animate-fadeInUp">
            
            <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg mb-4 text-center font-medium border border-blue-100">
                <i className="fas fa-location-arrow mr-2"></i>
                Haz clic en cualquier parte del mapa para calcular la ruta más rápida hacia nuestra tienda.
            </div>

            {isLoaded ? (
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={storeLocation}
                    zoom={15}
                    onClick={handleMapClick}
                >
                    {!routeResponse && <Marker position={storeLocation} />}
                    
                    {routeResponse && (
                        <DirectionsRenderer 
                            directions={routeResponse} 
                            options={{ suppressMarkers: false }}
                        />
                    )}
                </GoogleMap>
            ) : (
                <div className="w-full h-[400px] bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400">
                    Cargando mapa interactivo...
                </div>
            )}

            {/* Tarjeta de Información de Ruta */}
            {routeInfo && (
                <div className="mt-4 bg-gray-900 text-white p-6 rounded-xl shadow-md flex flex-col md:flex-row justify-between items-center gap-4 animate-fadeInUp">
                    <div className="flex-1">
                        <span className="text-gray-400 text-sm font-bold block mb-1">📍 Origen seleccionado:</span>
                        <span className="font-medium">{routeInfo.address}</span>
                    </div>
                    
                    <div className="flex gap-6 border-t md:border-t-0 md:border-l border-gray-700 pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
                        <div>
                            <span className="text-gray-400 text-sm font-bold block mb-1">🚗 Distancia:</span>
                            <span className="text-xl font-bold text-blue-400">{routeInfo.distance}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 text-sm font-bold block mb-1">⏱️ Tiempo (Auto):</span>
                            <span className="text-xl font-bold text-green-400">{routeInfo.duration}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* SECCIÓN 4: FORMULARIO VISUAL */}
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 max-w-4xl mx-auto border border-gray-100">
            <h2 className="font-display text-3xl font-semibold text-center text-gray-800 mb-2">¿Tienes alguna duda?</h2>
            <p className="text-center text-gray-500 mb-8">Envíanos un mensaje y te responderemos pronto.</p>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Nombre</label>
                        <input 
                            required
                            type="text" 
                            value={form.nombre}
                            onChange={(e) => setForm({...form, nombre: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-gray-800 outline-none transition" 
                            placeholder="Tu nombre" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Correo</label>
                        <input 
                            required
                            type="email" 
                            value={form.email}
                            onChange={(e) => setForm({...form, email: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-gray-800 outline-none transition" 
                            placeholder="tu@correo.com" 
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Mensaje</label>
                    <textarea 
                        required
                        value={form.mensaje}
                        onChange={(e) => setForm({...form, mensaje: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg h-32 resize-none focus:ring-2 focus:ring-gray-800 outline-none transition" 
                        placeholder="¿En qué podemos ayudarte?" 
                    ></textarea>
                </div>
                <button 
                    type="submit" 
                    disabled={sending}
                    className="w-full bg-gray-900 text-white font-bold py-4 rounded-lg hover:bg-gray-800 transition shadow-lg transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {sending ? 'Enviando...' : 'Enviar Mensaje'}
                </button>
            </form>
        </div>

      </div>
    </div>
  );
};

export default Contact;