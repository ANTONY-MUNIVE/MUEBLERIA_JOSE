import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import VentaForm from '../../components/admin/VentaForm';
import MotivoModal from '../../components/admin/MotivoModal';
import { anularVenta, marcarVentaEntregada, medir } from '../../services/ventasService';
import { generarNotaVenta } from '../../utils/pdfVentas';
import { formatPrice } from '../../utils/images';
import { formatoFecha, formatoFechaHora, hoyISO } from '../../utils/fechas';

/** Registro y gestión de ventas en tienda (RF13–RF19). */
const AdminVentas = () => {
  const [ventas, setVentas] = useState([]);
  const [muebles, setMuebles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modo, setModo] = useState('lista'); // lista | nueva | corregir
  const [ventaSel, setVentaSel] = useState(null);
  const [anulando, setAnulando] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [abierta, setAbierta] = useState(null);
  const [filtro, setFiltro] = useState({ desde: '', hasta: hoyISO(), estado: 'todas', texto: '' });

  const cargar = useCallback(async () => {
    try {
      const [vSnap, mSnap] = await Promise.all([
        getDocs(query(collection(db, 'ventas'), orderBy('creadoEn', 'desc'), limit(500))),
        getDocs(collection(db, 'muebles')),
      ]);
      setVentas(vSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setMuebles(mSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      setAviso({ tipo: 'error', texto: 'No se pudieron cargar las ventas. Revise la conexión o los permisos de Firestore.' });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const visibles = useMemo(() => ventas.filter((v) => {
    if (filtro.desde && v.fecha < filtro.desde) return false;
    if (filtro.hasta && v.fecha > filtro.hasta) return false;
    if (filtro.estado === 'registradas' && v.estado !== 'registrada') return false;
    if (filtro.estado === 'anuladas' && v.estado !== 'anulada') return false;
    if (filtro.texto) {
      const t = filtro.texto.toLowerCase();
      const c = v.cliente || {};
      const blob = `${v.codigo} ${c.nombres} ${c.apellidos} ${v.pago?.numeroBoleta}`.toLowerCase();
      if (!blob.includes(t)) return false;
    }
    return true;
  }), [ventas, filtro]);

  const totalVisible = visibles.filter((v) => v.estado === 'registrada').reduce((s, v) => s + (v.total || 0), 0);

  const alGuardar = (venta, accion) => {
    setModo('lista');
    setVentaSel(null);
    const seg = venta.medicion?.duracionSeg;
    setAviso({ tipo: 'ok', texto: `Venta ${venta.codigo} ${accion}${accion === 'registrada' && seg ? ` (formulario completado en ${seg} s)` : ''}.`, venta });
    if (accion === 'registrada') generarNotaVenta(venta);
    cargar();
  };

  const confirmarAnulacion = async (motivo) => {
    await medir('anular_venta', () => anularVenta(anulando.id, motivo));
    setAviso({ tipo: 'ok', texto: `Venta ${anulando.codigo} anulada; el stock fue devuelto.` });
    setAnulando(null);
    cargar();
  };

  const entregar = async (v) => {
    if (!window.confirm(`¿Marcar la venta ${v.codigo} como entregada? Después ya no podrá corregirse ni anularse.`)) return;
    try {
      await marcarVentaEntregada(v.id);
      cargar();
    } catch (err) {
      setAviso({ tipo: 'error', texto: err.message });
    }
  };

  if (modo !== 'lista') {
    return (
      <div className="max-w-5xl mx-auto">
        <VentaForm
          muebles={muebles}
          ventaACorregir={modo === 'corregir' ? ventaSel : null}
          onGuardado={alGuardar}
          onCancel={() => { setModo('lista'); setVentaSel(null); }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Ventas en tienda</h1>
        <button onClick={() => setModo('nueva')} className="bg-orange-600 text-white px-5 py-2.5 rounded-lg hover:bg-orange-700 font-bold shadow flex items-center gap-2">
          <i className="fas fa-plus"></i> Nueva venta
        </button>
      </div>

      {aviso && (
        <div className={`mb-4 p-3 rounded-lg text-sm flex justify-between items-center ${aviso.tipo === 'ok' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          <span>{aviso.texto}</span>
          <span className="flex gap-3">
            {aviso.venta && <button onClick={() => generarNotaVenta(aviso.venta)} className="font-bold underline">Nota de venta</button>}
            <button onClick={() => setAviso(null)} title="Cerrar"><i className="fas fa-times"></i></button>
          </span>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl shadow border border-gray-200 mb-4 grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
        <label className="flex flex-col">Desde<input type="date" value={filtro.desde} onChange={(e) => setFiltro({ ...filtro, desde: e.target.value })} className="border rounded p-2" /></label>
        <label className="flex flex-col">Hasta<input type="date" value={filtro.hasta} onChange={(e) => setFiltro({ ...filtro, hasta: e.target.value })} className="border rounded p-2" /></label>
        <label className="flex flex-col">Estado
          <select value={filtro.estado} onChange={(e) => setFiltro({ ...filtro, estado: e.target.value })} className="border rounded p-2">
            <option value="todas">Todas</option><option value="registradas">Registradas</option><option value="anuladas">Anuladas</option>
          </select>
        </label>
        <label className="flex flex-col md:col-span-2">Buscar (código, cliente o boleta)<input value={filtro.texto} onChange={(e) => setFiltro({ ...filtro, texto: e.target.value })} className="border rounded p-2" /></label>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-x-auto">
        {cargando ? (
          <div className="p-8 text-center text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i>Cargando ventas...</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-bold">
              <tr>
                <th className="p-3">Código</th><th className="p-3">Fecha</th><th className="p-3">Cliente</th>
                <th className="p-3">Muebles</th><th className="p-3">Total</th><th className="p-3">Pago</th>
                <th className="p-3">Boleta</th><th className="p-3">Estado</th><th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibles.map((v) => (
                <React.Fragment key={v.id}>
                  <tr className={`hover:bg-gray-50 ${v.estado === 'anulada' ? 'opacity-60' : ''}`}>
                    <td className="p-3 font-bold">
                      <button onClick={() => setAbierta(abierta === v.id ? null : v.id)} className="hover:underline">
                        <i className={`fas fa-chevron-${abierta === v.id ? 'down' : 'right'} text-xs mr-1`}></i>{v.codigo}
                      </button>
                    </td>
                    <td className="p-3">{formatoFecha(v.fecha)}</td>
                    <td className="p-3">{v.cliente?.nombres} {v.cliente?.apellidos}</td>
                    <td className="p-3">{(v.items || []).reduce((s, it) => s + it.cantidad, 0)}</td>
                    <td className="p-3 font-bold">{formatPrice(v.total || 0)}</td>
                    <td className="p-3 capitalize">{v.pago?.metodo}</td>
                    <td className="p-3">{v.pago?.numeroBoleta}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${v.estado === 'anulada' ? 'bg-red-100 text-red-700' : v.entregada ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>
                        {v.estado === 'anulada' ? 'Anulada' : v.entregada ? 'Entregada' : 'Por entregar'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => generarNotaVenta(v)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-700 hover:text-white" title="Nota de venta PDF"><i className="fas fa-file-pdf text-xs"></i></button>
                        {v.estado === 'registrada' && !v.entregada && (
                          <>
                            <button onClick={() => entregar(v)} className="w-8 h-8 rounded-full bg-green-100 text-green-700 hover:bg-green-600 hover:text-white" title="Marcar entregada"><i className="fas fa-truck text-xs"></i></button>
                            <button onClick={() => { setVentaSel(v); setModo('corregir'); }} className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white" title="Corregir"><i className="fas fa-pen text-xs"></i></button>
                            <button onClick={() => setAnulando(v)} className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-600 hover:text-white" title="Anular"><i className="fas fa-ban text-xs"></i></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {abierta === v.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={9} className="p-4 text-xs text-gray-700 space-y-2">
                        <div><b>Dirección:</b> {v.cliente?.direccion} · <b>Celular:</b> {v.cliente?.celular || '—'} · <b>Tipo:</b> {v.tipo === 'pedido' ? 'Pedido' : 'Stock'}</div>
                        <div><b>Detalle:</b> {(v.items || []).map((it) => `${it.codigo || ''} ${it.nombre} × ${it.cantidad} (${formatPrice(it.precioUnit)})`).join(' · ')}</div>
                        <div><b>Registrada por:</b> {v.registradoPor?.email} · <b>Creada:</b> {formatoFechaHora(v.creadoEn)} · <b>Duración del formulario:</b> {v.medicion?.duracionSeg ?? '—'} s · <b>Versión:</b> {v.medicion?.version}</div>
                        {v.pago?.capturaUrl && <div><a href={v.pago.capturaUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Ver captura de Yape</a></div>}
                        {(v.historial || []).length > 0 && (
                          <div><b>Historial:</b> {(v.historial || []).map((h) => `${formatoFechaHora(h.fecha)} ${h.accion}${h.motivo ? ` (${h.motivo})` : ''} – ${h.usuario || ''}`).join(' · ')}</div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
        {!cargando && visibles.length === 0 && <div className="p-8 text-center text-gray-400">No hay ventas con estos filtros.</div>}
      </div>
      <p className="text-right text-sm text-gray-600 mt-2">{visibles.length} ventas · Total registrado: <b>{formatPrice(totalVisible)}</b></p>

      {anulando && (
        <MotivoModal
          titulo={`Anular la venta ${anulando.codigo}`}
          descripcion="Las unidades vendidas volverán al stock y quedará registrado el movimiento. Esta acción no se puede deshacer."
          textoBoton="Anular venta"
          peligro
          onConfirmar={confirmarAnulacion}
          onCancelar={() => setAnulando(null)}
        />
      )}
    </div>
  );
};

export default AdminVentas;
