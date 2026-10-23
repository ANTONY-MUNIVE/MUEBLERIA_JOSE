import React, { useRef, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { medir } from '../../services/ventasService';
import { formatPrice, fixImageURL } from '../../utils/images';
import { STOCK_MINIMO_DEFAULT } from '../../config/app';

const normalizar = (t) => String(t || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/** Consulta de disponibilidad por código o nombre (RF12, indicador T2 y ED1). */
const AdminDisponibilidad = () => {
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [ms, setMs] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const buscar = async (e) => {
    e.preventDefault();
    const t = normalizar(termino);
    if (!t) { setError('Escriba el código o el nombre del mueble.'); inputRef.current?.focus(); return; }
    setError('');
    setBuscando(true);
    const t0 = performance.now();
    try {
      const snap = await medir('consultar_disponibilidad', () => getDocs(collection(db, 'muebles')));
      const todos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const exactos = todos.filter((m) => normalizar(m.codigo) === t);
      const lista = exactos.length ? exactos : todos.filter((m) =>
        normalizar(m.nombre).includes(t) || normalizar(m.codigo).includes(t) || normalizar(m.color).includes(t));
      setResultados(lista.sort((a, b) => (b.stock || 0) - (a.stock || 0)));
      setMs(Math.round(performance.now() - t0));
    } catch (err) {
      console.error(err);
      setError('No se pudo consultar. Revise la conexión de datos.');
    } finally {
      setBuscando(false);
    }
  };

  const estado = (m) => {
    const stock = Number(m.stock) || 0;
    const minimo = m.stockMinimo ?? STOCK_MINIMO_DEFAULT;
    if (stock <= 0) return { texto: 'AGOTADO', clase: 'bg-red-600 text-white' };
    if (stock <= minimo) return { texto: `DISPONIBLE: ${stock} (stock bajo)`, clase: 'bg-yellow-400 text-gray-900' };
    return { texto: `DISPONIBLE: ${stock}`, clase: 'bg-green-600 text-white' };
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Consultar disponibilidad</h1>
      <form onSubmit={buscar} className="bg-white p-4 rounded-xl shadow border border-gray-200 flex gap-3">
        <input
          ref={inputRef}
          autoFocus
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          placeholder="Código (ej. ROP-001) o nombre (ej. ropero)"
          className="flex-1 border border-gray-300 rounded-lg p-3 text-lg outline-none focus:ring-2 focus:ring-orange-400"
        />
        <button type="submit" disabled={buscando} className="bg-orange-600 text-white px-6 rounded-lg font-bold hover:bg-orange-700 disabled:opacity-60">
          {buscando ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-search mr-2"></i>Buscar</>}
        </button>
      </form>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      {ms !== null && !error && <p className="text-xs text-gray-400 mt-2 text-right">Respuesta en {ms} ms</p>}

      {resultados && (
        <div className="mt-4 space-y-3">
          {resultados.length === 0 && <div className="bg-white p-6 rounded-xl border text-center text-gray-500">No se encontró ningún mueble con «{termino}».</div>}
          {resultados.map((m) => {
            const e = estado(m);
            return (
              <div key={m.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex gap-4 items-center">
                <img src={fixImageURL(m.imagen)} alt={m.nombre} className="w-20 h-20 object-cover rounded bg-gray-100" />
                <div className="flex-1">
                  <div className="text-xs text-gray-500 font-bold">{m.codigo || 'SIN CÓDIGO'}</div>
                  <div className="text-lg font-bold text-gray-800">{m.nombre}</div>
                  <div className="text-sm text-gray-600">
                    {[m.color, m.medidas, m.unidad === 'juego' ? 'Juego' : m.unidad ? 'Pieza' : null].filter(Boolean).join(' · ')}
                    {m.precio ? ` · ${formatPrice(m.precio)}` : ''}
                  </div>
                </div>
                <span className={`px-4 py-2 rounded-lg font-bold text-sm text-center ${e.clase}`}>{e.texto}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminDisponibilidad;
