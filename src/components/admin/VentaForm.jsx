import React, { useEffect, useMemo, useRef, useState } from 'react';
import { validarVenta, calcularTotal } from '../../utils/validaciones';
import { hoyISO } from '../../utils/fechas';
import { formatPrice } from '../../utils/images';
import { registrarVenta, corregirVenta, subirCapturaYape, medir } from '../../services/ventasService';
import { STOCK_MINIMO_DEFAULT } from '../../config/app';

const normalizar = (t) => String(t || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

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
  items: [],
  pago: { metodo: 'efectivo', montoRecibido: '', numeroBoleta: '', operacionYape: '', capturaUrl: null },
  observaciones: '',
};

// Qué errores de validación pertenecen a cada paso
const PASOS = [
  { id: 'cliente', titulo: 'Cliente', icono: 'fa-user', es: (k) => k === 'fecha' || k === 'tipo' || k.startsWith('cliente.') },
  { id: 'muebles', titulo: 'Muebles', icono: 'fa-couch', es: (k) => k === 'items' || k.startsWith('items.') },
  { id: 'pago', titulo: 'Pago', icono: 'fa-wallet', es: (k) => k.startsWith('pago.') || k === 'motivo' },
];
const pasoDeError = (k) => Math.max(0, PASOS.findIndex((p) => p.es(k)));

const Campo = ({ id, label, error, children, requerido, ayuda }) => (
  <div>
    <label htmlFor={id} className="block text-[13px] font-extrabold mb-1.5">
      {label} {requerido && <span className="text-red-700" aria-hidden="true">*</span>}
    </label>
    {children}
    {error ? (
      <p id={`${id}-error`} className="text-xs font-semibold text-red-700 mt-1.5 animate-fade-in-down"><i className="fas fa-exclamation-circle mr-1"></i>{error}</p>
    ) : ayuda ? <p className="text-xs text-cafe mt-1.5">{ayuda}</p> : null}
  </div>
);

const claseInput = (error) =>
  `w-full h-12 px-4 rounded-2xl border bg-white outline-none transition focus:ring-4 ${error ? 'border-red-600 bg-red-50 focus:ring-red-200' : 'border-gray-400 focus:border-terracota focus:ring-terracota/25'}`;

/** Control segmentado (tipo de venta, método de pago). */
const Segmentado = ({ opciones, valor, onChange, etiqueta }) => (
  <div role="radiogroup" aria-label={etiqueta} className="grid gap-1 p-1 rounded-2xl bg-arena" style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}>
    {opciones.map((o) => {
      const activo = valor === o.id;
      return (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={activo}
          onClick={() => onChange(o.id)}
          className={`min-h-11 px-3 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${activo ? 'bg-espresso text-hueso shadow-sm' : 'text-espresso hover:bg-white/60'}`}
        >
          {o.icono && <i className={o.icono}></i>}{o.label}
        </button>
      );
    })}
  </div>
);

/**
 * Venta en tienda en 3 pasos (Cliente → Muebles → Pago), RF13–RF16, y corrección (RF18).
 * El tiempo del formulario (T1, apoyo) se mide desde que se abre hasta que se guarda.
 */
