// Operaciones de ventas, inventario y pedidos personalizados.
// Cada operación que cambia el stock usa una transacción de Firestore para que
// la venta, el descuento de stock y el movimiento de inventario se guarden juntos
// o no se guarde nada (RF13–RF18, RF22–RF23).
import {
  collection, doc, getDoc, runTransaction, serverTimestamp, addDoc, getDocs, query, where,
  writeBatch, updateDoc, arrayUnion,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { APP_VERSION } from '../config/app';
import { calcularTotal, redondear } from '../utils/validaciones';

const usuarioActual = () => ({
  uid: auth.currentUser?.uid || null,
  email: auth.currentUser?.email || null,
});

// ---------------------------------------------------------------------------
// MODO MEDICIÓN (indicadores ED1 y T1/T2 de la tesis)
// Cuando está activo, cada operación registra su tiempo de respuesta en la
// colección "metricas". Se activa por dispositivo desde la pantalla Reportes.
// ---------------------------------------------------------------------------
const KEY_MEDICION = 'jose.modoMedicion';

export const modoMedicionActivo = () => {
  try { return localStorage.getItem(KEY_MEDICION) === '1'; } catch { return false; }
};

export const setModoMedicion = (activo) => {
  try { localStorage.setItem(KEY_MEDICION, activo ? '1' : '0'); } catch { /* sin almacenamiento local */ }
};

export const registrarMetrica = (operacion, ms, extra = {}) => {
  if (!modoMedicionActivo()) return;
  addDoc(collection(db, 'metricas'), {
    operacion,
    ms: Math.round(ms),
    fecha: serverTimestamp(),
    fechaCliente: new Date().toISOString(),
    usuario: usuarioActual().email,
    version: APP_VERSION,
    online: typeof navigator !== 'undefined' ? navigator.onLine : null,
    conexion: typeof navigator !== 'undefined' ? (navigator.connection?.effectiveType || null) : null,
    ...extra,
  }).catch((err) => console.warn('No se pudo registrar la métrica:', err));
};

/** Ejecuta fn() y registra su duración como métrica de la operación. */
export const medir = async (operacion, fn, extra) => {
  const t0 = performance.now();
  const resultado = await fn();
  registrarMetrica(operacion, performance.now() - t0, extra);
  return resultado;
};

// ---------------------------------------------------------------------------
// AYUDAS INTERNAS
// ---------------------------------------------------------------------------
const nuevoMovimiento = (tx, datos) => {
  const ref = doc(collection(db, 'movimientos'));
  tx.set(ref, {
    ...datos,
    fecha: serverTimestamp(),
    fechaCliente: new Date().toISOString(),
    usuario: usuarioActual().email,
    version: APP_VERSION,
  });
};

const normalizarItems = (items = []) => {
  const porMueble = new Map();
  items.forEach((it) => {
    const cantidad = parseInt(it.cantidad, 10) || 0;
    const precioUnit = redondear(it.precioUnit);
    const previo = porMueble.get(it.muebleId);
    if (previo) previo.cantidad += cantidad;
    else porMueble.set(it.muebleId, { muebleId: it.muebleId, cantidad, precioUnit });
  });
  return [...porMueble.values()].map((it) => ({ ...it, subtotal: redondear(it.cantidad * it.precioUnit) }));
};

const cantidadesPorMueble = (items = []) =>
  items.reduce((acc, it) => ({ ...acc, [it.muebleId]: (acc[it.muebleId] || 0) + Number(it.cantidad) }), {});

const limpiarCliente = (c = {}) => ({
  nombres: String(c.nombres || '').trim(),
  apellidos: String(c.apellidos || '').trim(),
  direccion: String(c.direccion || '').trim(),
  celular: String(c.celular || '').trim(),
});

const armarPago = (pago = {}, total) => {
  const monto = redondear(pago.montoRecibido);
  return {
    metodo: pago.metodo,
    montoRecibido: monto,
    vuelto: redondear(Math.max(0, monto - total)),
    numeroBoleta: String(pago.numeroBoleta || '').trim(),
    operacionYape: String(pago.operacionYape || '').trim(),
    // Ventas antiguas con Storage guardaban la URL; ahora la captura va en capturasYape/{ventaId}
    capturaUrl: pago.metodo === 'yape' ? (pago.capturaUrl || null) : null,
    tieneCaptura: pago.metodo === 'yape' && Boolean(pago.tieneCaptura),
  };
};

// ---------------------------------------------------------------------------
// CAPTURAS DE YAPE (en Firestore, sin Storage)
// La imagen ya comprimida (data URL JPEG, < 400 KB) se guarda en capturasYape/{ventaId},
// separada de la venta para que la lista de ventas no descargue imágenes.
// ---------------------------------------------------------------------------

const guardarCapturaEnTx = (tx, ventaId, codigo, dataUrl) => {
  tx.set(doc(db, 'capturasYape', ventaId), {
    ventaId,
    codigo,
    dataUrl,
    bytes: dataUrl.length,
    subidoPor: usuarioActual().email,
    creadoEn: serverTimestamp(),
  });
};

/** Devuelve el data URL de la captura de Yape de una venta, o null si no tiene. */
export const obtenerCapturaYape = async (ventaId) => {
  const snap = await getDoc(doc(db, 'capturasYape', ventaId));
  return snap.exists() ? snap.data().dataUrl : null;
};

// ---------------------------------------------------------------------------
// VENTAS (RF13–RF18)
// ---------------------------------------------------------------------------

/**
 * Registra una venta en tienda, descuenta el stock de cada mueble y crea un
 * movimiento de inventario por mueble, todo en una sola transacción (RF13, RF15–RF17).
 * @param {object} datos { fecha, tipo, cliente, items, pago, observaciones }
 * @param {object} medicion { abiertoEn, guardadoEn } en milisegundos (indicador T1)
 */
export const registrarVenta = async (datos, medicion = {}) => {
  const items = normalizarItems(datos.items);
  const total = calcularTotal(items);
  const captura = datos.pago?.metodo === 'yape' ? datos.capturaYape : null;
  const pago = armarPago({ ...datos.pago, tieneCaptura: Boolean(captura) }, total);

  return runTransaction(db, async (tx) => {
    // 1. Lecturas (todas antes de escribir)
    const contadorRef = doc(db, 'contadores', 'ventas');
    const contador = await tx.get(contadorRef);
    const refs = items.map((it) => doc(db, 'muebles', it.muebleId));
    const snaps = [];
    for (const r of refs) snaps.push(await tx.get(r));

    // 2. Validación de existencias con datos actuales
    const detalle = items.map((it, i) => {
      if (!snaps[i].exists()) throw new Error('Uno de los muebles ya no existe en el inventario.');
      const m = snaps[i].data();
      const stock = Number(m.stock) || 0;
      if (it.cantidad > stock) throw new Error(`Stock insuficiente de "${m.nombre}": quedan ${stock}.`);
      return { ...it, codigo: m.codigo || '', nombre: m.nombre || '', stockAntes: stock };
    });

    // 3. Escrituras
    const numero = (contador.exists() ? Number(contador.data().ultimo) || 0 : 0) + 1;
    const codigo = `V-${String(numero).padStart(5, '0')}`;
    const ventaRef = doc(collection(db, 'ventas'));
    tx.set(contadorRef, { ultimo: numero }, { merge: true });

    detalle.forEach((it, i) => {
      tx.update(refs[i], { stock: it.stockAntes - it.cantidad });
      nuevoMovimiento(tx, {
        muebleId: it.muebleId, codigo: it.codigo, nombre: it.nombre, tipo: 'venta',
        cantidad: -it.cantidad, stockAntes: it.stockAntes, stockDespues: it.stockAntes - it.cantidad,
        motivo: `Venta ${codigo}`, documento: pago.numeroBoleta, ventaId: ventaRef.id,
      });
    });

    const venta = {
      codigo,
      fecha: datos.fecha,
      tipo: datos.tipo,
      cliente: limpiarCliente(datos.cliente),
      items: detalle.map((it) => { const { stockAntes: _S, ...resto } = it; return resto; }),
      total,
      pago,
      observaciones: String(datos.observaciones || '').trim(),
      estado: 'registrada',
      entregada: false,
      registradoPor: usuarioActual(),
      creadoEn: serverTimestamp(),
      medicion: {
        abiertoEn: medicion.abiertoEn || null,
        guardadoEn: medicion.guardadoEn || null,
        duracionSeg: medicion.abiertoEn && medicion.guardadoEn
          ? redondear((medicion.guardadoEn - medicion.abiertoEn) / 1000) : null,
        version: APP_VERSION,
      },
      correcciones: 0,
      historial: [],
    };
    tx.set(ventaRef, venta);
    if (captura) guardarCapturaEnTx(tx, ventaRef.id, codigo, captura);
    return { id: ventaRef.id, ...venta, creadoEn: new Date() };
  });
};

/**
 * Corrige una venta registrada antes de la entrega (RF18). Ajusta el stock solo
 * por la diferencia de cantidades y deja en el historial la versión anterior.
 */
export const corregirVenta = async (ventaId, datos, motivo) => {
  const items = normalizarItems(datos.items);
  const total = calcularTotal(items);
  const captura = datos.pago?.metodo === 'yape' ? datos.capturaYape : null;

  return runTransaction(db, async (tx) => {
    const ventaRef = doc(db, 'ventas', ventaId);
    const vSnap = await tx.get(ventaRef);
    if (!vSnap.exists()) throw new Error('La venta no existe.');
    const v = vSnap.data();
    if (v.estado !== 'registrada') throw new Error('Solo se pueden corregir ventas registradas.');
    if (v.entregada) throw new Error('La venta ya fue entregada; no se puede corregir.');

    // La captura anterior se conserva si sigue siendo Yape y no se adjuntó otra
    const pago = armarPago({ ...datos.pago, tieneCaptura: Boolean(captura) || Boolean(v.pago?.tieneCaptura) }, total);

    const antes = cantidadesPorMueble(v.items);
    const despues = cantidadesPorMueble(items);
    const ids = [...new Set([...Object.keys(antes), ...Object.keys(despues)])];
    const snaps = {};
    for (const id of ids) snaps[id] = await tx.get(doc(db, 'muebles', id));

    const cambios = ids.map((id) => {
      if (!snaps[id].exists()) throw new Error('Uno de los muebles ya no existe en el inventario.');
      const m = snaps[id].data();
      const stock = Number(m.stock) || 0;
      const delta = (despues[id] || 0) - (antes[id] || 0); // unidades adicionales que salen
      if (stock - delta < 0) throw new Error(`Stock insuficiente de "${m.nombre}": quedan ${stock}.`);
      return { id, m, stock, delta };
    });

    cambios.filter((c) => c.delta !== 0).forEach((c) => {
      tx.update(doc(db, 'muebles', c.id), { stock: c.stock - c.delta });
      nuevoMovimiento(tx, {
        muebleId: c.id, codigo: c.m.codigo || '', nombre: c.m.nombre || '', tipo: 'correccion',
        cantidad: -c.delta, stockAntes: c.stock, stockDespues: c.stock - c.delta,
        motivo: `Corrección de ${v.codigo}: ${motivo}`, documento: pago.numeroBoleta, ventaId,
      });
    });

    if (captura) guardarCapturaEnTx(tx, ventaId, v.codigo, captura);

    const detalle = items.map((it) => ({ ...it, codigo: snaps[it.muebleId].data().codigo || '', nombre: snaps[it.muebleId].data().nombre || '' }));
    tx.update(ventaRef, {
      fecha: datos.fecha,
      tipo: datos.tipo,
      cliente: limpiarCliente(datos.cliente),
      items: detalle,
      total,
      pago,
      observaciones: String(datos.observaciones || '').trim(),
      actualizadoEn: serverTimestamp(),
      correcciones: (v.correcciones || 0) + 1,
      historial: [...(v.historial || []), {
        accion: 'correccion', motivo, fecha: new Date().toISOString(), usuario: usuarioActual().email,
        anterior: { fecha: v.fecha, tipo: v.tipo, cliente: v.cliente, items: v.items, total: v.total, pago: v.pago },
      }],
    });
  });
};

/** Anula una venta antes de la entrega y devuelve las unidades al stock (RF18). */
export const anularVenta = async (ventaId, motivo) =>
  runTransaction(db, async (tx) => {
    const ventaRef = doc(db, 'ventas', ventaId);
    const vSnap = await tx.get(ventaRef);
    if (!vSnap.exists()) throw new Error('La venta no existe.');
    const v = vSnap.data();
    if (v.estado !== 'registrada') throw new Error('La venta ya está anulada.');
    if (v.entregada) throw new Error('La venta ya fue entregada; no se puede anular.');

    const cant = cantidadesPorMueble(v.items);
    const ids = Object.keys(cant);
    const snaps = {};
    for (const id of ids) snaps[id] = await tx.get(doc(db, 'muebles', id));

    ids.forEach((id) => {
      if (!snaps[id].exists()) return; // el mueble fue eliminado: no hay stock que devolver
      const m = snaps[id].data();
      const stock = Number(m.stock) || 0;
      tx.update(doc(db, 'muebles', id), { stock: stock + cant[id] });
      nuevoMovimiento(tx, {
        muebleId: id, codigo: m.codigo || '', nombre: m.nombre || '', tipo: 'anulacion',
        cantidad: cant[id], stockAntes: stock, stockDespues: stock + cant[id],
        motivo: `Anulación de ${v.codigo}: ${motivo}`, documento: v.pago?.numeroBoleta || '', ventaId,
      });
    });

    tx.update(ventaRef, {
      estado: 'anulada',
      anulacion: { motivo, fecha: new Date().toISOString(), usuario: usuarioActual().email },
      actualizadoEn: serverTimestamp(),
      historial: [...(v.historial || []), { accion: 'anulacion', motivo, fecha: new Date().toISOString(), usuario: usuarioActual().email }],
    });
  });

export const marcarVentaEntregada = (ventaId) =>
  updateDoc(doc(db, 'ventas', ventaId), {
    entregada: true,
    entregadaEn: new Date().toISOString(),
    historial: arrayUnion({ accion: 'entrega', fecha: new Date().toISOString(), usuario: usuarioActual().email }),
  });

// ---------------------------------------------------------------------------
// INVENTARIO (RF07, RF22, RF23)
// ---------------------------------------------------------------------------

/** Ingreso de mercadería (cantidad > 0) o ajuste por conteo físico. */
export const registrarMovimientoInventario = async ({ tipo, muebleId, cantidad, conteoFisico, motivo, documento }) =>
  runTransaction(db, async (tx) => {
    const ref = doc(db, 'muebles', muebleId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('El mueble no existe.');
    const m = snap.data();
    const stock = Number(m.stock) || 0;
    const delta = tipo === 'ingreso' ? parseInt(cantidad, 10) : parseInt(conteoFisico, 10) - stock;
    const nuevo = stock + delta;
    if (nuevo < 0) throw new Error('El stock no puede quedar negativo.');
    tx.update(ref, { stock: nuevo });
    nuevoMovimiento(tx, {
      muebleId, codigo: m.codigo || '', nombre: m.nombre || '', tipo,
      cantidad: delta, stockAntes: stock, stockDespues: nuevo,
      motivo: String(motivo).trim(), documento: String(documento || '').trim(), ventaId: null,
      ...(tipo === 'ajuste' ? { conteoFisico: parseInt(conteoFisico, 10) } : {}),
    });
    return nuevo;
  });

/** Comprueba que el código no lo use otro mueble. */
export const codigoDisponible = async (codigo, exceptoId = null) => {
  const snap = await getDocs(query(collection(db, 'muebles'), where('codigo', '==', codigo)));
  return snap.docs.every((d) => d.id === exceptoId);
};

/** Crea un mueble y, si tiene stock inicial, su movimiento de ingreso. */
export const crearMueble = async (datos) => {
  const batch = writeBatch(db);
  const ref = doc(collection(db, 'muebles'));
  const stock = parseInt(datos.stock, 10) || 0;
  batch.set(ref, { ...datos, stock, creadoEn: serverTimestamp() });
  if (stock > 0) {
    const mov = doc(collection(db, 'movimientos'));
    batch.set(mov, {
      muebleId: ref.id, codigo: datos.codigo || '', nombre: datos.nombre || '', tipo: 'ingreso',
      cantidad: stock, stockAntes: 0, stockDespues: stock, motivo: datos.motivoStock || 'Stock inicial',
      documento: '', ventaId: null, fecha: serverTimestamp(), fechaCliente: new Date().toISOString(),
      usuario: usuarioActual().email, version: APP_VERSION,
    });
  }
  await batch.commit();
  return ref.id;
};

/** Actualiza los datos de un mueble sin tocar el stock (el stock solo cambia con movimientos). */
export const actualizarMueble = (id, datos) => {
  const { stock: _s, id: _i, ...resto } = datos;
  return updateDoc(doc(db, 'muebles', id), { ...resto, actualizadoEn: serverTimestamp() });
};

/** Asigna códigos a los muebles que no tienen (CAT-001, CAT-002...). */
export const generarCodigosFaltantes = async (muebles) => {
  const usados = new Set(muebles.map((m) => m.codigo).filter(Boolean));
  const batch = writeBatch(db);
  let n = 0;
  const contadores = {};
  muebles.filter((m) => !m.codigo).forEach((m) => {
    const prefijo = String(m.categoria || m.category || 'MUE')
      .normalize('NFD').replace(/\p{M}/gu, '').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
    let codigo;
    do {
      contadores[prefijo] = (contadores[prefijo] || 0) + 1;
      codigo = `${prefijo}-${String(contadores[prefijo]).padStart(3, '0')}`;
    } while (usados.has(codigo));
    usados.add(codigo);
    batch.update(doc(db, 'muebles', m.id), { codigo });
    n += 1;
  });
  if (n) await batch.commit();
  return n;
};

// ---------------------------------------------------------------------------
// PEDIDOS PERSONALIZADOS (RF20, RF21)
// ---------------------------------------------------------------------------
export const crearPedidoPersonalizado = async (p) => {
  const precioTotal = redondear(p.precioTotal);
  const adelanto = redondear(p.adelanto || 0);
  const ref = await addDoc(collection(db, 'pedidosPersonalizados'), {
    cliente: limpiarCliente(p.cliente),
    modelo: String(p.modelo || '').trim(),
    medidas: String(p.medidas || '').trim(),
    color: String(p.color || '').trim(),
    imagenReferencia: String(p.imagenReferencia || '').trim(),
    precioTotal,
    adelanto,
    saldo: redondear(precioTotal - adelanto),
    fechaEntrega: p.fechaEntrega || '',
    observaciones: String(p.observaciones || '').trim(),
    estado: 'registrado',
    creadoEn: serverTimestamp(),
    registradoPor: usuarioActual(),
    historial: [{ estado: 'registrado', fecha: new Date().toISOString(), usuario: usuarioActual().email }],
  });
  return ref.id;
};

export const cambiarEstadoPedido = (id, estado, nota = '') =>
  updateDoc(doc(db, 'pedidosPersonalizados', id), {
    estado,
    actualizadoEn: serverTimestamp(),
    historial: arrayUnion({ estado, nota, fecha: new Date().toISOString(), usuario: usuarioActual().email }),
  });

export const registrarPagoSaldo = (pedido, monto) => {
  const pagado = redondear((pedido.pagosSaldo || 0) + Number(monto));
  return updateDoc(doc(db, 'pedidosPersonalizados', pedido.id), {
    pagosSaldo: pagado,
    saldo: redondear(Math.max(0, pedido.precioTotal - pedido.adelanto - pagado)),
    historial: arrayUnion({ estado: pedido.estado, nota: `Pago de saldo S/ ${Number(monto).toFixed(2)}`, fecha: new Date().toISOString(), usuario: usuarioActual().email }),
  });
};
