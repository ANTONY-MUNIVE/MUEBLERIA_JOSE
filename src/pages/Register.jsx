import logoVertical from '../assets/logo-vertical.png';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';

// ================= RENIEC TOKEN =================
const RENIEC_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImpmY2M5NTAxMjMwOUBnbWFpbC5jb20ifQ.UaK6eecpbt-mVnF9hI-BYSHtl6QQ5hCLU1MNItWe9P8"; 

const Register = () => {
  const [formData, setFormData] = useState({
    dni: '',
    nombre: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchingDni, setSearchingDni] = useState(false);
  const [isManual, setIsManual] = useState(false); 
  const [dniMessage, setDniMessage] = useState(''); // <-- NUEVO ESTADO PARA MENSAJE AMIGABLE
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  // --- VALIDACIONES DE CONTRASEÑA ---
  const passChecks = {
    length: formData.password.length >= 6,
    lower: /[a-z]/.test(formData.password),
    upper: /[A-Z]/.test(formData.password),
    number: /\d/.test(formData.password),
    symbol: /[^A-Za-z0-9]/.test(formData.password)
  };

  const isPasswordValid = passChecks.length && passChecks.lower && passChecks.upper && passChecks.number && passChecks.symbol;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDniChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); 
    setFormData({ ...formData, dni: value });
    
    // Si borra números, reiniciamos todo
    if (value.length < 8) {
      setFormData(prev => ({ ...prev, nombre: '' }));
      setIsManual(false);
      setDniMessage('');
      setError('');
    }
  };

  // ================= RENIEC POR DNI =================
  useEffect(() => {
    const fetchDNI = async () => {
      const value = formData.dni;
      if (value.length !== 8) return;

      setSearchingDni(true);
      setError('');
      setDniMessage('');

      try {
        const res = await fetch(`https://dniruc.apisperu.com/api/v1/dni/${value}?token=${RENIEC_TOKEN}`);
        const data = await res.json();

        if (data?.nombres) {
          const nombreCompleto = `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno}`.toUpperCase();
          setFormData(prev => ({ ...prev, nombre: nombreCompleto }));
          setIsManual(false); 
        } else {
          // Si no existe, habilitamos manual y mostramos mensaje amigable
          setIsManual(true);
          setFormData(prev => ({ ...prev, nombre: '' }));
          setDniMessage("No encontramos este DNI. Por favor, escribe tu nombre manualmente.");
        }
      } catch (err) {
        console.error("RENIEC error:", err);
        // Si la API falla, habilitamos manual
        setIsManual(true);
        setFormData(prev => ({ ...prev, nombre: '' }));
        setDniMessage("No pudimos validar el DNI automáticamente. Escribe tu nombre manualmente.");
      } finally {
        setSearchingDni(false);
      }
    };

    fetchDNI();
  }, [formData.dni]); 

  const validateForm = () => {
    const { dni, nombre, email, password, confirmPassword } = formData;

    if (!dni || dni.length !== 8) {
      setError('Por favor ingresa un DNI válido de 8 dígitos.');
      return false;
    }

    if (!nombre.trim()) {
      setError('Por favor ingresa tu nombre completo.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor ingresa un correo válido.');
      return false;
    }

    if (!isPasswordValid) {
      setError('La contraseña debe cumplir con todos los requisitos de seguridad.');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const infoUsuario = await signup(formData.email.trim(), formData.password);
      const uid = infoUsuario.user.uid;

      await setDoc(doc(db, "users", uid), {
        uid: uid,
        dni: formData.dni,
        email: formData.email.trim(),
        nombre: formData.nombre.trim(),
        role: "cliente", 
        createdAt: new Date()
      });

      navigate('/'); 

    } catch (error) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        setError('Este correo ya está registrado.');
      } else {
        setError('Error al registrarse. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-sans">
      <div className="bg-white p-8 rounded-3xl shadow-lg w-full max-w-md animate-aparecer border border-gray-200">
        <Link to="/" className="block mx-auto mb-4 w-40"><img src={logoVertical} alt="Mueblería Jose" className="w-full h-auto" /></Link>
        <h1 className="font-display text-2xl font-semibold text-center text-gray-800 mb-6">Crear Cuenta</h1>
        
        {/* Este es el error GLOBAL, ya no saltará por culpa del DNI */}
        {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                <i className="fas fa-exclamation-circle"></i> {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-gray-600 text-sm font-bold mb-1">DNI</label>
            <div className="relative">
                <input 
                  type="text" 
                  name="dni"
                  maxLength="8"
                  value={formData.dni}
                  onChange={handleDniChange} 
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Escribe los 8 dígitos..."
                />
                {searchingDni && (
                  <div className="absolute right-3 top-3 text-blue-500">
                    <i className="fas fa-spinner fa-spin"></i>
                  </div>
                )}
            </div>
          </div>

          <div>
            <label className="block text-gray-600 text-sm font-bold mb-1">Nombre Completo</label>
            <input 
              type="text" 
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              readOnly={!isManual} 
              className={`w-full border p-3 rounded-lg outline-none transition ${
                !isManual && formData.dni.length === 8 
                ? 'bg-blue-50 border-blue-200 font-bold text-gray-700' 
                : !isManual 
                ? 'bg-gray-50 border-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-500' 
              }`}
              placeholder={isManual ? "Escribe tus nombres y apellidos" : "Autocompletado con tu DNI"}
            />
            {/* Mensaje amigable si el DNI no se encuentra */}
            {dniMessage && (
                <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                    <i className="fas fa-info-circle"></i> {dniMessage}
                </p>
            )}
          </div>

          <div>
            <label className="block text-gray-600 text-sm font-bold mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="juan@email.com"
            />
          </div>

          <div>
            <label className="block text-gray-600 text-sm font-bold mb-1">Contraseña</label>
            <input 
              type="password" 
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Crea una contraseña segura"
            />
            
            {formData.password && (
                <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs space-y-2">
                    <p className="font-bold text-gray-600 mb-1 border-b pb-1">Tu contraseña debe tener:</p>
                    <p className={`flex items-center gap-2 transition-colors ${passChecks.length ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                        <i className={`fas ${passChecks.length ? 'fa-check-circle' : 'fa-circle text-[10px]'}`}></i> Mínimo 6 caracteres
                    </p>
                    <p className={`flex items-center gap-2 transition-colors ${passChecks.upper && passChecks.lower ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                        <i className={`fas ${passChecks.upper && passChecks.lower ? 'fa-check-circle' : 'fa-circle text-[10px]'}`}></i> Mayúsculas y minúsculas
                    </p>
                    <p className={`flex items-center gap-2 transition-colors ${passChecks.number ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                        <i className={`fas ${passChecks.number ? 'fa-check-circle' : 'fa-circle text-[10px]'}`}></i> Al menos un número (0-9)
                    </p>
                    <p className={`flex items-center gap-2 transition-colors ${passChecks.symbol ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                        <i className={`fas ${passChecks.symbol ? 'fa-check-circle' : 'fa-circle text-[10px]'}`}></i> Al menos un símbolo (@, #, etc.)
                    </p>
                </div>
            )}
          </div>

          <div>
            <label className="block text-gray-600 text-sm font-bold mb-1">Confirmar Contraseña</label>
            <input 
              type="password" 
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={!isPasswordValid}
              className={`w-full border p-3 rounded-lg outline-none transition ${
                  !isPasswordValid 
                  ? 'bg-gray-100 cursor-not-allowed'
                  : formData.confirmPassword && formData.password !== formData.confirmPassword 
                  ? 'border-red-300 focus:ring-2 focus:ring-red-200 bg-red-50'
                  : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
              }`}
              placeholder="Repite tu contraseña"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || !formData.nombre || !isPasswordValid || formData.password !== formData.confirmPassword} 
            className={`w-full font-bold py-3 rounded-lg text-white transition flex justify-center items-center gap-2 ${
                (loading || !formData.nombre || !isPasswordValid || (formData.password && formData.password !== formData.confirmPassword)) 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gray-900 hover:bg-gray-800 shadow-lg'
            }`}
          >
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>
        
        <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
                ¿Ya tienes cuenta? <Link to="/login" className="text-blue-600 font-bold hover:underline">Inicia Sesión</Link>
            </p>
        </div>
      </div>
    </div>
  );
};

export default Register;