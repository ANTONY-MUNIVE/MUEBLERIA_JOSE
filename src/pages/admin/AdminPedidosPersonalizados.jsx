import React, { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { crearPedidoPersonalizado, cambiarEstadoPedido, registrarPagoSaldo, medir } from '../../services/ventasService';
import { validarPedido } from '../../utils/validaciones';
import { ESTADOS_PEDIDO } from '../../config/app';
import { formatPrice } from '../../utils/images';
import { formatoFecha, formatoFechaHora } from '../../utils/fechas';

const vacio = { cliente: { nombres: '', apellidos: '', celular: '', direccion: '' }, modelo: '', medidas: '', color: '', imagenReferencia: '', precioTotal: '', adelanto: '', fechaEntrega: '', observaciones: '' };
const input = (err) => `w-full border rounded-lg p-2.5 outline-none focus:ring-2 ${err ? 'border-red-400 bg-red-50' : 'border-gray-300 focus:ring-orange-400'}`;
const Err = ({ m }) => (m ? <p className="text-xs text-red-600 mt-1">{m}</p> : null);

/** Pedidos personalizados con adelanto, saldo y estados (RF20, RF21). */
const AdminPedidosPersonalizados = () => {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(null);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState('activos');
  const [abierto, setAbierto] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, 'pedidosPersonalizados'), orderBy('creadoEn', 'desc')));
      setPedidos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const setC = (k, v) => setForm((f) => ({ ...f, cliente: { ...f.cliente, [k]: v } }));

  const guardar = async (e) => {
    e.preventDefault();
    const errs = validarPedido(form);
    setErrores(errs);
    if (Object.keys(errs).length) return;
    setGuardando(true);
    try {
      await medir('registrar_pedido', () => crearPedidoPersonalizado(form));
      setForm(null);
      cargar();
    } catch (err) {
      setErrores({ general: err.message });
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (p, estado) => {
    if (estado === p.estado) return;
    const nota = estado === 'anulado' ? window.prompt('Motivo de la anulación:') : '';
    if (estado === 'anulado' && !nota) return;
    await cambiarEstadoPedido(p.id, estado, nota || '');
    cargar();
  };

  const pagarSaldo = async (p) => {
    const monto = window.prompt(`Saldo pendiente: S/ ${Number(p.saldo).toFixed(2)}. Monto que paga el cliente:`);
    if (!monto) return;
    const n = Number(monto);
    if (!(n > 0) || n > p.saldo + 0.001) { window.alert('Monto no válido.'); return; }
    await registrarPagoSaldo(p, n);
    cargar();
  };

  const visibles = pedidos.filter((p) => (filtro === 'activos' ? !['entregado', 'anulado'].includes(p.estado) : filtro === 'todos' ? true : p.estado === filtro));
  const estadoInfo = (id) => ESTADOS_PEDIDO.find((x) => x.id === id) || ESTADOS_PEDIDO[0];

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pedidos personalizados</h1>
        {!form && <button onClick={() => { setForm(vacio); setErrores({}); }} className="bg-orange-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-orange-700"><i className="fas fa-plus mr-2"></i>Nuevo pedido</button>}
      </div>

      {form && (
        <form onSubmit={guardar} className="bg-white rounded-xl shadow border p-6 mb-6 space-y-4" noValidate>
          <h2 className="font-bold text-lg">Nuevo pedido personalizado</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><label className="text-sm font-bold">Nombres *</label><input className={input(errores['cliente.nombres'])} value={form.cliente.nombres} onChange={(e) => setC('nombres', e.target.value)} /><Err m={errores['cliente.nombres']} /></div>
            <div><label className="text-sm font-bold">Apellidos *</label><input className={input(errores['cliente.apellidos'])} value={form.cliente.apellidos} onChange={(e) => setC('apellidos', e.target.value)} /><Err m={errores['cliente.apellidos']} /></div>
            <div><label className="text-sm font-bold">Celular *</label><input className={input(errores['cliente.celular'])} value={form.cliente.celular} maxLength={9} inputMode="numeric" onChange={(e) => setC('celular', e.target.value.replace(/\D/g, ''))} /><Err m={errores['cliente.celular']} /></div>
            <div><label className="text-sm font-bold">Dirección</label><input className={input()} value={form.cliente.direccion} onChange={(e) => setC('direccion', e.target.value)} /></div>
            <div className="md:col-span-2"><label className="text-sm font-bold">Modelo / descripción *</label><input className={input(errores.modelo)} value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /><Err m={errores.modelo} /></div>
            <div><label className="text-sm font-bold">Medidas *</label><input className={input(errores.medidas)} value={form.medidas} placeholder="Ej: 1.80 × 0.60 × 2.00 m" onChange={(e) => setForm({ ...form, medidas: e.target.value })} /><Err m={errores.medidas} /></div>
            <div><label className="text-sm font-bold">Color *</label><input className={input(errores.color)} value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /><Err m={errores.color} /></div>
            <div className="md:col-span-2"><label className="text-sm font-bold">Imagen de referencia (URL)</label><input className={input()} value={form.imagenReferencia} onChange={(e) => setForm({ ...form, imagenReferencia: e.target.value })} /></div>
            <div><label className="text-sm font-bold">Precio total (S/) *</label><input type="number" min="0" step="0.01" className={input(errores.precioTotal)} value={form.precioTotal} onChange={(e) => setForm({ ...form, precioTotal: e.target.value })} /><Err m={errores.precioTotal} /></div>
            <div><label className="text-sm font-bold">Adelanto (S/) *</label><input type="number" min="0" step="0.01" className={input(errores.adelanto)} value={form.adelanto} onChange={(e) => setForm({ ...form, adelanto: e.target.value })} /><Err m={errores.adelanto} /></div>
            <div><label className="text-sm font-bold">Entrega estimada</label><input type="date" className={input(errores.fechaEntrega)} value={form.fechaEntrega} onChange={(e) => setForm({ ...form, fechaEntrega: e.target.value })} /><Err m={errores.fechaEntrega} /></div>
            <div className="pt-6 text-sm">Saldo: <b>{formatPrice(Math.max(0, (Number(form.precioTotal) || 0) - (Number(form.adelanto) || 0)))}</b></div>
          </div>
          <div><label className="text-sm font-bold">Observaciones</label><textarea className={`${input()} h-16 resize-none`} value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></div>
          {errores.general && <p className="text-red-600 text-sm">{errores.general}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setForm(null)} className="px-5 py-2 font-bold text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={guardando} className="px-5 py-2 font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg disabled:opacity-60">{guardando ? 'Guardando...' : 'Guardar pedido'}</button>
          </div>
        </form>
      )}

      <div className="flex gap-2 mb-3 text-sm flex-wrap">
        {[['activos', 'Activos'], ['todos', 'Todos'], ...ESTADOS_PEDIDO.map((e) => [e.id, e.label])].map(([id, label]) => (
          <button key={id} onClick={() => setFiltro(id)} className={`px-3 py-1.5 rounded-full border ${filtro === id ? 'bg-gray-800 text-white' : 'bg-white'}`}>{label}</button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow border overflow-x-auto">
        {cargando ? <div className="p-8 text-center text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i>Cargando...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600"><tr>
              <th className="p-3 text-left">Cliente</th><th className="p-3 text-left">Modelo</th><th className="p-3 text-right">Total</th>
              <th className="p-3 text-right">Adelanto</th><th className="p-3 text-right">Saldo</th><th className="p-3">Entrega</th><th className="p-3">Estado</th><th className="p-3"></th>
            </tr></thead>
            <tbody className="divide-y">
              {visibles.map((p) => (
                <React.Fragment key={p.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="p-3"><button onClick={() => setAbierto(abierto === p.id ? null : p.id)} className="text-left hover:underline font-bold">{p.cliente?.nombres} {p.cliente?.apellidos}</button><div className="text-xs text-gray-500">{p.cliente?.celular}</div></td>
                    <td className="p-3">{p.modelo}<div className="text-xs text-gray-500">{p.medidas} · {p.color}</div></td>
                    <td className="p-3 text-right">{formatPrice(p.precioTotal || 0)}</td>
                    <td className="p-3 text-right">{formatPrice(p.adelanto || 0)}</td>
                    <td className="p-3 text-right font-bold">{formatPrice(p.saldo || 0)}</td>
                    <td className="p-3 text-center">{formatoFecha(p.fechaEntrega) || '—'}</td>
                    <td className="p-3">
                      <select value={p.estado} onChange={(e) => cambiarEstado(p, e.target.value)} className={`text-xs font-bold rounded px-2 py-1 border-0 ${estadoInfo(p.estado).color}`} disabled={p.estado === 'anulado'}>
                        {ESTADOS_PEDIDO.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                      </select>
                    </td>
                    <td className="p-3">{p.saldo > 0 && p.estado !== 'anulado' && <button onClick={() => pagarSaldo(p)} className="text-xs font-bold text-blue-600 hover:underline">Pagar saldo</button>}</td>
                  </tr>
                  {abierto === p.id && (
                    <tr className="bg-gray-50"><td colSpan={8} className="p-4 text-xs space-y-1">
                      <div><b>Dirección:</b> {p.cliente?.direccion || '—'} · <b>Observaciones:</b> {p.observaciones || '—'}</div>
                      {p.imagenReferencia && <div><a href={p.imagenReferencia} target="_blank" rel="noreferrer" className="text-blue-600 underline">Ver imagen de referencia</a></div>}
                      <div><b>Historial:</b> {(p.historial || []).map((h) => `${formatoFechaHora(h.fecha)} ${estadoInfo(h.estado).label}${h.nota ? ` (${h.nota})` : ''}`).join(' · ')}</div>
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
        {!cargando && visibles.length === 0 && <div className="p-8 text-center text-gray-400">No hay pedidos en esta vista.</div>}
      </div>
    </div>
  );
};

export default AdminPedidosPersonalizados;
