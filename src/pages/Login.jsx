import logoVertical from '../assets/logo-vertical.png';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom'; // <--- IMPORTANTE: Importar Link

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/'); 
    } catch (error) {
      console.error(error);
      setError('Credenciales incorrectas. Intenta de nuevo.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-lg w-full max-w-md animate-aparecer border border-gray-200">
        <Link to="/" className="block mx-auto mb-4 w-40"><img src={logoVertical} alt="Mueblería Jose" className="w-full h-auto" /></Link>
        <h1 className="font-display text-2xl font-semibold text-center text-gray-800 mb-6">Iniciar Sesión</h1>
        
        {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm text-center">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-600 text-sm font-medium mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="admin@muebleria.com"
              required
            />
          </div>

          <div>
            <label className="block text-gray-600 text-sm font-medium mb-1">Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition"
          >
            Ingresar
          </button>
        </form>
        
        {/* --- NUEVO FOOTER CON ENLACE A REGISTRO --- */}
        <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
                ¿No tienes cuenta? <Link to="/register" className="text-blue-600 font-bold hover:underline">Regístrate aquí</Link>
            </p>
            <div>
                <Link to="/" className="text-sm text-gray-500 hover:underline">← Volver a la tienda</Link>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Login;