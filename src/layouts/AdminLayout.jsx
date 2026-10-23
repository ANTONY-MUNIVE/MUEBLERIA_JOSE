import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config'; 
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { APP_VERSION } from '../config/app';

const AdminLayout = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  // Estados de control
  const [allowedModules, setAllowedModules] = useState([]);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState(""); 
  const [currentUserName, setCurrentUserName] = useState("");
  
  // Estados para el bloqueo 404
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Estado para el sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- EFECTO 1: VERIFICAR ROL Y PERMISOS ---
  useEffect(() => {
    const fetchUserRoleAndPermissions = async () => {
      if (!user) return; 

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        let realRole = "cliente";
        let realName = "Usuario"; 

        if (userSnap.exists()) {
            const userData = userSnap.data(); 
            realRole = userData.role || "cliente";
            realName = userData.nombre || "Usuario"; 
        }
        
        setCurrentUserRole(realRole);
        setCurrentUserName(realName);

        // Bloqueo de seguridad
        if (realRole === 'cliente') {
            setIsUnauthorized(true);
            setCheckingPermissions(false);
            return;
        }

        // Carga de permisos
        if (realRole === 'admin' || realRole === 'superadmin') {
          setAllowedModules(['ALL']); 
          setCheckingPermissions(false);
          return;
        }

        const q = query(collection(db, "roles"), where("nombre", "==", realRole));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const roleData = querySnapshot.docs[0].data();
          setAllowedModules(roleData.permissions || []);
        } else {
          setAllowedModules([]);
        }

      } catch (error) {
        console.error("Error verificando permisos:", error);
        setIsUnauthorized(true);
      } finally {
        setCheckingPermissions(false);
      }
    };

    fetchUserRoleAndPermissions();
  }, [user, navigate]);


  // --- EFECTO 2: CUENTA REGRESIVA ---
  useEffect(() => {
    let interval;
    let timeout;

    if (isUnauthorized) {
        interval = setInterval(() => {
            setCountdown((prev) => prev - 1);
        }, 1000);

        timeout = setTimeout(() => {
            navigate('/');
        }, 5000);
    }

    return () => {
        clearInterval(interval);
        clearTimeout(timeout);
    };
  }, [isUnauthorized, navigate]);


  // --- HELPERS ---
  const canAccess = (moduleId) => {
    if (allowedModules.includes('ALL')) return true; 
    return allowedModules.includes(moduleId);
  };

  const handleLogout = async () => {
    try { await logout(); navigate('/login'); } catch (error) { console.error(error); }
  };

  // --- RENDERIZADO ---

  // 1. Spinner de carga
  if (checkingPermissions) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
            <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 font-bold">Verificando credenciales...</p>
        </div>
    );
  }

  // 2. Pantalla 404 Fake
  if (isUnauthorized) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center px-4">
            <h1 className="text-9xl font-extrabold text-gray-300">404</h1>
            <h2 className="text-3xl font-bold text-gray-800 mt-4">Página no encontrada</h2>
            <p className="text-gray-500 mt-2 max-w-md">
                Lo sentimos, la página que buscas no existe o ha sido movida.
            </p>
            <div className="mt-8 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                <p className="text-sm text-gray-600 font-medium">
                    <i className="fas fa-circle-notch fa-spin mr-2 text-blue-500"></i>
                    Redirigiendo al inicio en <span className="font-bold text-blue-600 text-lg">{countdown}</span> segundos...
                </p>
            </div>
            <button onClick={() => navigate('/')} className="mt-6 text-blue-600 hover:underline text-sm">
                Ir al Inicio inmediatamente
            </button>
        </div>
    );
  }

  // 3. LAYOUT DEL ADMIN (ADAPTADO CON SIDEBAR DINÁMICO)
  return (
    <div className="flex min-h-screen bg-gray-100 font-sans overflow-hidden">
      
      {/* --- SIDEBAR --- */}
      <aside 
        className={`bg-gray-900 text-white flex flex-col shadow-2xl h-screen transition-all duration-300 ease-in-out ${
            isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full overflow-hidden'
        }`}
      >
        <div className="p-6 text-2xl font-bold text-center border-b border-gray-800 tracking-wide whitespace-nowrap">
          Admin Panel
          <span className="block text-xs font-normal text-orange-500 mt-1 uppercase tracking-widest">
            {currentUserRole}
          </span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto whitespace-nowrap">
          {(canAccess('ventas') || canAccess('disponibilidad') || canAccess('inventario') || canAccess('pedidos_personalizados') || canAccess('reportes')) && (
            <div className="pb-2 px-4 text-xs font-bold text-gray-500 uppercase">Tienda</div>
          )}
          {canAccess('ventas') && (
             <Link to="/admin/ventas" className="block py-3 px-4 rounded hover:bg-gray-800 transition text-gray-300 hover:text-white">
                <i className="fas fa-cash-register mr-3 w-5 text-center"></i> Ventas
             </Link>
          )}
          {canAccess('disponibilidad') && (
             <Link to="/admin/disponibilidad" className="block py-3 px-4 rounded hover:bg-gray-800 transition text-gray-300 hover:text-white">
                <i className="fas fa-search mr-3 w-5 text-center"></i> Disponibilidad
             </Link>
          )}
          {canAccess('inventario') && (
             <Link to="/admin/inventario" className="block py-3 px-4 rounded hover:bg-gray-800 transition text-gray-300 hover:text-white">
                <i className="fas fa-warehouse mr-3 w-5 text-center"></i> Inventario
             </Link>
          )}
          {canAccess('pedidos_personalizados') && (
             <Link to="/admin/pedidos-personalizados" className="block py-3 px-4 rounded hover:bg-gray-800 transition text-gray-300 hover:text-white">
                <i className="fas fa-hammer mr-3 w-5 text-center"></i> Pedidos personalizados
             </Link>
          )}
          {canAccess('reportes') && (
             <Link to="/admin/reportes" className="block py-3 px-4 rounded hover:bg-gray-800 transition text-gray-300 hover:text-white">
                <i className="fas fa-file-alt mr-3 w-5 text-center"></i> Reportes
             </Link>
          )}
          {(canAccess('dashboard') || canAccess('pedidos') || canAccess('productos') || canAccess('clientes')) && (
            <div className="pt-4 pb-2 px-4 text-xs font-bold text-gray-500 uppercase">Gestión</div>
          )}
          {canAccess('dashboard') && (
             <Link to="/admin/dashboard" className="block py-3 px-4 rounded hover:bg-gray-800 transition text-gray-300 hover:text-white">
                <i className="fas fa-chart-line mr-3 w-5 text-center"></i> Dashboard
             </Link>
          )}

          {canAccess('pedidos') && (
             <Link to="/admin/pedidos" className="block py-3 px-4 rounded hover:bg-gray-800 transition text-gray-300 hover:text-white">
                 <i className="fas fa-shopping-bag mr-3 w-5 text-center"></i> Pedidos en línea
             </Link>
          )}

          {canAccess('productos') && (
            <>
              <Link to="/admin/productos" className="block py-3 px-4 rounded hover:bg-gray-800 transition text-gray-300 hover:text-white">
                  <i className="fas fa-box mr-3 w-5 text-center"></i> Productos
              </Link>
              <Link to="/admin/categorias" className="block py-3 px-4 rounded hover:bg-gray-800 transition text-gray-300 hover:text-white">
                  <i className="fas fa-tags mr-3 w-5 text-center"></i> Categorías
              </Link>
            </>
          )}

          {canAccess('clientes') && (
              <Link to="/admin/mensajes" className="block py-3 px-4 rounded hover:bg-gray-800 transition text-gray-300 hover:text-white">
                  <i className="fas fa-envelope mr-3 w-5 text-center"></i> Mensajes
              </Link>
          )}

          {canAccess('web') && (
            <>
                <div className="pt-4 pb-2 px-4 text-xs font-bold text-gray-500 uppercase">Web</div>
                <Link to="/admin/home-config" className="block py-2 px-4 rounded hover:bg-gray-800 transition text-gray-300 hover:text-white text-sm">
                    <i className="fas fa-home mr-3 w-5 text-center"></i> Portada
                </Link>
                <Link to="/admin/publicaciones" className="block py-2 px-4 rounded hover:bg-gray-800 transition text-gray-300 hover:text-white text-sm">
                    <i className="fas fa-newspaper mr-3 w-5 text-center"></i> Publicaciones
                </Link>
                <Link to="/admin/info-empresa" className="block py-2 px-4 rounded hover:bg-gray-800 transition text-gray-300 hover:text-white text-sm">
                    <i className="fas fa-building mr-3 w-5 text-center"></i> Info Empresa
                </Link>
            </>
          )}

          {canAccess('roles') && (
            <>
                <div className="pt-4 pb-2 px-4 text-xs font-bold text-gray-500 uppercase">Sistema</div>
                <Link to="/admin/roles" className="block py-2 px-4 rounded hover:bg-gray-800 transition text-orange-400 hover:text-orange-300 text-sm font-bold">
                    <i className="fas fa-user-shield mr-3 w-5 text-center"></i> Roles y Permisos
                </Link>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-gray-800 bg-gray-900 whitespace-nowrap">
             <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center font-bold text-white">
                    {user?.email?.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                    <div className="text-sm font-bold truncate text-white">{user?.nombre || "Admin"}</div>
                    <div className="text-xs text-gray-400 truncate">{user?.email}</div>
                </div>
            </div>
            
            <div className="text-[10px] text-gray-500 text-center mb-2">Versión {APP_VERSION}</div>
            <button 
                onClick={handleLogout}
                className="w-full bg-red-600/90 hover:bg-red-600 text-white py-2 rounded transition flex items-center justify-center gap-2 text-sm font-bold"
            >
                <i className="fas fa-sign-out-alt"></i> Cerrar Sesión
            </button>
        </div>
      </aside>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* HEADER SUPERIOR */}
        <header className="h-16 bg-white shadow-sm border-b flex items-center px-6 justify-between flex-shrink-0">
            {/* Izquierda: Botón hamburguesa y Título */}
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="text-gray-600 hover:text-orange-600 transition focus:outline-none p-2 rounded hover:bg-gray-100"
                >
                    <i className={`fas ${isSidebarOpen ? 'fa-indent' : 'fa-outdent'} text-2xl`}></i>
                </button>
                <h2 className="text-xl font-semibold text-gray-800 hidden sm:block">Panel de Administración</h2>
            </div>

            {/* Derecha: Botón de Previsualizar Web */}
            <div className="flex items-center">
                <Link 
                    to="/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-semibold shadow-sm"
                    title="Ver cómo los clientes ven la tienda"
                >
                    <i className="fas fa-external-link-alt"></i>
                    <span className="hidden sm:inline">Ver Tienda</span>
                </Link>
            </div>
        </header>

        {/* ÁREA DE CONTENIDO (OUTLET) */}
        <div className="flex-1 overflow-auto p-8">
            <Outlet context={{ role: currentUserRole, nombre: currentUserName, canAccess }} />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;