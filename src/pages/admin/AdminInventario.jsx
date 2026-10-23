import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db } from '../../firebase/config';
import { registrarMovimientoInventario, generarCodigosFaltantes, medir } from '../../services/ventasService';
import { validarMovimiento } from '../../utils/validaciones';
import { formatoFechaHora } from '../../utils/fechas';
import { STOCK_MINIMO_DEFAULT, TIPOS_MOVIMIENTO } from '../../config/app';

const estadoStock = (m) => {
  const s = Number(m.stock) || 0;
  const min = m.stockMinimo ?? STOCK_MINIMO_DEFAULT;
  if (s <= 0) return { t: 'Agotado', c: 'bg-red-100 text-red-700' };
  if (s <= min) return { t: 'Stock bajo', c: 'bg-yellow-100 text-yellow-800' };
  return { t: 'Normal', c: 'bg-green-100 text-green-700' };
};

/** Formulario de ingreso o ajuste por conteo físico (RF22). */
const MovimientoForm = ({ mueble, tipo, onCerrar, onGuardado }) => {
  const [form, setForm] = useState({ cantidad: '', conteoFisico: '', motivo: tipo === 'ingreso' ? 'Ingreso de mercadería' : 'Ajuste por conteo físico', documento: '' });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const stock = Number(mueble.stock) || 0;

  const guardar = async (e) => {
    e.preventDefault();
    const errs = validarMovimiento({ ...form, tipo, muebleId: mueble.id }, stock);
    setErrores(errs);
    if (Object.keys(errs).length) return;
    setEnviando(true);
    try {
      await medir('movimiento_inventario', () => registrarMovimientoInventario({ ...form, tipo, muebleId: mueble.id }));
      onGuardado();
    } catch (err) {
      setErrores({ general: err.message });
      setEnviando(false);
    }
  };

  const diferencia = form.conteoFisico !== '' ? Number(form.conteoFisico) - stock : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={guardar} className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4" noValidate>
        <h3 className="text-lg font-bold">{tipo === 'ingreso' ? 'Registrar ingreso' : 'Ajuste por conteo físico'}</h3>
        <p className="text-sm text-gray-600">{mueble.codigo || 'SIN CÓDIGO'} — {mueble.nombre} · Stock registrado: <b>{stock}</b></p>
        {tipo === 'ingreso' ? (
          <label className="block text-sm font-bold">Cantidad que ingresa
            <input type="number" min="1" step="1" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} className="w-full border rounded-lg p-2.5 mt-1 font-normal" />
            {errores.cantidad && <span className="text-xs text-red-600 font-normal">{errores.cantidad}</span>}
          </label>
        ) : (
          <label className="block text-sm font-bold">Cantidad física contada
            <input type="number" min="0" step="1" value={form.conteoFisico} onChange={(e) => setForm({ ...form, conteoFisico: e.target.value })} className="w-full border rounded-lg p-2.5 mt-1 font-normal" />
            {diferencia !== null && !Number.isNaN(diferencia) && <span className="text-xs text-gray-600 font-normal">Diferencia: {diferencia > 0 ? '+' : ''}{diferencia}</span>}
            {errores.conteoFisico && <span className="block text-xs text-red-600 font-normal">{errores.conteoFisico}</span>}
          </label>
        )}
        <label className="block text-sm font-bold">Motivo
          <input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} className="w-full border rounded-lg p-2.5 mt-1 font-normal" />
          {errores.motivo && <span className="text-xs text-red-600 font-normal">{errores.motivo}</span>}
        </label>
        <label className="block text-sm font-bold">Documento (guía, nota u otro)
          <input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} className="w-full border rounded-lg p-2.5 mt-1 font-normal" />
        </label>
        {errores.general && <p className="text-sm text-red-600">{errores.general}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCerrar} className="px-4 py-2 font-bold text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button type="submit" disabled={enviando} className="px-4 py-2 font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg disabled:opacity-60">{enviando ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </form>
    </div>
  );
};

