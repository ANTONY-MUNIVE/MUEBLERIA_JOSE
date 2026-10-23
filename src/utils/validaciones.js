// Reglas de validación de la aplicación (RF14).
// Devuelven un objeto { campo: mensaje }; si está vacío, los datos son válidos.
// Son funciones puras para poder probarlas sin Firebase.
import { esFechaValida, hoyISO } from './fechas';

const texto = (v) => String(v ?? '').trim();
const esEnteroPositivo = (v) => Number.isInteger(Number(v)) && Number(v) > 0 && texto(v) !== '';
const esMontoPositivo = (v) => texto(v) !== '' && Number.isFinite(Number(v)) && Number(v) > 0;
const CELULAR_RE = /^9\d{8}$/;
const NOMBRE_RE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]{2,}$/;

export const redondear = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const calcularTotal = (items = []) =>
  redondear(items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precioUnit) || 0), 0));

/**
 * Valida una venta en tienda.
 * @param {object} venta { fecha, tipo, cliente, items, pago }
 * @param {object} stockPorMueble opcional { muebleId: stockDisponible }
 */
export const validarVenta = (venta, stockPorMueble = null) => {
  const e = {};
  const { fecha, tipo, cliente = {}, items = [], pago = {} } = venta || {};

  if (!esFechaValida(fecha)) e.fecha = 'Ingrese una fecha válida (dd/mm/aaaa).';
  else if (fecha > hoyISO()) e.fecha = 'La fecha de la venta no puede ser futura.';

  if (!['stock', 'pedido'].includes(tipo)) e.tipo = 'Seleccione el tipo de venta.';

  if (!NOMBRE_RE.test(texto(cliente.nombres))) e['cliente.nombres'] = 'Ingrese los nombres del cliente (solo letras).';
  if (!NOMBRE_RE.test(texto(cliente.apellidos))) e['cliente.apellidos'] = 'Ingrese los apellidos del cliente (solo letras).';
  if (texto(cliente.direccion).length < 5) e['cliente.direccion'] = 'Ingrese la dirección del cliente.';
  const cel = texto(cliente.celular);
  if (tipo === 'pedido' && !cel) e['cliente.celular'] = 'El celular es obligatorio en los pedidos.';
  else if (cel && !CELULAR_RE.test(cel)) e['cliente.celular'] = 'El celular debe tener 9 dígitos y empezar con 9.';

  if (!items.length) e.items = 'Agregue al menos un mueble a la venta.';
  const vistos = new Set();
  items.forEach((it, i) => {
    if (!it.muebleId) { e[`items.${i}.muebleId`] = 'Seleccione el mueble.'; return; }
    if (vistos.has(it.muebleId)) e[`items.${i}.muebleId`] = 'Este mueble ya está en la venta; aumente la cantidad.';
    vistos.add(it.muebleId);
    if (!esEnteroPositivo(it.cantidad)) e[`items.${i}.cantidad`] = 'La cantidad debe ser un número entero mayor que cero.';
    else if (stockPorMueble && Number(it.cantidad) > (stockPorMueble[it.muebleId] ?? 0)) {
      e[`items.${i}.cantidad`] = `Stock insuficiente: quedan ${stockPorMueble[it.muebleId] ?? 0}.`;
    }
    if (!esMontoPositivo(it.precioUnit)) e[`items.${i}.precioUnit`] = 'El precio debe ser mayor que cero.';
  });

  const total = calcularTotal(items);
  if (!['efectivo', 'yape'].includes(pago.metodo)) e['pago.metodo'] = 'Seleccione el método de pago.';
  if (!texto(pago.numeroBoleta)) e['pago.numeroBoleta'] = 'Ingrese el número de la boleta entregada.';
  if (!esMontoPositivo(pago.montoRecibido)) e['pago.montoRecibido'] = 'Ingrese el monto recibido.';
  else if (Number(pago.montoRecibido) + 0.001 < total) e['pago.montoRecibido'] = `El monto recibido no cubre el total (S/ ${total.toFixed(2)}).`;

  return e;
};

/** Valida un pedido personalizado (RF20). */
export const validarPedido = (p) => {
  const e = {};
  const c = p?.cliente || {};
  if (!NOMBRE_RE.test(texto(c.nombres))) e['cliente.nombres'] = 'Ingrese los nombres del cliente.';
  if (!NOMBRE_RE.test(texto(c.apellidos))) e['cliente.apellidos'] = 'Ingrese los apellidos del cliente.';
  if (!CELULAR_RE.test(texto(c.celular))) e['cliente.celular'] = 'El celular debe tener 9 dígitos y empezar con 9.';
  if (texto(p?.modelo).length < 3) e.modelo = 'Describa el modelo del mueble.';
  if (!texto(p?.medidas)) e.medidas = 'Ingrese las medidas.';
  if (!texto(p?.color)) e.color = 'Ingrese el color.';
  if (!esMontoPositivo(p?.precioTotal)) e.precioTotal = 'Ingrese el precio total del pedido.';
  if (texto(p?.adelanto) === '' || Number(p.adelanto) < 0 || !Number.isFinite(Number(p.adelanto))) e.adelanto = 'Ingrese el adelanto (0 si no hubo).';
  else if (Number(p.adelanto) > Number(p.precioTotal)) e.adelanto = 'El adelanto no puede superar el precio total.';
  if (p?.fechaEntrega && !esFechaValida(p.fechaEntrega)) e.fechaEntrega = 'Fecha de entrega no válida.';
  return e;
};

/** Valida un movimiento de inventario (RF22). */
export const validarMovimiento = (m, stockActual) => {
  const e = {};
  if (!m?.muebleId) e.muebleId = 'Seleccione el mueble.';
  if (texto(m?.motivo).length < 3) e.motivo = 'Indique el motivo del movimiento.';
  if (m?.tipo === 'ingreso') {
    if (!esEnteroPositivo(m.cantidad)) e.cantidad = 'La cantidad ingresada debe ser un entero mayor que cero.';
  } else if (m?.tipo === 'ajuste') {
    const f = Number(m.conteoFisico);
    if (texto(m.conteoFisico) === '' || !Number.isInteger(f) || f < 0) e.conteoFisico = 'Ingrese la cantidad física contada (entero, 0 o más).';
    else if (stockActual !== undefined && f === Number(stockActual)) e.conteoFisico = 'La cantidad física es igual a la registrada; no hay ajuste que hacer.';
  } else {
    e.tipo = 'Tipo de movimiento no válido.';
  }
  return e;
};

/** Valida los datos de un mueble (RF07). */
export const validarMueble = (m) => {
  const e = {};
  if (!/^[A-Z0-9-]{3,15}$/.test(texto(m?.codigo).toUpperCase())) e.codigo = 'Código de 3 a 15 caracteres (letras, números o guion).';
  if (texto(m?.nombre).length < 2) e.nombre = 'Ingrese el nombre.';
  if (!esMontoPositivo(m?.precio)) e.precio = 'El precio debe ser mayor que cero.';
  if (!['pieza', 'juego'].includes(m?.unidad)) e.unidad = 'Seleccione la unidad de venta.';
  if (texto(m?.stockMinimo) !== '' && (!Number.isInteger(Number(m.stockMinimo)) || Number(m.stockMinimo) < 0)) e.stockMinimo = 'Stock mínimo: entero de 0 o más.';
  return e;
};
