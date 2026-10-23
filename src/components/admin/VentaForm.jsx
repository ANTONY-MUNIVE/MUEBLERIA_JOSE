import React, { useEffect, useMemo, useRef, useState } from 'react';
import { validarVenta, calcularTotal } from '../../utils/validaciones';
import { hoyISO } from '../../utils/fechas';
import { formatPrice } from '../../utils/images';
import { METODOS_PAGO } from '../../config/app';
import { registrarVenta, corregirVenta, subirCapturaYape, medir } from '../../services/ventasService';

const itemVacio = () => ({ muebleId: '', cantidad: '1', precioUnit: '' });

const estadoInicial = (venta) => venta ? {
  fecha: venta.fecha,
  tipo: venta.tipo,
  cliente: { ...venta.cliente },
  items: venta.items.map((it) => ({ muebleId: it.muebleId, cantidad: String(it.cantidad), precioUnit: String(it.precioUnit) })),
  pago: {
    metodo: venta.pago?.metodo || 'efectivo',
    montoRecibido: String(venta.pago?.montoRecibido ?? ''),
    numeroBoleta: venta.pago?.numeroBoleta || '',
    operacionYape: venta.pago?.operacionYape || '',
    capturaUrl: venta.pago?.capturaUrl || null,
  },
  observaciones: venta.observaciones || '',
} : {
  fecha: hoyISO(),
  tipo: 'stock',
  cliente: { nombres: '', apellidos: '', direccion: '', celular: '' },
  items: [itemVacio()],
  pago: { metodo: 'efectivo', montoRecibido: '', numeroBoleta: '', operacionYape: '', capturaUrl: null },
  observaciones: '',
};

