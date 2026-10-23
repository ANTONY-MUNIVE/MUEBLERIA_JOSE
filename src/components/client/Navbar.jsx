import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import logoOscuro from '../../assets/logo-horizontal-oscuro.png';

const ENLACES = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/contacto', label: 'Nosotros' },
];

const claseEnlace = ({ isActive }) =>
  `py-2.5 border-b-2 font-bold transition-colors ${isActive ? 'text-terracota-claro border-terracota-claro' : 'text-hueso border-transparent hover:text-terracota-claro'}`;

/** Cabecera oscura de la tienda (estilo de la propuesta C). */
const Navbar = () => {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [searchTerm, setSearchTerm] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuMovil, setMenuMovil] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const menuRef = useRef(null);

  // Rol del usuario para mostrar el acceso al panel
  useEffect(() => {
    let vivo = true;
    if (!user) return undefined;
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => { if (vivo) setUserRole(snap.exists() ? snap.data().role : null); })
      .catch((error) => console.error('Error obteniendo rol:', error));
    return () => { vivo = false; };
  }, [user]);

  // Cerrar el menú de usuario al hacer clic fuera o con Escape
  useEffect(() => {
    const fuera = (event) => { if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false); };
    const escape = (event) => { if (event.key === 'Escape') { setIsMenuOpen(false); setMenuMovil(false); } };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', escape); };
  }, []);

  // Al cambiar de página se cierran los menús
  const [rutaPrevia, setRutaPrevia] = useState(pathname);
  if (rutaPrevia !== pathname) {
    setRutaPrevia(pathname);
    setMenuMovil(false);
    setIsMenuOpen(false);
  }

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (q) {
      navigate(`/catalogo?q=${encodeURIComponent(q)}`);
      setSearchTerm('');
    }
  };

  const handleLogout = async () => {
    try {
      setIsMenuOpen(false);
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error al salir', error);
    }
  };

  const esPersonal = user && userRole && userRole !== 'cliente';
  const nombreVisible = user ? (user.displayName || user.email?.split('@')[0]) : '';

  const buscador = (id, clase) => (
    <form onSubmit={handleSearch} role="search" className={`items-center gap-2.5 bg-hueso rounded-full px-4 h-11 ${clase}`}>
      <i className="fas fa-search text-espresso/70" aria-hidden="true"></i>
      <label htmlFor={id} className="sr-only">Buscar muebles</label>
      <input
        id={id}
        type="search"
        placeholder="Buscar muebles..."
        className="flex-1 min-w-0 bg-transparent text-espresso placeholder:text-cafe/70 outline-none text-[15px]"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </form>
  );

  return (
    <header className="bg-espresso text-hueso sticky top-0 z-50 shadow-[0_1px_0_rgba(0,0,0,0.25)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[72px] flex items-center gap-4 lg:gap-7">
        {/* Menú móvil */}
        <button
          type="button"
          onClick={() => setMenuMovil((v) => !v)}
          className="md:hidden w-11 h-11 -ml-2 flex items-center justify-center rounded-full hover:bg-espresso-2"
          aria-label={menuMovil ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuMovil}
        >
          <i className={`fas ${menuMovil ? 'fa-times' : 'fa-bars'} text-xl`}></i>
        </button>

        <Link to="/" className="flex items-center shrink-0" aria-label="Mueblería Jose, inicio">
          <img src={logoOscuro} alt="Mueblería Jose" className="h-11 sm:h-12 w-auto" />
        </Link>

        {buscador('buscar-escritorio', 'hidden md:flex flex-1 max-w-md')}

        <nav aria-label="Principal" className="hidden md:flex items-center gap-6 ml-auto text-[15px]">
          {ENLACES.map((e) => <NavLink key={e.to} to={e.to} end={e.end} className={claseEnlace}>{e.label}</NavLink>)}
        </nav>

        <div className="flex items-center gap-2 ml-auto md:ml-0">
          <Link to="/carrito" className="relative w-11 h-11 flex items-center justify-center rounded-full hover:bg-espresso-2 transition" aria-label={`Carrito, ${totalItems} ${totalItems === 1 ? 'mueble' : 'muebles'}`}>
            <i className="fas fa-shopping-bag text-xl"></i>
            {totalItems > 0 && (
              <span key={totalItems} className="absolute top-0.5 right-0 min-w-5 h-5 px-1 rounded-full bg-terracota text-espresso text-[11px] font-extrabold flex items-center justify-center animate-aparecer">
                {totalItems}
              </span>
            )}
          </Link>

          <div className="relative" ref={menuRef}>
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen((v) => !v)}
                  className="flex items-center gap-2.5 h-11 pl-1 pr-2 rounded-full hover:bg-espresso-2 transition"
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                >
                  <span className="w-9 h-9 rounded-full bg-terracota text-espresso font-extrabold flex items-center justify-center" aria-hidden="true">
                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </span>
                  <span className="hidden lg:flex flex-col text-left leading-tight">
                    <span className="text-xs text-piedra">Hola,</span>
                    <span className="text-sm font-bold max-w-[110px] truncate">{nombreVisible}</span>
                  </span>
                  <i className={`fas fa-chevron-down text-xs text-piedra transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`}></i>
                </button>

                {isMenuOpen && (
                  <div role="menu" className="absolute right-0 mt-3 w-64 bg-white text-espresso rounded-2xl shadow-xl py-2 border border-linea origin-top-right animate-fade-in-down z-50">
                    <div className="px-4 py-3 border-b border-linea lg:hidden">
                      <p className="text-xs text-cafe font-bold">Conectado como</p>
                      <p className="text-sm font-bold truncate">{user.email}</p>
                    </div>
                    {esPersonal && (
                      <div className="px-2 py-2 border-b border-linea">
                        <Link role="menuitem" to="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-espresso text-hueso font-bold hover:bg-espresso-2 transition">
                          <i className="fas fa-user-shield text-terracota-claro w-5 text-center"></i> Panel del personal
                        </Link>
                      </div>
                    )}
                    <div className="py-1">
                      {[
                        { to: '/mis-pedidos', icono: 'fa-shopping-bag', texto: 'Mis pedidos' },
                        { to: '/perfil', icono: 'fa-user-cog', texto: 'Mi cuenta' },
                        { to: '/ayuda', icono: 'fa-life-ring', texto: 'Ayuda y soporte' },
                      ].map((o) => (
                        <Link key={o.to} role="menuitem" to={o.to} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-hueso transition">
                          <i className={`fas ${o.icono} w-5 text-center text-cafe`}></i>
                          <span className="font-semibold">{o.texto}</span>
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-linea mt-1 pt-1">
                      <button role="menuitem" type="button" onClick={handleLogout} className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 transition font-bold">
                        <i className="fas fa-sign-out-alt w-5 text-center"></i> Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Link to="/login" className="h-11 px-5 flex items-center rounded-full bg-terracota text-espresso font-extrabold text-sm hover:bg-terracota-claro transition">
                Ingresar
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Buscador y menú en celular */}
      <div className="md:hidden px-4 pb-3">{buscador('buscar-movil', 'flex')}</div>
      {menuMovil && (
        <nav aria-label="Principal" className="md:hidden border-t border-espresso-2 px-4 py-2 flex flex-col animate-fade-in-down">
          {ENLACES.map((e) => (
            <NavLink key={e.to} to={e.to} end={e.end} className={({ isActive }) => `py-3 font-bold ${isActive ? 'text-terracota-claro' : 'text-hueso'}`}>{e.label}</NavLink>
          ))}
        </nav>
      )}
    </header>
  );
};

export default Navbar;
