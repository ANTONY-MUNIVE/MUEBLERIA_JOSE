import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/client/Navbar';
import Footer from '../components/client/Footer';
import Chatbot from '../pages/client/Chatbot';

const ClientLayout = () => {
  const { pathname } = useLocation();
  return (
    <div className="flex flex-col min-h-screen bg-hueso text-espresso">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-hueso focus:px-4 focus:py-2 focus:rounded-full focus:font-bold">Saltar al contenido</a>
      <Navbar />
      {/* key: cada página entra con una transición suave */}
      <main id="contenido" key={pathname} className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 animate-fade-in">
        <Outlet />
      </main>
      <Footer />
      <Chatbot />
    </div>
  );
};

export default ClientLayout;
