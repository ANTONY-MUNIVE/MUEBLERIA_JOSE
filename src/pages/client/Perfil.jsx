import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const Perfil = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
    ciudad: ''
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Cargar datos actuales
  useEffect(() => {
    if (user) {
        const fetchUserData = async () => {
            try {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setFormData({ ...docSnap.data() });
                }
            } catch (error) {
                console.error("Error al cargar perfil:", error);
            }
        };
        fetchUserData();
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    
    try {
        const docRef = doc(db, "users", user.uid);
        // Actualizamos en Firestore
        await updateDoc(docRef, {
            nombre: formData.nombre || "",
            telefono: formData.telefono || "",
            direccion: formData.direccion || "",
            ciudad: formData.ciudad || ""
        });
        setMsg("success");
    } catch (error) {
        console.error("Error al actualizar:", error);
        setMsg("error");
    } finally {
        setLoading(false);
        // Borrar mensaje a los 3 seg
        setTimeout(() => setMsg(""), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 fade-in">
      <h1 className="font-display text-3xl font-semibold text-gray-800 mb-8 flex items-center gap-3">
        <i className="fas fa-user-circle text-orange-600"></i> Mi Cuenta
      </h1>

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Tarjeta Izquierda: Avatar y Email (No editable) */}
        <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
                <div className="w-24 h-24 bg-gray-900 text-white rounded-full flex items-center justify-center text-4xl font-bold mx-auto mb-4">
                    {user?.email?.charAt(0).toUpperCase()}
                </div>
                <h2 className="font-display font-semibold text-gray-800 text-lg break-words">{user?.displayName || "Usuario"}</h2>
                <p className="text-gray-500 text-sm mb-4">{user?.email}</p>
                <div className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full uppercase">
                    Cliente
                </div>
            </div>
        </div>

        {/* Tarjeta Derecha: Formulario Editable */}
        <div className="md:col-span-2">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-2">Información Personal</h3>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Nombre Completo</label>
                            <input 
                                type="text" 
                                name="nombre"
                                value={formData.nombre || ''}
                                onChange={handleChange}
                                placeholder="Ej: Juan Pérez"
                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Teléfono</label>
                            <input 
                                type="tel" 
                                name="telefono"
                                value={formData.telefono || ''}
                                onChange={handleChange}
                                placeholder="Ej: 999 999 999"
                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Dirección de Envío</label>
                        <input 
                            type="text" 
                            name="direccion"
                            value={formData.direccion || ''}
                            onChange={handleChange}
                            placeholder="Calle, Número, Referencia"
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Ciudad</label>
                        <input 
                            type="text" 
                            name="ciudad"
                            value={formData.ciudad || ''}
                            onChange={handleChange}
                            placeholder="Tu ciudad"
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                        />
                    </div>

                    <div className="flex items-center justify-between pt-4">
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="bg-orange-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                        >
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>

                        {msg === "success" && (
                            <span className="text-green-600 font-bold flex items-center animate-fade-in-up">
                                <i className="fas fa-check-circle mr-2"></i> Actualizado
                            </span>
                        )}
                        {msg === "error" && (
                            <span className="text-red-600 font-bold flex items-center animate-fade-in-up">
                                <i className="fas fa-exclamation-circle mr-2"></i> Error al guardar
                            </span>
                        )}
                    </div>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Perfil;