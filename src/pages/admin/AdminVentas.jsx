import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import VentaForm from '../../components/admin/VentaForm';
import MotivoModal from '../../components/admin/MotivoModal';
import { anularVenta, marcarVentaEntregada, medir } from '../../services/ventasService';
import { generarNotaVenta } from '../../utils/pdfVentas';
import { formatPrice } from '../../utils/images';
import { formatoFecha, formatoFechaHora, hoyISO } from '../../utils/fechas';
import { STOCK_MINIMO_DEFAULT } from '../../config/app';
import { Link, useOutletContext } from 'react-router-dom';

/** Registro y gestión de ventas en tienda (RF13–RF19). */
const AdminVentas = () => {
  const { nombre } = useOutletContext() || {};
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
      <div className="max-w-6xl mx-auto">
        <VentaForm
          muebles={muebles}
          ventaACorregir={modo === 'corregir' ? ventaSel : null}
          onGuardado={alGuardar}
          onCancel={() => { setModo('lista'); setVentaSel(null); }}
        />
      </div>
    );
  }

  const hoy = hoyISO();
  const deHoy = ventas.filter((v) => v.fecha === hoy && v.estado === 'registrada');
  const indicadores = [
    { texto: 'Vendido hoy', valor: formatPrice(deHoy.reduce((s, v) => s + (v.total || 0), 0)) },
    { texto: 'Ventas hoy', valor: deHoy.length },
    { texto: 'Por entregar', valor: ventas.filter((v) => v.estado === 'registrada' && !v.entregada).length },
    { texto: 'Muebles con stock bajo', valor: muebles.filter((m) => (Number(m.stock) || 0) <= (m.stockMinimo ?? STOCK_MINIMO_DEFAULT)).length, aviso: true },
  ];
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  const estadoVenta = (v) => (v.estado === 'anulada'
    ? { texto: 'Anulada', clase: 'bg-arena text-cafe line-through' }
    : v.entregada ? { texto: 'Entregada', clase: 'bg-green-50 text-exito' } : { texto: 'Por entregar', clase: 'bg-orange-100 text-orange-800' });
  const claseFiltro = 'h-11 px-3 rounded-2xl border border-gray-400 bg-white outline-none focus:border-terracota focus:ring-4 focus:ring-terracota/25 transition';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold">{saludo}{nombre && nombre !== 'Usuario' ? `, ${nombre.split(' ')[0]}` : ''}</h2>
          <p className="text-cafe">Ventas en tienda</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/disponibilidad" className="h-12 px-5 inline-flex items-center gap-2 rounded-full bg-white border border-linea font-extrabold hover:bg-arena transition">
            <i className="fas fa-search"></i>Consultar stock
          </Link>
          <button type="button" onClick={() => setModo('nueva')} className="group h-12 px-6 inline-flex items-center gap-2 rounded-full bg-terracota text-espresso font-extrabold hover:bg-terracota-claro shadow-sm transition">
            <i className="fas fa-plus transition-transform group-hover:rotate-90"></i>Nueva venta
          </button>
        </div>
      </div>

      {aviso && (
        <div role="status" className={`p-4 rounded-2xl flex flex-wrap justify-between items-center gap-3 animate-fade-in-down ${aviso.tipo === 'ok' ? 'bg-espresso text-hueso' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          <span className="flex items-center gap-3 font-semibold">
            {aviso.tipo === 'ok' && <span className="w-9 h-9 rounded-full bg-terracota text-espresso flex items-center justify-center animate-aparecer"><i className="fas fa-check"></i></span>}
            {aviso.texto}
          </span>
          <span className="flex items-center gap-2">
            {aviso.venta && <button type="button" onClick={() => generarNotaVenta(aviso.venta)} className="h-10 px-4 rounded-full bg-hueso text-espresso font-extrabold text-sm hover:bg-white transition"><i className="fas fa-file-pdf mr-2"></i>Nota de venta</button>}
            <button type="button" onClick={() => setAviso(null)} className="w-10 h-10 rounded-full hover:bg-white/10" aria-label="Cerrar aviso"><i className="fas fa-times"></i></button>
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {indicadores.map((k, i) => (
          <div key={k.texto} className={`rounded-3xl px-5 py-4 animate-fade-in-up ${k.aviso && k.valor > 0 ? 'bg-aviso-fondo text-aviso' : 'bg-white'}`} style={{ animationDelay: `${i * 60}ms` }}>
            <span className="block text-[13px] font-bold opacity-80">{k.texto}</span>
            <strong className="font-display text-[28px] font-semibold">{cargando ? '—' : k.valor}</strong>
          </div>
        ))}
      </div>

      <section className="bg-white rounded-3xl p-4 sm:p-5 flex flex-col gap-4" aria-labelledby="titulo-ventas">
        <div className="flex flex-wrap items-end gap-3">
          <h3 id="titulo-ventas" className="font-display text-2xl font-semibold mr-auto">Ventas registradas</h3>
          <label className="flex flex-col text-xs font-bold text-cafe gap-1">Desde<input type="date" value={filtro.desde} onChange={(e) => setFiltro({ ...filtro, desde: e.target.value })} className={claseFiltro} /></label>
          <label className="flex flex-col text-xs font-bold text-cafe gap-1">Hasta<input type="date" value={filtro.hasta} onChange={(e) => setFiltro({ ...filtro, hasta: e.target.value })} className={claseFiltro} /></label>
          <label className="flex flex-col text-xs font-bold text-cafe gap-1">Estado
            <select value={filtro.estado} onChange={(e) => setFiltro({ ...filtro, estado: e.target.value })} className={claseFiltro}>
              <option value="todas">Todas</option><option value="registradas">Registradas</option><option value="anuladas">Anuladas</option>
            </select>
          </label>
          <label className="flex flex-col text-xs font-bold text-cafe gap-1 grow sm:grow-0 sm:w-64">Buscar
            <input type="search" placeholder="Código, cliente o boleta" value={filtro.texto} onChange={(e) => setFiltro({ ...filtro, texto: e.target.value })} className={claseFiltro} />
          </label>
        </div>

        {cargando ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-[72px] rounded-2xl bg-arena animate-pulse"></div>)}
          </div>
        ) : visibles.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-linea">
            <i className="fas fa-receipt text-3xl text-piedra mb-2"></i>
            <p className="font-bold">No hay ventas con estos filtros.</p>
            <button type="button" onClick={() => setModo('nueva')} className="mt-3 font-extrabold text-terracota-oscuro hover:underline">Registrar una venta</button>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {visibles.map((v, idx) => {
              const est = estadoVenta(v);
              const unidades = (v.items || []).reduce((s, it) => s + it.cantidad, 0);
              const resumen = (v.items || []).map((it) => `${it.nombre} × ${it.cantidad}`).join(', ');
              const editable = v.estado === 'registrada' && !v.entregada;
              return (
                <li key={v.id} className={`rounded-2xl bg-hueso animate-fade-in-up ${v.estado === 'anulada' ? 'opacity-70' : ''}`} style={{ animationDelay: `${Math.min(idx, 10) * 30}ms` }}>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 sm:px-4">
                    <button
                      type="button"
                      onClick={() => setAbierta(abierta === v.id ? null : v.id)}
                      aria-expanded={abierta === v.id}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    >
                      <span className="w-11 h-11 rounded-2xl bg-arena flex items-center justify-center shrink-0">
                        <i className={`fas fa-chevron-right text-xs transition-transform duration-300 ${abierta === v.id ? 'rotate-90' : ''}`}></i>
                      </span>
                      <span className="min-w-0">
                        <span className="block font-bold truncate">{resumen || `${unidades} muebles`}</span>
                        <span className="block text-[13px] text-cafe truncate">{v.codigo} · {formatoFecha(v.fecha)} · {v.cliente?.nombres} {v.cliente?.apellidos} · <span className="capitalize">{v.pago?.metodo}</span></span>
                      </span>
                    </button>
                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${est.clase}`}>{est.texto}</span>
                    <strong className="w-28 text-right text-[17px]">{formatPrice(v.total || 0)}</strong>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => generarNotaVenta(v)} className="w-10 h-10 rounded-full hover:bg-arena transition" aria-label={`Nota de venta ${v.codigo}`} title="Nota de venta (PDF)"><i className="fas fa-file-pdf"></i></button>
                      {editable && (
                        <>
                          <button type="button" onClick={() => entregar(v)} className="w-10 h-10 rounded-full hover:bg-green-50 hover:text-exito transition" aria-label={`Marcar ${v.codigo} como entregada`} title="Marcar entregada"><i className="fas fa-truck"></i></button>
                          <button type="button" onClick={() => { setVentaSel(v); setModo('corregir'); }} className="w-10 h-10 rounded-full hover:bg-orange-100 hover:text-orange-800 transition" aria-label={`Corregir ${v.codigo}`} title="Corregir"><i className="fas fa-pen"></i></button>
                          <button type="button" onClick={() => setAnulando(v)} className="w-10 h-10 rounded-full hover:bg-red-50 hover:text-red-700 transition" aria-label={`Anular ${v.codigo}`} title="Anular"><i className="fas fa-ban"></i></button>
                        </>
                      )}
                    </div>
                  </div>
                  {abierta === v.id && (
                    <div className="px-4 sm:pl-[72px] pb-4 text-sm text-cafe grid gap-1.5 animate-fade-in-down">
                      <div><b className="text-espresso">Dirección:</b> {v.cliente?.direccion} · <b className="text-espresso">Celular:</b> {v.cliente?.celular || '—'} · <b className="text-espresso">Tipo:</b> {v.tipo === 'pedido' ? 'Pedido' : 'En tienda'}</div>
                      <div><b className="text-espresso">Detalle:</b> {(v.items || []).map((it) => `${it.codigo || ''} ${it.nombre} × ${it.cantidad} (${formatPrice(it.precioUnit)})`).join(' · ')}</div>
                      <div><b className="text-espresso">Boleta:</b> {v.pago?.numeroBoleta} · <b className="text-espresso">Recibido:</b> {formatPrice(v.pago?.montoRecibido || 0)} · <b className="text-espresso">Vuelto:</b> {formatPrice(v.pago?.vuelto || 0)}</div>
                      <div><b className="text-espresso">Registrada por:</b> {v.registradoPor?.email} · <b className="text-espresso">Creada:</b> {formatoFechaHora(v.creadoEn)} · <b className="text-espresso">Duración del formulario:</b> {v.medicion?.duracionSeg ?? '—'} s · <b className="text-espresso">Versión:</b> {v.medicion?.version}</div>
                      {v.pago?.capturaUrl && <div><a href={v.pago.capturaUrl} target="_blank" rel="noreferrer" className="font-bold underline">Ver captura de Yape</a></div>}
                      {(v.historial || []).length > 0 && (
                        <div><b className="text-espresso">Historial:</b> {(v.historial || []).map((h) => `${formatoFechaHora(h.fecha)} ${h.accion}${h.motivo ? ` (${h.motivo})` : ''} – ${h.usuario || ''}`).join(' · ')}</div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-right text-sm text-cafe">{visibles.length} ventas · Total registrado: <b className="text-espresso">{formatPrice(totalVisible)}</b></p>
      </section>

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
