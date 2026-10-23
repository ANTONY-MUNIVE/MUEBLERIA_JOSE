// Versión de la aplicación. Se registra en cada venta y en las métricas
// para la ficha F4 (registro de condiciones e incidencias) de la tesis.
export const APP_VERSION = '2.1.0';

// Stock mínimo por defecto cuando el mueble no tiene uno propio (RF24).
export const STOCK_MINIMO_DEFAULT = 5;

// Estados de los pedidos personalizados (RF21).
export const ESTADOS_PEDIDO = [
  { id: 'registrado', label: 'Registrado', color: 'bg-gray-100 text-gray-700' },
  { id: 'en_fabricacion', label: 'En fabricación', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'terminado', label: 'Terminado', color: 'bg-blue-100 text-blue-700' },
  { id: 'entregado', label: 'Entregado', color: 'bg-green-100 text-green-700' },
  { id: 'anulado', label: 'Anulado', color: 'bg-red-100 text-red-700' },
];

export const METODOS_PAGO = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'yape', label: 'Yape' },
];

export const TIPOS_MOVIMIENTO = {
  venta: 'Venta',
  ingreso: 'Ingreso',
  ajuste: 'Ajuste',
  anulacion: 'Anulación de venta',
  correccion: 'Corrección de venta',
};