const VentaForm = ({ muebles, ventaACorregir = null, onGuardado, onCancel }) => {
  const [datos, setDatos] = useState(() => estadoInicial(ventaACorregir));
  const [paso, setPaso] = useState(0);
  const [direccion, setDireccion] = useState('adelante');
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [sacudir, setSacudir] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [captura, setCaptura] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const abiertoEn = useRef(null);
  const primerCampo = useRef(null);
  const buscadorRef = useRef(null);

  useEffect(() => { abiertoEn.current = Date.now(); }, []);

  // Al cambiar de paso se lleva el foco al primer campo del paso
  useEffect(() => {
    const t = setTimeout(() => {
      if (paso === 0) primerCampo.current?.focus();
      if (paso === 1) buscadorRef.current?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, [paso]);

  // Stock disponible por mueble (en una corrección se suman las unidades ya vendidas en esta venta)
  const stockDisponible = useMemo(() => {
    const base = Object.fromEntries(muebles.map((m) => [m.id, Number(m.stock) || 0]));
    (ventaACorregir?.items || []).forEach((it) => { base[it.muebleId] = (base[it.muebleId] || 0) + Number(it.cantidad); });
    return base;
  }, [muebles, ventaACorregir]);

  const porId = useMemo(() => Object.fromEntries(muebles.map((m) => [m.id, m])), [muebles]);

  const resultados = useMemo(() => {
    const t = normalizar(busqueda);
    const lista = [...muebles].sort((a, b) => String(a.codigo || a.nombre).localeCompare(String(b.codigo || b.nombre)));
    if (!t) return lista.slice(0, 8);
    return lista.filter((m) => normalizar(m.codigo).includes(t) || normalizar(m.nombre).includes(t) || normalizar(m.color).includes(t)).slice(0, 12);
  }, [muebles, busqueda]);

  const total = calcularTotal(datos.items);
  const unidades = datos.items.reduce((a, it) => a + (Number(it.cantidad) || 0), 0);
  const vuelto = Math.max(0, (Number(datos.pago.montoRecibido) || 0) - total);

  const limpiarError = (...claves) => setErrores((e) => {
    if (!claves.some((k) => e[k])) return e;
    const n = { ...e };
    claves.forEach((k) => delete n[k]);
    return n;
  });
  const setCliente = (campo, valor) => { setDatos((d) => ({ ...d, cliente: { ...d.cliente, [campo]: valor } })); limpiarError(`cliente.${campo}`); };
  const setPago = (campo, valor) => { setDatos((d) => ({ ...d, pago: { ...d.pago, [campo]: valor } })); limpiarError(`pago.${campo}`); };
  const setItem = (i, campo, valor) => {
    setDatos((d) => ({ ...d, items: d.items.map((it, k) => (k === i ? { ...it, [campo]: valor } : it)) }));
    limpiarError(`items.${i}.${campo}`);
  };

  const agregarMueble = (m) => {
    const i = datos.items.findIndex((it) => it.muebleId === m.id);
    if (i >= 0) {
      setItem(i, 'cantidad', String((Number(datos.items[i].cantidad) || 0) + 1));
    } else {
      setDatos((d) => ({ ...d, items: [...d.items, { muebleId: m.id, cantidad: '1', precioUnit: String(m.precio ?? '') }] }));
      limpiarError('items');
    }
  };
  const cambiarCantidad = (i, delta) => setItem(i, 'cantidad', String(Math.max(1, (Number(datos.items[i].cantidad) || 0) + delta)));
  const quitarItem = (i) => {
    setDatos((d) => ({ ...d, items: d.items.filter((_, k) => k !== i) }));
    setErrores((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith('items.'))));
  };

  const validarTodo = () => {
    const errs = validarVenta(datos, stockDisponible);
    if (ventaACorregir && motivo.trim().length < 3) errs.motivo = 'Indique el motivo de la corrección.';
    return errs;
  };

  const irA = (destino) => {
    setDireccion(destino > paso ? 'adelante' : 'atras');
    setPaso(destino);
    setErrorGeneral('');
  };

  const marcarErrores = (errs, mensaje) => {
    setErrores(errs);
    setErrorGeneral(mensaje);
    setSacudir((n) => n + 1);
  };

  const continuar = () => {
    const errs = validarTodo();
    const delPaso = Object.fromEntries(Object.entries(errs).filter(([k]) => PASOS[paso].es(k)));
    if (Object.keys(delPaso).length) {
      marcarErrores(delPaso, 'Revise los campos marcados en rojo. Lo que escribió se conserva.');
      return;
    }
    setErrores({});
    irA(paso + 1);
  };

  // Solo se puede saltar hacia adelante si los pasos anteriores están completos
  const puedeIrA = (destino) => {
    if (destino <= paso) return true;
    const errs = validarTodo();
    return !Object.keys(errs).some((k) => pasoDeError(k) < destino);
  };

  const guardar = async () => {
    setErrorGeneral('');
    const errs = validarTodo();
    if (Object.keys(errs).length) {
      const primero = Math.min(...Object.keys(errs).map(pasoDeError));
      if (primero !== paso) irA(primero);
      marcarErrores(errs, 'Revise los campos marcados en rojo. Lo que escribió se conserva.');
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
      setErrorGeneral(err.message || 'No se pudo guardar la venta. Revise la conexión e intente de nuevo.');
      setSacudir((n) => n + 1);
    } finally {
      setGuardando(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (paso < PASOS.length - 1) continuar();
    else guardar();
  };

  const err = (k) => errores[k];
  const aria = (id, k) => ({ id, 'aria-invalid': Boolean(errores[k]) || undefined, 'aria-describedby': errores[k] ? `${id}-error` : undefined });

  /* ---------- Paso 1: Cliente ---------- */
  const pasoCliente = (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo id="v-fecha" label="Fecha" requerido error={err('fecha')}>
          <input {...aria('v-fecha', 'fecha')} type="date" value={datos.fecha} max={hoyISO()} onChange={(e) => { setDatos({ ...datos, fecha: e.target.value }); limpiarError('fecha'); }} className={claseInput(err('fecha'))} />
        </Campo>
        <div>
          <span className="block text-[13px] font-extrabold mb-1.5">Tipo de venta <span className="text-red-700" aria-hidden="true">*</span></span>
          <Segmentado
            etiqueta="Tipo de venta"
            valor={datos.tipo}
            onChange={(v) => { setDatos({ ...datos, tipo: v }); limpiarError('tipo', 'cliente.celular'); }}
            opciones={[{ id: 'stock', label: 'En tienda', icono: 'fas fa-store' }, { id: 'pedido', label: 'Pedido', icono: 'fas fa-truck' }]}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo id="v-nombres" label="Nombres" requerido error={err('cliente.nombres')}>
          <input ref={primerCampo} {...aria('v-nombres', 'cliente.nombres')} value={datos.cliente.nombres} onChange={(e) => setCliente('nombres', e.target.value)} className={claseInput(err('cliente.nombres'))} autoComplete="off" />
        </Campo>
        <Campo id="v-apellidos" label="Apellidos" requerido error={err('cliente.apellidos')}>
          <input {...aria('v-apellidos', 'cliente.apellidos')} value={datos.cliente.apellidos} onChange={(e) => setCliente('apellidos', e.target.value)} className={claseInput(err('cliente.apellidos'))} autoComplete="off" />
        </Campo>
        <Campo id="v-direccion" label="Dirección" requerido error={err('cliente.direccion')}>
          <input {...aria('v-direccion', 'cliente.direccion')} value={datos.cliente.direccion} onChange={(e) => setCliente('direccion', e.target.value)} className={claseInput(err('cliente.direccion'))} autoComplete="off" />
        </Campo>
        <Campo id="v-celular" label="Celular" requerido={datos.tipo === 'pedido'} error={err('cliente.celular')} ayuda={datos.tipo === 'pedido' ? 'Obligatorio en pedidos: 9 dígitos, empieza con 9.' : 'Opcional en ventas en tienda.'}>
          <input {...aria('v-celular', 'cliente.celular')} value={datos.cliente.celular} inputMode="numeric" maxLength={9} placeholder="9XXXXXXXX" onChange={(e) => setCliente('celular', e.target.value.replace(/\D/g, ''))} className={claseInput(err('cliente.celular'))} />
        </Campo>
      </div>
    </div>
  );

  /* ---------- Paso 2: Muebles ---------- */
  const pasoMuebles = (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-5">
      <div className="flex flex-col gap-3 min-w-0">
        <label htmlFor="v-buscar" className="text-[13px] font-extrabold">Buscar mueble por código o nombre</label>
        <div className="relative">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-cafe/70" aria-hidden="true"></i>
          <input ref={buscadorRef} id="v-buscar" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => {
              // Enter agrega el primer mueble disponible de la lista
              if (e.key !== 'Enter') return;
              e.preventDefault();
              const m = resultados.find((x) => (stockDisponible[x.id] || 0) - Number(datos.items.find((it) => it.muebleId === x.id)?.cantidad || 0) > 0);
              if (m) { agregarMueble(m); setBusqueda(''); }
            }}
            placeholder="Ej. ROP-001 o ropero" className={`${claseInput()} pl-11`} autoComplete="off" />
        </div>
        <ul className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1" aria-label="Resultados">
          {resultados.length === 0 && <li className="text-sm text-cafe px-1 py-4">No hay muebles que coincidan con «{busqueda}».</li>}
          {resultados.map((m) => {
            const stock = stockDisponible[m.id] || 0;
            const enVenta = Number(datos.items.find((it) => it.muebleId === m.id)?.cantidad || 0);
            const quedan = stock - enVenta;
            const bajo = stock > 0 && stock <= (m.stockMinimo ?? STOCK_MINIMO_DEFAULT);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => agregarMueble(m)}
                  disabled={quedan <= 0}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-2xl border border-linea bg-white hover:border-terracota hover:bg-orange-50 disabled:opacity-50 disabled:hover:border-linea disabled:hover:bg-white disabled:cursor-not-allowed transition group"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold truncate">{m.nombre}</span>
                    <span className="block text-[13px] text-cafe truncate">
                      {m.codigo || 'SIN CÓDIGO'}{m.color ? ` · ${m.color}` : ''} · {formatPrice(m.precio)}
                    </span>
                  </span>
                  <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${stock <= 0 ? 'bg-red-50 text-red-700' : bajo ? 'bg-aviso-fondo text-aviso' : 'bg-green-50 text-exito'}`}>
                    {stock <= 0 ? 'Sin stock' : `Stock ${stock}`}
                  </span>
                  <span className="w-9 h-9 rounded-full bg-terracota text-espresso flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 group-disabled:bg-arena" aria-hidden="true">
                    <i className="fas fa-plus"></i>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-3 min-w-0">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-extrabold">En esta venta</span>
          <span className="text-xs text-cafe">{unidades} {unidades === 1 ? 'unidad' : 'unidades'}</span>
        </div>
        {err('items') && <p className="text-xs font-semibold text-red-700 animate-fade-in-down"><i className="fas fa-exclamation-circle mr-1"></i>{err('items')}</p>}
        {datos.items.length === 0 ? (
          <div className={`rounded-2xl border-2 border-dashed p-8 text-center ${err('items') ? 'border-red-300 bg-red-50' : 'border-linea'}`}>
            <i className="fas fa-couch text-3xl text-piedra mb-2"></i>
            <p className="font-bold">Aún no hay muebles</p>
            <p className="text-sm text-cafe">Búscalos a la izquierda y pulsa «+».</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {datos.items.map((it, i) => {
              const m = porId[it.muebleId];
              const eCant = err(`items.${i}.cantidad`);
              const ePrecio = err(`items.${i}.precioUnit`);
              const eMueble = err(`items.${i}.muebleId`);
              return (
                <li key={it.muebleId || i} className={`rounded-2xl border-2 p-3.5 bg-white animate-fade-in-up ${eCant || ePrecio || eMueble ? 'border-red-300' : 'border-terracota/60'}`}>
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate">{m?.nombre || 'Mueble no encontrado'}</p>
                      <p className="text-[13px] text-cafe">{m?.codigo || 'SIN CÓDIGO'} · En tienda: {stockDisponible[it.muebleId] || 0}</p>
                    </div>
                    <button type="button" onClick={() => quitarItem(i)} className="w-10 h-10 -mt-1 -mr-1 rounded-full text-cafe hover:bg-red-50 hover:text-red-700 transition" aria-label={`Quitar ${m?.nombre || 'mueble'}`}>
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <div>
                      <span className="block text-xs font-bold text-cafe mb-1" id={`v-cant-${i}`}>Cantidad</span>
                      <div className="flex items-center rounded-full border border-gray-400 bg-white" role="group" aria-labelledby={`v-cant-${i}`}>
                        <button type="button" onClick={() => cambiarCantidad(i, -1)} className="w-10 h-10 rounded-full font-extrabold text-lg hover:bg-arena" aria-label="Quitar una unidad">−</button>
                        <input value={it.cantidad} onChange={(e) => setItem(i, 'cantidad', e.target.value.replace(/\D/g, ''))} inputMode="numeric" className="w-10 text-center font-extrabold outline-none bg-transparent" aria-label="Cantidad" aria-invalid={Boolean(eCant) || undefined} />
                        <button type="button" onClick={() => cambiarCantidad(i, 1)} className="w-10 h-10 rounded-full font-extrabold text-lg hover:bg-arena" aria-label="Agregar una unidad">+</button>
                      </div>
                    </div>
                    <div className="w-32">
                      <label htmlFor={`v-precio-${i}`} className="block text-xs font-bold text-cafe mb-1">Precio unit. (S/)</label>
                      <input id={`v-precio-${i}`} type="number" min="0" step="0.01" value={it.precioUnit} onChange={(e) => setItem(i, 'precioUnit', e.target.value)} className={`${claseInput(ePrecio)} h-10`} aria-invalid={Boolean(ePrecio) || undefined} />
                    </div>
                    <div className="ml-auto text-right">
                      <span className="block text-xs font-bold text-cafe">Subtotal</span>
                      <span className="font-extrabold text-lg">{formatPrice((Number(it.cantidad) || 0) * (Number(it.precioUnit) || 0))}</span>
                    </div>
                  </div>
                  {(eCant || ePrecio || eMueble) && (
                    <p className="text-xs font-semibold text-red-700 mt-2"><i className="fas fa-exclamation-circle mr-1"></i>{eMueble || eCant || ePrecio}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );

  /* ---------- Paso 3: Pago ---------- */
  const pasoPago = (
    <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-5">
      <div className="flex flex-col gap-4">
        <div>
          <span className="block text-[13px] font-extrabold mb-1.5">Método de pago <span className="text-red-700" aria-hidden="true">*</span></span>
          <Segmentado
            etiqueta="Método de pago"
            valor={datos.pago.metodo}
            onChange={(v) => setPago('metodo', v)}
            opciones={[{ id: 'efectivo', label: 'Efectivo', icono: 'fas fa-money-bill-wave' }, { id: 'yape', label: 'Yape', icono: 'fas fa-mobile-alt' }]}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo id="v-monto" label="Monto recibido (S/)" requerido error={err('pago.montoRecibido')}>
            <div className="flex gap-2">
              <input {...aria('v-monto', 'pago.montoRecibido')} type="number" min="0" step="0.01" value={datos.pago.montoRecibido} onChange={(e) => setPago('montoRecibido', e.target.value)} className={`${claseInput(err('pago.montoRecibido'))} text-lg font-extrabold`} />
              <button type="button" onClick={() => setPago('montoRecibido', total.toFixed(2))} className="shrink-0 h-12 px-3.5 rounded-2xl bg-arena font-extrabold text-sm hover:bg-linea transition" title="Usar el total exacto">Exacto</button>
            </div>
          </Campo>
          <Campo id="v-boleta" label="N.° de boleta" requerido error={err('pago.numeroBoleta')}>
            <input {...aria('v-boleta', 'pago.numeroBoleta')} value={datos.pago.numeroBoleta} onChange={(e) => setPago('numeroBoleta', e.target.value)} className={claseInput(err('pago.numeroBoleta'))} placeholder="Ej: 001-000123" />
          </Campo>
        </div>
        {datos.pago.metodo === 'yape' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-down">
            <Campo id="v-yape" label="N.° de operación Yape">
              <input id="v-yape" value={datos.pago.operacionYape} onChange={(e) => setPago('operacionYape', e.target.value)} className={claseInput()} />
            </Campo>
            <Campo id="v-captura" label="Captura de Yape (opcional)">
              <label htmlFor="v-captura" className="flex items-center gap-3 h-12 px-4 rounded-2xl border border-dashed border-gray-400 bg-white cursor-pointer hover:border-terracota transition">
                <i className="fas fa-camera text-cafe"></i>
                <span className="text-sm truncate">{captura ? captura.name : 'Elegir imagen'}</span>
              </label>
              <input id="v-captura" type="file" accept="image/*" onChange={(e) => setCaptura(e.target.files?.[0] || null)} className="sr-only" />
              {datos.pago.capturaUrl && !captura && <a href={datos.pago.capturaUrl} target="_blank" rel="noreferrer" className="text-xs font-bold underline">Ver captura guardada</a>}
            </Campo>
          </div>
        )}
        <Campo id="v-obs" label="Observaciones">
          <textarea id="v-obs" value={datos.observaciones} onChange={(e) => setDatos({ ...datos, observaciones: e.target.value })} className={`${claseInput()} h-20 py-3 resize-none`} />
        </Campo>
        {ventaACorregir && (
          <Campo id="v-motivo" label="Motivo de la corrección" requerido error={err('motivo')}>
            <input {...aria('v-motivo', 'motivo')} value={motivo} onChange={(e) => { setMotivo(e.target.value); limpiarError('motivo'); }} className={claseInput(err('motivo'))} placeholder="Ej: el cliente cambió el color del mueble" />
          </Campo>
        )}
      </div>

      {/* Resumen */}
      <aside aria-label="Resumen de la venta" className="rounded-3xl bg-espresso text-hueso p-5 flex flex-col gap-3 self-start">
        <div className="flex justify-between gap-3 text-sm">
          <span className="text-piedra">Cliente</span>
          <button type="button" onClick={() => irA(0)} className="font-bold text-terracota-claro hover:underline">Cambiar</button>
        </div>
        <p className="font-bold -mt-2">{`${datos.cliente.nombres} ${datos.cliente.apellidos}`.trim() || '—'} · {datos.tipo === 'pedido' ? 'Pedido' : 'En tienda'}</p>
        <div className="border-t border-espresso-2 pt-3 flex justify-between gap-3 text-sm">
          <span className="text-piedra">Muebles</span>
          <button type="button" onClick={() => irA(1)} className="font-bold text-terracota-claro hover:underline">Cambiar</button>
        </div>
        <ul className="flex flex-col gap-1 text-sm -mt-1">
          {datos.items.map((it) => (
            <li key={it.muebleId} className="flex justify-between gap-3">
              <span className="truncate">{porId[it.muebleId]?.nombre || 'Mueble'} × {it.cantidad}</span>
              <span className="font-bold shrink-0">{formatPrice((Number(it.cantidad) || 0) * (Number(it.precioUnit) || 0))}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-espresso-2 pt-3 flex justify-between items-baseline">
          <span className="font-bold">Total</span>
          <span key={total} className="font-display text-4xl font-semibold animate-aparecer">{formatPrice(total)}</span>
        </div>
        <div className="flex justify-between text-sm text-piedra">
          <span>Vuelto</span>
          <span key={vuelto} className="font-bold text-hueso animate-fade-in">{formatPrice(vuelto)}</span>
        </div>
      </aside>
    </div>
  );

  const contenido = [pasoCliente, pasoMuebles, pasoPago][paso];
  const ultimo = paso === PASOS.length - 1;

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-3xl shadow-[0_1px_2px_rgba(36,26,20,0.08)] p-5 sm:p-7 flex flex-col gap-6" noValidate>
      {/* Encabezado */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-[28px] font-semibold">
            {ventaACorregir ? `Corregir venta ${ventaACorregir.codigo}` : 'Nueva venta'}
          </h2>
          <p className="text-sm text-cafe">Paso {paso + 1} de {PASOS.length} · {PASOS[paso].titulo}</p>
        </div>
        <button type="button" onClick={onCancel} className="w-11 h-11 rounded-full text-cafe hover:bg-arena hover:text-espresso transition" aria-label="Cancelar y cerrar">
          <i className="fas fa-times text-lg"></i>
        </button>
      </div>

      {/* Indicador de pasos */}
      <ol className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Pasos de la venta">
        {PASOS.map((p, i) => {
          const hecho = i < paso;
          const actual = i === paso;
          const conError = Object.keys(errores).some((k) => p.es(k));
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => (puedeIrA(i) ? irA(i) : continuar())}
                aria-current={actual ? 'step' : undefined}
                className="w-full text-left flex flex-col gap-2 group"
              >
                <span className="h-1.5 rounded-full bg-arena overflow-hidden">
                  <span className={`block h-full rounded-full transition-all duration-500 ease-out ${conError ? 'bg-red-600 w-full' : hecho ? 'bg-espresso w-full' : actual ? 'bg-terracota w-full' : 'w-0'}`}></span>
                </span>
                <span className={`flex items-center gap-2 text-[13px] font-extrabold transition-colors ${conError ? 'text-red-700' : actual ? 'text-terracota-oscuro' : hecho ? 'text-espresso' : 'text-cafe'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] transition-all duration-300 ${hecho ? 'bg-espresso text-hueso' : actual ? 'bg-terracota text-espresso scale-110' : 'bg-arena text-cafe'}`}>
                    {hecho ? <i className="fas fa-check animate-aparecer"></i> : i + 1}
                  </span>
                  <span className="hidden sm:inline">{p.titulo}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {errorGeneral && (
        <div key={sacudir} role="alert" className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-2xl text-sm font-semibold animate-sacudir">
          <i className="fas fa-exclamation-triangle mr-2"></i>{errorGeneral}
        </div>
      )}

      {/* Contenido del paso con transición */}
      <div className="overflow-hidden -mx-1 px-1">
        <div key={paso} className={direccion === 'adelante' ? 'animate-paso-adelante' : 'animate-paso-atras'}>
          {contenido}
        </div>
      </div>

      {/* Navegación */}
      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-linea">
        <div className="mr-auto">
          <span className="block text-xs font-bold text-cafe">Total</span>
          <span key={total} className="font-display text-2xl font-semibold inline-block animate-aparecer">{formatPrice(total)}</span>
        </div>
        {paso > 0 ? (
          <button type="button" onClick={() => irA(paso - 1)} className="h-12 px-6 rounded-full border border-gray-400 font-extrabold hover:bg-arena transition">
            <i className="fas fa-arrow-left mr-2"></i>Atrás
          </button>
        ) : (
          <button type="button" onClick={onCancel} className="h-12 px-6 rounded-full font-extrabold text-cafe hover:bg-arena transition">Cancelar</button>
        )}
        <button
          type="submit"
          disabled={guardando}
          className={`group h-12 px-7 rounded-full font-extrabold transition-all disabled:opacity-60 ${ultimo ? 'bg-espresso text-hueso hover:bg-espresso-2' : 'bg-terracota text-espresso hover:bg-terracota-claro'}`}
        >
          {guardando ? (
            <><i className="fas fa-spinner fa-spin mr-2"></i>Guardando...</>
          ) : ultimo ? (
            <><i className="fas fa-check mr-2"></i>{ventaACorregir ? 'Guardar corrección' : 'Guardar venta'}</>
          ) : (
            <>Continuar a {PASOS[paso + 1].titulo.toLowerCase()}<i className="fas fa-arrow-right ml-2 transition-transform group-hover:translate-x-1"></i></>
          )}
        </button>
      </div>
    </form>
  );
};

export default VentaForm;
