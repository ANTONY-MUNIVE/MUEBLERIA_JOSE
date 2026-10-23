import { STOCK_MINIMO_DEFAULT } from '../config/app';

/** Estado de stock visible para el cliente (sin mostrar cantidades exactas). */
export const estadoStock = (m) => {
  if (m.stock === undefined || m.stock === null || m.stock === '') return null;
  const stock = Number(m.stock) || 0;
  if (stock <= 0) return { texto: 'Agotado · a pedido', clase: 'bg-espresso text-hueso', agotado: true };
  if (stock <= (m.stockMinimo ?? STOCK_MINIMO_DEFAULT)) return { texto: 'Últimas unidades', clase: 'bg-aviso-fondo text-aviso' };
  return { texto: 'En tienda', clase: 'bg-white text-exito' };
};
