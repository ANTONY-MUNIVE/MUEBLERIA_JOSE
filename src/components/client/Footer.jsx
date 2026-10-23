import React from 'react';
import { Link } from 'react-router-dom';
import logoOscuro from '../../assets/logo-horizontal-oscuro.png';
import useInfoEmpresa, { enlaceWhatsApp } from '../../hooks/useInfoEmpresa';

const Red = ({ href, label, icono }) => (
  <a
    href={href || '#'}
    target={href ? '_blank' : undefined}
    rel="noreferrer"
    aria-label={label}
    className="w-11 h-11 rounded-full border border-cafe flex items-center justify-center text-hueso hover:bg-terracota hover:text-espresso hover:border-terracota transition"
  >
    <i className={icono}></i>
  </a>
);

const Footer = () => {
  const info = useInfoEmpresa();
  const whatsapp = enlaceWhatsApp(info.telefono);

  return (
    <footer className="bg-espresso text-piedra mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-6 grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 text-[15px]">
        <div className="flex flex-col gap-3">
          <img src={logoOscuro} alt="Mueblería Jose" className="w-52 h-auto" />
          <p>Calidad y estilo para tu hogar.</p>
          <div className="flex gap-2">
            <Red href={info.facebook} label="Facebook" icono="fab fa-facebook-f" />
            <Red href={info.instagram} label="Instagram" icono="fab fa-instagram" />
            <Red href={whatsapp} label="WhatsApp" icono="fab fa-whatsapp" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-hueso font-bold mb-1">Visítanos</h2>
          <p>{info.direccion || 'Huancayo, Junín'}</p>
          {info.horario && <p>{info.horario}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-hueso font-bold mb-1">Contacto</h2>
          {info.telefono && <p>{info.telefono}</p>}
          {info.email && <a href={`mailto:${info.email}`} className="text-piedra hover:text-terracota-claro">{info.email}</a>}
          <Link to="/contacto" className="text-terracota-claro font-bold hover:underline">Escríbenos</Link>
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-hueso font-bold mb-1">Tienda</h2>
          <Link to="/catalogo" className="text-piedra hover:text-terracota-claro">Catálogo</Link>
          <Link to="/mis-pedidos" className="text-piedra hover:text-terracota-claro">Mis pedidos</Link>
          <Link to="/ayuda" className="text-piedra hover:text-terracota-claro">Ayuda y soporte</Link>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 border-t border-espresso-2 text-xs">
        &copy; {new Date().getFullYear()} Mueblería Jose. Todos los derechos reservados.
      </div>
    </footer>
  );
};

export default Footer;
