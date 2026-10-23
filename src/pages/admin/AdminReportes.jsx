import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { leerVarias } from '../../utils/firestoreSeguro';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import { db } from '../../firebase/config';
import { formatPrice } from '../../utils/images';
import { hoyISO, inicioSemana, inicioMes, formatoFecha, formatoFechaHora } from '../../utils/fechas';
import { generarReportePDF } from '../../utils/pdfVentas';
import { modoMedicionActivo, setModoMedicion } from '../../services/ventasService';
import { APP_VERSION, STOCK_MINIMO_DEFAULT, TIPOS_MOVIMIENTO } from '../../config/app';

const diaLocal = (iso) => (iso ? hoyISO(new Date(iso)) : '');
const sumarDias = (fecha, n) => { const [y, m, d] = fecha.split('-').map(Number); return hoyISO(new Date(y, m - 1, d + n)); };

/** Reportes de ventas y stock (RF25) y exportación de datos para la tesis. */
const AdminReportes = () => {
  const [periodo, setPeriodo] = useState('semana');
  const [rango, setRango] = useState({ desde: inicioSemana(), hasta: hoyISO() });
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [medicion, setMedicion] = useState(modoMedicionActivo());

  // Cada colección se lee por separado para que un permiso faltante no deje todo el reporte vacío
  const cargar = useCallback((desde, hasta) => {
    const desdeAmplio = `${sumarDias(desde, -1)}T00:00:00`;
    const hastaAmplio = `${sumarDias(hasta, 1)}T23:59:59`;
    return leerVarias({
      ventas: getDocs(query(collection(db, 'ventas'), where('fecha', '>=', desde), where('fecha', '<=', hasta))),
      muebles: getDocs(collection(db, 'muebles')),
      movimientos: getDocs(query(collection(db, 'movimientos'), where('fechaCliente', '>=', desdeAmplio), where('fechaCliente', '<=', hastaAmplio))),
      metricas: getDocs(query(collection(db, 'metricas'), where('fechaCliente', '>=', desdeAmplio), where('fechaCliente', '<=', hastaAmplio))),
    }).then(({ datos: d, errores }) => {
      const enRango = (x) => { const dia = diaLocal(x.fechaCliente); return dia >= desde && dia <= hasta; };
      setDatos({
        ventas: d.ventas,
        muebles: d.muebles,
        movimientos: d.movimientos.filter(enRango),
        metricas: d.metricas.filter(enRango),
        error: errores.length ? errores.join(' ') : undefined,
      });
      setCargando(false);
    });
  }, []);

  useEffect(() => { cargar(rango.desde, rango.hasta); }, [cargar, rango]);

  const cambiarRango = (nuevo) => { setCargando(true); setRango(nuevo); };

  const elegirPeriodo = (p) => {
    setPeriodo(p);
    if (p === 'semana') cambiarRango({ desde: inicioSemana(), hasta: hoyISO() });
    if (p === 'mes') cambiarRango({ desde: inicioMes(), hasta: hoyISO() });
  };

  const r = useMemo(() => {
    if (!datos) return null;
    const reg = datos.ventas.filter((v) => v.estado === 'registrada');
    const total = reg.reduce((s, v) => s + (v.total || 0), 0);
    const unidades = reg.reduce((s, v) => s + (v.items || []).reduce((a, it) => a + it.cantidad, 0), 0);
    const porMetodo = ['efectivo', 'yape'].map((m) => ({
      metodo: m === 'yape' ? 'Yape' : 'Efectivo',
      ventas: reg.filter((v) => v.pago?.metodo === m).length,
      monto: reg.filter((v) => v.pago?.metodo === m).reduce((s, v) => s + (v.total || 0), 0),
    }));
    const mapa = {};
    reg.forEach((v) => (v.items || []).forEach((it) => {
      mapa[it.muebleId] = mapa[it.muebleId] || { codigo: it.codigo, nombre: it.nombre, unidades: 0, monto: 0 };
      mapa[it.muebleId].unidades += it.cantidad;
      mapa[it.muebleId].monto += it.subtotal || 0;
    }));
    const porDia = {};
    reg.forEach((v) => { porDia[v.fecha] = (porDia[v.fecha] || 0) + (v.total || 0); });
    const stock = datos.muebles.map((m) => {
      const s = Number(m.stock) || 0; const min = m.stockMinimo ?? STOCK_MINIMO_DEFAULT;
      return { codigo: m.codigo, nombre: m.nombre, stock: s, stockMinimo: min, estado: s <= 0 ? 'Agotado' : s <= min ? 'Stock bajo' : 'Normal' };
    }).sort((a, b) => a.stock - b.stock);
    return {
      resumen: { registradas: reg.length, anuladas: datos.ventas.length - reg.length, unidades, total, ticket: reg.length ? total / reg.length : 0 },
      porMetodo,
      porMueble: Object.values(mapa).sort((a, b) => b.unidades - a.unidades),
      porDia: Object.keys(porDia).sort().map((f) => ({ fecha: formatoFecha(f).slice(0, 5), total: Number(porDia[f].toFixed(2)) })),
      stock,
    };
  }, [datos]);

  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();
    const hoja = (nombre, filas) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas.length ? filas : [{ Sin: 'datos' }]), nombre);
    hoja('Ventas', datos.ventas.map((v) => ({
      Código: v.codigo, Fecha: v.fecha, Tipo: v.tipo, Cliente: `${v.cliente?.nombres || ''} ${v.cliente?.apellidos || ''}`,
      Dirección: v.cliente?.direccion, Celular: v.cliente?.celular, 'N.° muebles': (v.items || []).reduce((s, it) => s + it.cantidad, 0),
      Total: v.total, Método: v.pago?.metodo, 'Monto recibido': v.pago?.montoRecibido, Boleta: v.pago?.numeroBoleta,
      Estado: v.estado, Entregada: v.entregada ? 1 : 0, Correcciones: v.correcciones || 0,
      'Formulario abierto': v.medicion?.abiertoEn ? formatoFechaHora(v.medicion.abiertoEn) : '',
      'Guardado': v.medicion?.guardadoEn ? formatoFechaHora(v.medicion.guardadoEn) : '',
      'Duración formulario (s)': v.medicion?.duracionSeg ?? '', Versión: v.medicion?.version, Usuario: v.registradoPor?.email,
    })));
    hoja('Detalle', datos.ventas.flatMap((v) => (v.items || []).map((it) => ({ Venta: v.codigo, Fecha: v.fecha, Estado: v.estado, 'Cód. producto': it.codigo, Mueble: it.nombre, Cantidad: it.cantidad, 'Precio unit.': it.precioUnit, Subtotal: it.subtotal }))));
    hoja('Movimientos', datos.movimientos.sort((a, b) => String(a.fechaCliente).localeCompare(String(b.fechaCliente))).map((m) => ({
      'Fecha y hora': formatoFechaHora(m.fechaCliente), Tipo: TIPOS_MOVIMIENTO[m.tipo] || m.tipo, 'Cód. producto': m.codigo, Mueble: m.nombre,
      Cantidad: m.cantidad, 'Stock antes': m.stockAntes, 'Stock después': m.stockDespues, Motivo: m.motivo, Documento: m.documento, Usuario: m.usuario,
    })));
    hoja('Stock actual', r.stock.map((s) => ({ 'Cód. producto': s.codigo, Mueble: s.nombre, 'Registrada (R)': s.stock, 'Stock mínimo': s.stockMinimo, Estado: s.estado, 'Corte': formatoFechaHora(new Date()) })));
    hoja('Métricas', datos.metricas.map((m) => ({ 'Fecha y hora': formatoFechaHora(m.fechaCliente), Operación: m.operacion, 'Tiempo (ms)': m.ms, Conexión: m.conexion, 'En línea': m.online ? 1 : 0, Versión: m.version, Usuario: m.usuario })));
    XLSX.writeFile(wb, `datos_tesis_${rango.desde}_${rango.hasta}.xlsx`);
  };

  const alternarMedicion = () => { setModoMedicion(!medicion); setMedicion(!medicion); };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Reportes de ventas y stock</h1>
        <div className="flex gap-2">
          <button disabled={!r} onClick={() => generarReportePDF({ ...rango, ...r })} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-700 disabled:opacity-50"><i className="fas fa-file-pdf mr-2"></i>Reporte PDF</button>
          <button disabled={!r} onClick={exportarExcel} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"><i className="fas fa-file-excel mr-2"></i>Datos para la tesis (Excel)</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow border mb-4 flex flex-wrap items-end gap-3 text-sm">
        {[['semana', 'Esta semana'], ['mes', 'Este mes'], ['personalizado', 'Personalizado']].map(([id, l]) => (
          <button key={id} onClick={() => elegirPeriodo(id)} className={`px-3 py-2 rounded-lg border font-bold ${periodo === id ? 'bg-orange-600 text-white border-orange-600' : 'bg-white'}`}>{l}</button>
        ))}
        {periodo === 'personalizado' && (
          <>
            <label className="flex flex-col">Desde<input type="date" value={rango.desde} max={rango.hasta} onChange={(e) => e.target.value && cambiarRango({ ...rango, desde: e.target.value })} className="border rounded p-2" /></label>
            <label className="flex flex-col">Hasta<input type="date" value={rango.hasta} min={rango.desde} onChange={(e) => e.target.value && cambiarRango({ ...rango, hasta: e.target.value })} className="border rounded p-2" /></label>
          </>
        )}
        <span className="text-gray-500 ml-auto">{formatoFecha(rango.desde)} al {formatoFecha(rango.hasta)}</span>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <b>Modo medición en este dispositivo:</b> {medicion ? 'activo' : 'inactivo'} · versión {APP_VERSION}
          <div className="text-xs text-blue-800">Cuando está activo, cada venta, consulta y movimiento guarda su tiempo de respuesta en la hoja «Métricas» (indicador ED1).</div>
        </div>
        <button onClick={alternarMedicion} className={`px-4 py-2 rounded-lg font-bold ${medicion ? 'bg-blue-600 text-white' : 'bg-white border border-blue-300 text-blue-700'}`}>{medicion ? 'Desactivar' : 'Activar'}</button>
      </div>

      {cargando || !r ? <div className="p-8 text-center text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i>Cargando...</div> : (
        <>
          {datos.error && <p className="text-red-600 mb-3">{datos.error}</p>}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            {[['Ventas', r.resumen.registradas], ['Anuladas', r.resumen.anuladas], ['Unidades', r.resumen.unidades], ['Total vendido', formatPrice(r.resumen.total)], ['Ticket promedio', formatPrice(r.resumen.ticket)]].map(([l, v]) => (
              <div key={l} className="bg-white p-4 rounded-xl border shadow-sm"><div className="text-xs text-gray-500">{l}</div><div className="text-xl font-bold">{v}</div></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="bg-white p-4 rounded-xl border shadow-sm h-64">
              <h3 className="font-bold text-sm mb-2">Ventas por día (S/)</h3>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={r.porDia}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="fecha" /><YAxis /><Tooltip /><Bar dataKey="total" fill="#ea580c" /></BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white p-4 rounded-xl border shadow-sm overflow-auto h-64">
              <h3 className="font-bold text-sm mb-2">Muebles más vendidos</h3>
              <table className="w-full text-sm"><tbody className="divide-y">
                {r.porMueble.map((m) => <tr key={`${m.codigo}${m.nombre}`}><td className="py-1">{m.codigo}</td><td>{m.nombre}</td><td className="text-right">{m.unidades} u.</td><td className="text-right">{formatPrice(m.monto)}</td></tr>)}
                {r.porMueble.length === 0 && <tr><td className="text-gray-400 py-2">Sin ventas en el periodo.</td></tr>}
              </tbody></table>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border shadow-sm overflow-auto">
            <h3 className="font-bold text-sm mb-2">Stock actual</h3>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-500"><tr><th className="text-left">Código</th><th className="text-left">Mueble</th><th className="text-right">Stock</th><th className="text-right">Mínimo</th><th>Estado</th></tr></thead>
              <tbody className="divide-y">
                {r.stock.map((s) => (
                  <tr key={`${s.codigo}${s.nombre}`}><td className="py-1">{s.codigo}</td><td>{s.nombre}</td><td className="text-right font-bold">{s.stock}</td><td className="text-right">{s.stockMinimo}</td>
                    <td className="text-center"><span className={`px-2 py-0.5 rounded text-xs font-bold ${s.estado === 'Agotado' ? 'bg-red-100 text-red-700' : s.estado === 'Stock bajo' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-700'}`}>{s.estado}</span></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminReportes;
