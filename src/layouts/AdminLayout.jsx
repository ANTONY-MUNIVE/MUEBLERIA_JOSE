import React, { useState, useEffect } from 'react';
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config'; 
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { APP_VERSION } from '../config/app';
import logoOscuro from '../assets/logo-horizontal-oscuro.png';

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

  // Estado del menú lateral (escritorio) y del menú en celular
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [menuMovil, setMenuMovil] = useState(false);
  const { pathname } = useLocation();
  const [rutaPrevia, setRutaPrevia] = useState(pathname);
  if (rutaPrevia !== pathname) {
    setRutaPrevia(pathname);
    setMenuMovil(false);
  }

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
        <div className="min-h-screen flex flex-col items-center justify-center bg-hueso">
            <div className="w-12 h-12 border-4 border-terracota border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 font-bold">Verificando credenciales...</p>
        </div>
    );
  }

  // 2. Pantalla 404 Fake
  if (isUnauthorized) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-hueso text-center px-4">
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

  // 3. LAYOUT DEL ADMIN
  const secciones = [
    { titulo: 'Tienda', items: [
      { mod: 'ventas', to: '/admin/ventas', icono: 'fa-cash-register', texto: 'Ventas' },
      { mod: 'disponibilidad', to: '/admin/disponibilidad', icono: 'fa-search', texto: 'Disponibilidad' },
      { mod: 'inventario', to: '/admin/inventario', icono: 'fa-warehouse', texto: 'Inventario' },
      { mod: 'pedidos_personalizados', to: '/admin/pedidos-personalizados', icono: 'fa-hammer', texto: 'Pedidos a medida' },
      { mod: 'reportes', to: '/admin/reportes', icono: 'fa-file-alt', texto: 'Reportes' },
    ] },
    { titulo: 'Gestión', items: [
      { mod: 'dashboard', to: '/admin/dashboard', icono: 'fa-chart-line', texto: 'Dashboard' },
      { mod: 'pedidos', to: '/admin/pedidos', icono: 'fa-shopping-bag', texto: 'Pedidos en línea' },
      { mod: 'productos', to: '/admin/productos', icono: 'fa-couch', texto: 'Productos' },
      { mod: 'productos', to: '/admin/categorias', icono: 'fa-tags', texto: 'Categorías' },
      { mod: 'clientes', to: '/admin/mensajes', icono: 'fa-envelope', texto: 'Mensajes' },
    ] },
    { titulo: 'Web', items: [
      { mod: 'web', to: '/admin/home-config', icono: 'fa-images', texto: 'Portada' },
      { mod: 'web', to: '/admin/publicaciones', icono: 'fa-newspaper', texto: 'Publicaciones' },
      { mod: 'web', to: '/admin/info-empresa', icono: 'fa-store', texto: 'Info de la empresa' },
    ] },
    { titulo: 'Sistema', items: [
      { mod: 'roles', to: '/admin/roles', icono: 'fa-user-shield', texto: 'Roles y permisos' },
    ] },
  ].map((sec) => ({ ...sec, items: sec.items.filter((it) => canAccess(it.mod)) })).filter((sec) => sec.items.length);

  const tituloActual = secciones.flatMap((sec) => sec.items).find((it) => pathname.startsWith(it.to))?.texto || 'Inicio';

  const menu = (
    <div className="h-full bg-espresso text-hueso rounded-3xl flex flex-col overflow-hidden">
      <div className="px-5 pt-6 pb-4 flex flex-col items-center gap-1.5 border-b border-espresso-2">
        <Link to="/admin" aria-label="Inicio del panel"><img src={logoOscuro} alt="Mueblería Jose" className="w-36 h-auto" /></Link>
        <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-terracota-claro">{currentUserRole}</span>
      </div>

      <nav aria-label="Panel" className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-0.5">
        {secciones.map((sec) => (
          <div key={sec.titulo} className="flex flex-col gap-0.5 mb-3">
            <span className="px-3 pb-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-piedra/80">{sec.titulo}</span>
            {sec.items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                className={({ isActive }) => `group flex items-center gap-3 px-3 min-h-11 rounded-2xl font-bold text-[15px] transition-colors ${isActive ? 'bg-terracota text-espresso' : 'text-hueso/90 hover:bg-espresso-2 hover:text-hueso'}`}
              >
                <i className={`fas ${it.icono} w-5 text-center transition-transform group-hover:scale-110`}></i>
                <span className="truncate">{it.texto}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-espresso-2">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-terracota text-espresso flex items-center justify-center font-extrabold shrink-0">
            {(currentUserName || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold truncate">{currentUserName || 'Usuario'}</div>
            <div className="text-xs text-piedra truncate">{user?.email}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full min-h-11 rounded-2xl border border-cafe text-hueso hover:bg-red-700 hover:border-red-700 transition flex items-center justify-center gap-2 text-sm font-bold"
        >
          <i className="fas fa-sign-out-alt"></i> Cerrar sesión
        </button>
        <div className="text-[11px] text-piedra/80 text-center mt-2">Versión {APP_VERSION}</div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-hueso text-espresso font-sans overflow-hidden">
      {/* Menú lateral en escritorio */}
      <aside
        className={`hidden lg:block shrink-0 transition-[width,padding] duration-300 ease-out ${isSidebarOpen ? 'w-[276px] p-3 pr-0' : 'w-0 p-0'} overflow-hidden`}
        aria-hidden={!isSidebarOpen}
      >
        <div className="w-[264px] h-full">{menu}</div>
      </aside>

      {/* Menú lateral en celular y tablet */}
      {menuMovil && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button type="button" aria-label="Cerrar menú" className="absolute inset-0 bg-espresso/60 animate-fade-in" onClick={() => setMenuMovil(false)}></button>
          <aside className="relative w-[280px] max-w-[85vw] h-full p-3 animate-paso-atras">{menu}</aside>
        </div>
      )}

      <main className="flex-1 min-w-0 flex flex-col h-screen">
        <header className="h-16 shrink-0 flex items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => (window.innerWidth >= 1024 ? setIsSidebarOpen((v) => !v) : setMenuMovil(true))}
            className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-arena transition"
            aria-label="Mostrar u ocultar el menú"
          >
            <i className="fas fa-bars text-lg"></i>
          </button>
          <div className="min-w-0">
            <p className="text-xs text-cafe font-bold leading-none">Panel del personal</p>
            <h1 className="font-display text-xl font-semibold truncate">{tituloActual}</h1>
          </div>
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-2 h-11 px-4 rounded-full bg-white border border-linea font-bold text-sm hover:bg-espresso hover:text-hueso hover:border-espresso transition"
            title="Ver cómo los clientes ven la tienda"
          >
            <i className="fas fa-external-link-alt"></i>
            <span className="hidden sm:inline">Ver tienda</span>
          </Link>
        </header>

        <div className="flex-1 overflow-auto px-4 sm:px-6 pb-8 pt-2">
          <div key={pathname} className="animate-fade-in-up">
            <Outlet context={{ role: currentUserRole, nombre: currentUserName, canAccess }} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;