const Campo = ({ label, error, children, requerido }) => (
  <div>
    <label className="block text-sm font-bold text-gray-700 mb-1">
      {label} {requerido && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-600 mt-1"><i className="fas fa-exclamation-circle mr-1"></i>{error}</p>}
  </div>
);

const claseInput = (error) =>
  `w-full border p-2.5 rounded-lg outline-none focus:ring-2 ${error ? 'border-red-400 bg-red-50 focus:ring-red-300' : 'border-gray-300 focus:ring-orange-400'}`;

/**
 * Formulario de venta en tienda (RF13–RF16) y de corrección (RF18).
 * Registra cuándo se abrió y cuándo se guardó para el indicador T1.
 */
const VentaForm = ({ muebles, ventaACorregir = null, onGuardado, onCancel }) => {
  const [datos, setDatos] = useState(() => estadoInicial(ventaACorregir));
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [captura, setCaptura] = useState(null);
  const [motivo, setMotivo] = useState('');
  const abiertoEn = useRef(null);

  useEffect(() => { abiertoEn.current = Date.now(); }, []);

  // Stock disponible por mueble (en una corrección se suman las unidades ya vendidas en esta venta)
  const stockDisponible = useMemo(() => {
    const base = Object.fromEntries(muebles.map((m) => [m.id, Number(m.stock) || 0]));
    (ventaACorregir?.items || []).forEach((it) => { base[it.muebleId] = (base[it.muebleId] || 0) + Number(it.cantidad); });
    return base;
  }, [muebles, ventaACorregir]);

  const mueblesOrdenados = useMemo(
    () => [...muebles].sort((a, b) => String(a.codigo || a.nombre).localeCompare(String(b.codigo || b.nombre))),
    [muebles],
  );

  const total = calcularTotal(datos.items);
  const vuelto = Math.max(0, (Number(datos.pago.montoRecibido) || 0) - total);

  const setCliente = (campo, valor) => setDatos((d) => ({ ...d, cliente: { ...d.cliente, [campo]: valor } }));
  const setPago = (campo, valor) => setDatos((d) => ({ ...d, pago: { ...d.pago, [campo]: valor } }));
  const setItem = (i, campo, valor) => setDatos((d) => {
    const items = d.items.map((it, k) => {
      if (k !== i) return it;
      const nuevo = { ...it, [campo]: valor };
      if (campo === 'muebleId') {
        const m = muebles.find((x) => x.id === valor);
        if (m && (it.precioUnit === '' || it.muebleId !== valor)) nuevo.precioUnit = String(m.precio ?? '');
      }
      return nuevo;
    });
    return { ...d, items };
  });
  const agregarItem = () => setDatos((d) => ({ ...d, items: [...d.items, itemVacio()] }));
  const quitarItem = (i) => setDatos((d) => ({ ...d, items: d.items.filter((_, k) => k !== i) }));

  const guardar = async (e) => {
    e.preventDefault();
    setErrorGeneral('');
    const errs = validarVenta(datos, stockDisponible);
    if (ventaACorregir && motivo.trim().length < 3) errs.motivo = 'Indique el motivo de la corrección.';
    setErrores(errs);
    if (Object.keys(errs).length) {
      setErrorGeneral('Revise los campos marcados en rojo. Los datos ingresados se conservan.');
      return;
    }

    setGuardando(true);
    try {
      let pago = { ...datos.pago };
      if (pago.metodo === 'yape' && captura) {
        try {
          pago.capturaUrl = await subirCapturaYape(captura);
        } catch (err) {
          console.error(err);
          if (!window.confirm('No se pudo subir la captura de Yape. ¿Guardar la venta sin la captura?')) {
            setGuardando(false);
            return;
          }
        }
      }
      if (pago.metodo !== 'yape') pago = { ...pago, operacionYape: '', capturaUrl: null };
      const payload = { ...datos, pago };

      if (ventaACorregir) {
        await medir('corregir_venta', () => corregirVenta(ventaACorregir.id, payload, motivo.trim()));
        onGuardado({ ...ventaACorregir, ...payload, total }, 'corregida');
      } else {
        const guardadoEn = Date.now();
        const venta = await medir('registrar_venta', () => registrarVenta(payload, { abiertoEn: abiertoEn.current, guardadoEn }), { items: payload.items.length });
        onGuardado(venta, 'registrada');
      }
    } catch (err) {
      console.error(err);
      setErrorGeneral(err.message || 'No se pudo guardar la venta.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar} className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-6" noValidate>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">
          {ventaACorregir ? `Corregir venta ${ventaACorregir.codigo}` : 'Nueva venta en tienda'}
        </h2>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-red-500" title="Cancelar">
          <i className="fas fa-times text-xl"></i>
        </button>
      </div>

      {errorGeneral && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
          <i className="fas fa-exclamation-triangle mr-2"></i>{errorGeneral}
        </div>
      )}

      {/* Datos generales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Campo label="Fecha" requerido error={errores.fecha}>
          <input type="date" value={datos.fecha} max={hoyISO()} onChange={(e) => setDatos({ ...datos, fecha: e.target.value })} className={claseInput(errores.fecha)} />
        </Campo>
        <Campo label="Tipo de venta" requerido error={errores.tipo}>
          <select value={datos.tipo} onChange={(e) => setDatos({ ...datos, tipo: e.target.value })} className={claseInput(errores.tipo)}>
            <option value="stock">Mueble en stock</option>
            <option value="pedido">Pedido (requiere celular)</option>
          </select>
        </Campo>
      </div>

      {/* Cliente */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="px-2 text-sm font-bold text-gray-600">Cliente</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Campo label="Nombres" requerido error={errores['cliente.nombres']}>
            <input value={datos.cliente.nombres} onChange={(e) => setCliente('nombres', e.target.value)} className={claseInput(errores['cliente.nombres'])} autoComplete="off" />
          </Campo>
          <Campo label="Apellidos" requerido error={errores['cliente.apellidos']}>
            <input value={datos.cliente.apellidos} onChange={(e) => setCliente('apellidos', e.target.value)} className={claseInput(errores['cliente.apellidos'])} autoComplete="off" />
          </Campo>
          <Campo label="Dirección" requerido error={errores['cliente.direccion']}>
            <input value={datos.cliente.direccion} onChange={(e) => setCliente('direccion', e.target.value)} className={claseInput(errores['cliente.direccion'])} autoComplete="off" />
          </Campo>
          <Campo label="Celular" requerido={datos.tipo === 'pedido'} error={errores['cliente.celular']}>
            <input value={datos.cliente.celular} inputMode="numeric" maxLength={9} placeholder="9XXXXXXXX" onChange={(e) => setCliente('celular', e.target.value.replace(/\D/g, ''))} className={claseInput(errores['cliente.celular'])} />
          </Campo>
        </div>
      </fieldset>

      {/* Muebles */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="px-2 text-sm font-bold text-gray-600">Muebles</legend>
        {errores.items && <p className="text-xs text-red-600 mb-2">{errores.items}</p>}
        <div className="space-y-3">
          {datos.items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-12 md:col-span-6">
                <select value={it.muebleId} onChange={(e) => setItem(i, 'muebleId', e.target.value)} className={claseInput(errores[`items.${i}.muebleId`])}>
                  <option value="">Seleccione el mueble...</option>
                  {mueblesOrdenados.map((m) => (
                    <option key={m.id} value={m.id} disabled={(stockDisponible[m.id] || 0) <= 0 && m.id !== it.muebleId}>
                      {(m.codigo || 'SIN CÓDIGO')} — {m.nombre}{m.color ? ` (${m.color})` : ''} · stock {stockDisponible[m.id] || 0}
                    </option>
                  ))}
                </select>
                {errores[`items.${i}.muebleId`] && <p className="text-xs text-red-600 mt-1">{errores[`items.${i}.muebleId`]}</p>}
              </div>
              <div className="col-span-4 md:col-span-2">
                <input type="number" min="1" step="1" value={it.cantidad} onChange={(e) => setItem(i, 'cantidad', e.target.value)} className={claseInput(errores[`items.${i}.cantidad`])} aria-label="Cantidad" placeholder="Cant." />
                {errores[`items.${i}.cantidad`] && <p className="text-xs text-red-600 mt-1">{errores[`items.${i}.cantidad`]}</p>}
              </div>
              <div className="col-span-5 md:col-span-2">
                <input type="number" min="0" step="0.01" value={it.precioUnit} onChange={(e) => setItem(i, 'precioUnit', e.target.value)} className={claseInput(errores[`items.${i}.precioUnit`])} aria-label="Precio unitario" placeholder="Precio S/" />
                {errores[`items.${i}.precioUnit`] && <p className="text-xs text-red-600 mt-1">{errores[`items.${i}.precioUnit`]}</p>}
              </div>
              <div className="col-span-3 md:col-span-2 flex items-center gap-2 pt-2">
                <span className="text-sm font-bold text-gray-700">{formatPrice((Number(it.cantidad) || 0) * (Number(it.precioUnit) || 0))}</span>
                {datos.items.length > 1 && (
                  <button type="button" onClick={() => quitarItem(i)} className="text-red-500 hover:text-red-700" title="Quitar">
                    <i className="fas fa-trash"></i>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center mt-4">
          <button type="button" onClick={agregarItem} className="text-sm text-blue-600 font-bold hover:underline">
            <i className="fas fa-plus mr-1"></i> Agregar otro mueble
          </button>
          <div className="text-lg font-bold text-gray-800">Total: {formatPrice(total)}</div>
        </div>
      </fieldset>

      {/* Pago */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="px-2 text-sm font-bold text-gray-600">Pago y boleta</legend>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Campo label="Método" requerido error={errores['pago.metodo']}>
            <select value={datos.pago.metodo} onChange={(e) => setPago('metodo', e.target.value)} className={claseInput(errores['pago.metodo'])}>
              {METODOS_PAGO.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </Campo>
          <Campo label="Monto recibido (S/)" requerido error={errores['pago.montoRecibido']}>
            <input type="number" min="0" step="0.01" value={datos.pago.montoRecibido} onChange={(e) => setPago('montoRecibido', e.target.value)} className={claseInput(errores['pago.montoRecibido'])} />
          </Campo>
          <Campo label="N.° de boleta" requerido error={errores['pago.numeroBoleta']}>
            <input value={datos.pago.numeroBoleta} onChange={(e) => setPago('numeroBoleta', e.target.value)} className={claseInput(errores['pago.numeroBoleta'])} placeholder="Ej: 001-000123" />
          </Campo>
          <div className="pt-7 text-sm text-gray-600">Vuelto: <span className="font-bold">{formatPrice(vuelto)}</span></div>
        </div>
        {datos.pago.metodo === 'yape' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Campo label="N.° de operación Yape">
              <input value={datos.pago.operacionYape} onChange={(e) => setPago('operacionYape', e.target.value)} className={claseInput()} />
            </Campo>
            <Campo label="Captura de Yape (opcional)">
              <input type="file" accept="image/*" onChange={(e) => setCaptura(e.target.files?.[0] || null)} className="w-full text-sm" />
              {datos.pago.capturaUrl && !captura && <a href={datos.pago.capturaUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Ver captura guardada</a>}
            </Campo>
          </div>
        )}
      </fieldset>

      <Campo label="Observaciones">
        <textarea value={datos.observaciones} onChange={(e) => setDatos({ ...datos, observaciones: e.target.value })} className={`${claseInput()} h-16 resize-none`} />
      </Campo>

      {ventaACorregir && (
        <Campo label="Motivo de la corrección" requerido error={errores.motivo}>
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className={claseInput(errores.motivo)} placeholder="Ej: el cliente cambió el color del mueble" />
        </Campo>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 text-gray-700 font-bold hover:bg-gray-100 rounded-lg">Cancelar</button>
        <button type="submit" disabled={guardando} className="px-6 py-2.5 bg-orange-600 text-white rounded-lg font-bold shadow hover:bg-orange-700 disabled:opacity-60">
          {guardando ? <><i className="fas fa-spinner fa-spin mr-2"></i>Guardando...</> : (ventaACorregir ? 'Guardar corrección' : 'Guardar venta')}
        </button>
      </div>
    </form>
  );
};

export default VentaForm;
