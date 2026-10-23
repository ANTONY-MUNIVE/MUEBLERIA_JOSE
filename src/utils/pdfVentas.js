// Generación de PDF: nota de venta (RF19) y reporte de ventas y stock (RF25).
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPrice } from './images';
import { formatoFecha } from './fechas';
import { APP_VERSION } from '../config/app';

const NARANJA = [234, 88, 12];

const encabezado = (pdf, titulo, subtitulo) => {
  pdf.setFontSize(18);
  pdf.setTextColor(...NARANJA);
  pdf.text('MUEBLERÍA JOSE S.A.', 14, 20);
  pdf.setTextColor(0);
  pdf.setFontSize(12);
  pdf.text(titulo, 14, 28);
  if (subtitulo) {
    pdf.setFontSize(9);
    pdf.setTextColor(100);
    pdf.text(subtitulo, 14, 34);
    pdf.setTextColor(0);
  }
};

const abrir = (pdf, nombre) => {
  const url = pdf.output('bloburl');
  const w = window.open(url, '_blank');
  if (!w) pdf.save(nombre);
};

/** Nota de venta simple para el cliente (documento interno, no reemplaza la boleta). */
export const generarNotaVenta = (venta) => {
  const pdf = new jsPDF();
  encabezado(pdf, `Nota de venta ${venta.codigo}`, 'Documento interno. No reemplaza la boleta de venta.');

  pdf.setFontSize(10);
  const c = venta.cliente || {};
  const filas = [
    `Fecha: ${formatoFecha(venta.fecha)}`,
    `Cliente: ${c.nombres || ''} ${c.apellidos || ''}`,
    `Dirección: ${c.direccion || '—'}`,
    `Celular: ${c.celular || '—'}`,
    `Tipo: ${venta.tipo === 'pedido' ? 'Pedido' : 'Venta de stock'}`,
    `Boleta N.°: ${venta.pago?.numeroBoleta || '—'}`,
  ];
  filas.forEach((t, i) => pdf.text(t, 14, 44 + i * 6));

  autoTable(pdf, {
    startY: 84,
    head: [['Código', 'Mueble', 'Cant.', 'Precio unit.', 'Subtotal']],
    body: (venta.items || []).map((it) => [it.codigo || '—', it.nombre, it.cantidad, formatPrice(it.precioUnit), formatPrice(it.subtotal)]),
    theme: 'striped',
    headStyles: { fillColor: NARANJA },
  });

  const y = (pdf.lastAutoTable?.finalY || 100) + 10;
  pdf.setFontSize(12);
  pdf.text(`TOTAL: ${formatPrice(venta.total)}`, 14, y);
  pdf.setFontSize(10);
  const pago = venta.pago || {};
  pdf.text(`Pago: ${pago.metodo === 'yape' ? 'Yape' : 'Efectivo'} · Recibido ${formatPrice(pago.montoRecibido || 0)} · Vuelto ${formatPrice(pago.vuelto || 0)}`, 14, y + 7);
  if (pago.operacionYape) pdf.text(`Operación Yape: ${pago.operacionYape}`, 14, y + 13);
  if (venta.estado === 'anulada') {
    pdf.setTextColor(200, 0, 0);
    pdf.setFontSize(16);
    pdf.text('ANULADA', 150, 28);
  }
  abrir(pdf, `nota_${venta.codigo}.pdf`);
};

/** Reporte de ventas y stock de un periodo (RF25). */
export const generarReportePDF = ({ desde, hasta, resumen, porMueble, porMetodo, stock }) => {
  const pdf = new jsPDF();
  encabezado(pdf, `Reporte de ventas y stock: ${formatoFecha(desde)} al ${formatoFecha(hasta)}`, `Generado el ${new Date().toLocaleString('es-PE')} · versión ${APP_VERSION}`);

  autoTable(pdf, {
    startY: 40,
    head: [['Indicador', 'Valor']],
    body: [
      ['Ventas registradas', resumen.registradas],
      ['Ventas anuladas', resumen.anuladas],
      ['Unidades vendidas', resumen.unidades],
      ['Total vendido', formatPrice(resumen.total)],
      ['Ticket promedio', formatPrice(resumen.ticket)],
    ],
    theme: 'grid',
    headStyles: { fillColor: NARANJA },
  });
  autoTable(pdf, {
    startY: pdf.lastAutoTable.finalY + 8,
    head: [['Método de pago', 'Ventas', 'Monto']],
    body: porMetodo.map((m) => [m.metodo, m.ventas, formatPrice(m.monto)]),
    theme: 'grid',
    headStyles: { fillColor: NARANJA },
  });
  autoTable(pdf, {
    startY: pdf.lastAutoTable.finalY + 8,
    head: [['Código', 'Mueble', 'Unidades', 'Monto']],
    body: porMueble.map((m) => [m.codigo || '—', m.nombre, m.unidades, formatPrice(m.monto)]),
    theme: 'striped',
    headStyles: { fillColor: NARANJA },
  });
  autoTable(pdf, {
    startY: pdf.lastAutoTable.finalY + 8,
    head: [['Código', 'Mueble', 'Stock', 'Mínimo', 'Estado']],
    body: stock.map((s) => [s.codigo || '—', s.nombre, s.stock, s.stockMinimo, s.estado]),
    theme: 'striped',
    headStyles: { fillColor: [55, 65, 81] },
  });
  abrir(pdf, `reporte_${desde}_${hasta}.pdf`);
};