/** Historial de movimientos de un mueble (kárdex, RF23). */
const Kardex = ({ mueble, onCerrar }) => {
  const [movs, setMovs] = useState(null);
  useEffect(() => {
    getDocs(query(collection(db, 'movimientos'), where('muebleId', '==', mueble.id)))
      .then((snap) => setMovs(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.fechaCliente).localeCompare(String(a.fechaCliente)))))
      .catch((err) => { console.error(err); setMovs([]); });
  }, [mueble.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="p-5 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold">Historial de movimientos: {mueble.codigo || ''} {mueble.nombre}</h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-red-500"><i className="fas fa-times text-xl"></i></button>
        </div>
        <div className="overflow-auto p-5">
          {movs === null ? <p className="text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i>Cargando...</p> : movs.length === 0 ? <p className="text-gray-500">Sin movimientos registrados.</p> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600"><tr>
                <th className="p-2 text-left">Fecha</th><th className="p-2 text-left">Tipo</th><th className="p-2 text-right">Cantidad</th>
                <th className="p-2 text-right">Stock</th><th className="p-2 text-left">Motivo</th><th className="p-2 text-left">Documento</th><th className="p-2 text-left">Usuario</th>
              </tr></thead>
              <tbody className="divide-y">
                {movs.map((m) => (
                  <tr key={m.id}>
                    <td className="p-2 whitespace-nowrap">{formatoFechaHora(m.fechaCliente)}</td>
                    <td className="p-2">{TIPOS_MOVIMIENTO[m.tipo] || m.tipo}</td>
                    <td className={`p-2 text-right font-bold ${m.cantidad < 0 ? 'text-red-600' : 'text-green-700'}`}>{m.cantidad > 0 ? '+' : ''}{m.cantidad}</td>
                    <td className="p-2 text-right whitespace-nowrap">{m.stockAntes} → {m.stockDespues}</td>
                    <td className="p-2">{m.motivo}</td><td className="p-2">{m.documento}</td><td className="p-2 text-xs">{m.usuario}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

/** Control de inventario: stock, ingresos, ajustes y kárdex (RF22–RF24). */
const AdminInventario = () => {
  const [muebles, setMuebles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [mov, setMov] = useState(null); // { mueble, tipo }
  const [kardex, setKardex] = useState(null);
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'muebles'));
      setMuebles(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      setAviso('No se pudo cargar el inventario.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const lista = useMemo(() => {
    const t = busqueda.toLowerCase();
    return muebles
      .filter((m) => !t || `${m.codigo} ${m.nombre} ${m.color}`.toLowerCase().includes(t))
      .sort((a, b) => String(a.codigo || 'ZZZ').localeCompare(String(b.codigo || 'ZZZ')));
  }, [muebles, busqueda]);

  const sinCodigo = muebles.filter((m) => !m.codigo).length;
  const bajos = muebles.filter((m) => (Number(m.stock) || 0) <= (m.stockMinimo ?? STOCK_MINIMO_DEFAULT)).length;

  const generarCodigos = async () => {
    if (!window.confirm(`Se asignará un código a ${sinCodigo} muebles sin código (ej. ROP-001). ¿Continuar?`)) return;
    const n = await generarCodigosFaltantes(muebles);
    setAviso(`Se asignaron ${n} códigos.`);
    cargar();
  };

  // Corte de inventario para la hoja H3 (cantidad registrada R al momento del corte)
  const exportarCorte = () => {
    const corte = new Date();
    const filas = lista.map((m, i) => ({
      'N.°': i + 1,
      'Fecha y hora del corte': formatoFechaHora(corte),
      'Cód. producto': m.codigo || '',
      Mueble: m.nombre,
      Color: m.color || '',
      Medidas: m.medidas || '',
      Unidad: m.unidad || '',
      'Registrada (R)': Number(m.stock) || 0,
      'Física (F)': '',
      'Concordante (1/0)': '',
      'Diferencia absoluta': '',
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Corte H3');
    XLSX.writeFile(wb, `corte_inventario_${corte.toISOString().slice(0, 16).replace(/[:T]/g, '-')}.xlsx`);
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Inventario</h1>
        <div className="flex gap-2">
          {sinCodigo > 0 && (
            <button onClick={generarCodigos} className="bg-purple-50 text-purple-700 border border-purple-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-600 hover:text-white">
              <i className="fas fa-barcode mr-2"></i>Generar {sinCodigo} códigos faltantes
            </button>
          )}
          <button onClick={exportarCorte} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-600 hover:text-white">
            <i className="fas fa-file-excel mr-2"></i>Exportar corte (hoja H3)
          </button>
        </div>
      </div>
      {aviso && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex justify-between">{aviso}<button onClick={() => setAviso('')}><i className="fas fa-times"></i></button></div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm"><div className="text-xs text-gray-500">Muebles registrados</div><div className="text-2xl font-bold">{muebles.length}</div></div>
        <div className="bg-white p-4 rounded-xl border shadow-sm"><div className="text-xs text-gray-500">Unidades en stock</div><div className="text-2xl font-bold">{muebles.reduce((s, m) => s + (Number(m.stock) || 0), 0)}</div></div>
        <div className="bg-white p-4 rounded-xl border shadow-sm"><div className="text-xs text-gray-500">Con stock bajo o agotado</div><div className="text-2xl font-bold text-red-600">{bajos}</div></div>
      </div>

      <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por código, nombre o color" className="w-full md:w-1/2 border rounded-lg p-2.5 mb-4 bg-white" />

      <div className="bg-white rounded-xl shadow border overflow-x-auto">
        {cargando ? <div className="p-8 text-center text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i>Cargando...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600"><tr>
              <th className="p-3 text-left">Código</th><th className="p-3 text-left">Mueble</th><th className="p-3 text-left">Color / medidas</th>
              <th className="p-3 text-left">Unidad</th><th className="p-3 text-right">Stock</th><th className="p-3 text-right">Mínimo</th>
              <th className="p-3">Estado</th><th className="p-3 text-center">Acciones</th>
            </tr></thead>
            <tbody className="divide-y">
              {lista.map((m) => {
                const e = estadoStock(m);
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="p-3 font-bold">{m.codigo || <span className="text-red-500 text-xs">Sin código</span>}</td>
                    <td className="p-3">{m.nombre}</td>
                    <td className="p-3 text-gray-600">{[m.color, m.medidas].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="p-3 capitalize">{m.unidad || '—'}</td>
                    <td className="p-3 text-right font-bold">{Number(m.stock) || 0}</td>
                    <td className="p-3 text-right">{m.stockMinimo ?? STOCK_MINIMO_DEFAULT}</td>
                    <td className="p-3 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${e.c}`}>{e.t}</span></td>
                    <td className="p-3">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => setMov({ mueble: m, tipo: 'ingreso' })} className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-bold hover:bg-green-600 hover:text-white" title="Registrar ingreso"><i className="fas fa-arrow-down mr-1"></i>Ingreso</button>
                        <button onClick={() => setMov({ mueble: m, tipo: 'ajuste' })} className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-bold hover:bg-yellow-500 hover:text-white" title="Ajuste por conteo físico"><i className="fas fa-balance-scale mr-1"></i>Ajuste</button>
                        <button onClick={() => setKardex(m)} className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-700 hover:text-white" title="Historial"><i className="fas fa-history mr-1"></i>Kárdex</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {mov && <MovimientoForm mueble={mov.mueble} tipo={mov.tipo} onCerrar={() => setMov(null)} onGuardado={() => { setMov(null); setAviso('Movimiento registrado.'); cargar(); }} />}
      {kardex && <Kardex mueble={kardex} onCerrar={() => setKardex(null)} />}
    </div>
  );
};

export default AdminInventario;
