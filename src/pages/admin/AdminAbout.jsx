import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { fixImageURL } from '../../utils/images';
import { TIPOS_RED, tipoRed, normalizarEnlaceRed, redesVisibles } from '../../config/redes';

const GEOCODING_KEY = 'AIzaSyBIZrptkE0IGakPhzMzMpq4PaW_gw_D1vk';

const INFO_VACIA = {
  titulo: 'Sobre Nosotros', historia: '', imagen: '',
  direccion: '', telefono: '', email: '', horario: '', lat: '', lng: '',
};

const nuevoId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const claseInput = 'w-full h-12 px-4 rounded-2xl border border-gray-400 bg-white outline-none focus:border-terracota focus:ring-4 focus:ring-terracota/25 transition';

const Campo = ({ id, label, children, ayuda }) => (
  <div>
    <label htmlFor={id} className="block text-[13px] font-extrabold mb-1.5">{label}</label>
    {children}
    {ayuda && <p className="text-xs text-cafe mt-1">{ayuda}</p>}
  </div>
);

const Dato = ({ icono, label, valor }) => (
  <div className="flex gap-3 py-2.5 border-b border-linea last:border-0">
    <i className={`fas ${icono} w-5 text-center text-cafe mt-1`} aria-hidden="true"></i>
    <div className="min-w-0">
      <p className="text-xs font-bold text-cafe">{label}</p>
      <p className={`break-words ${valor ? '' : 'text-cafe/70 italic'}`}>{valor || 'Sin completar'}</p>
    </div>
  </div>
);

/** Tarjeta con vista de solo lectura y botón Editar. */
const Seccion = ({ titulo, icono, editando, onEditar, accion, children }) => (
  <section className="bg-white rounded-3xl p-5 sm:p-6 flex flex-col gap-4 h-fit animate-fade-in-up">
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-2xl font-semibold flex items-center gap-3">
        <span className="w-10 h-10 rounded-2xl bg-arena flex items-center justify-center text-base"><i className={`fas ${icono}`}></i></span>
        {titulo}
      </h2>
      {accion !== undefined ? accion : (!editando && (
        <button type="button" onClick={onEditar} className="h-11 px-4 rounded-full border border-gray-400 font-extrabold text-sm hover:bg-espresso hover:text-hueso hover:border-espresso transition">
          <i className="fas fa-pen mr-2"></i>Editar
        </button>
      ))}
    </div>
    {children}
  </section>
);

const BotonesForm = ({ guardando, onCancelar }) => (
  <div className="flex justify-end gap-2 pt-2">
    <button type="button" onClick={onCancelar} className="h-11 px-5 rounded-full font-extrabold text-cafe hover:bg-arena transition">Cancelar</button>
    <button type="submit" disabled={guardando} className="h-11 px-6 rounded-full bg-terracota text-espresso font-extrabold hover:bg-terracota-claro disabled:opacity-60 transition">
      {guardando ? <><i className="fas fa-spinner fa-spin mr-2"></i>Guardando...</> : <><i className="fas fa-check mr-2"></i>Guardar</>}
    </button>
  </div>
);

/** Formulario de una red (agregar o editar). */
const FormRed = ({ inicial, onGuardar, onCancelar, guardando }) => {
  const [red, setRed] = useState(inicial?.red || 'facebook');
  const [url, setUrl] = useState(inicial?.url || '');
  const [error, setError] = useState('');
  const tipo = tipoRed(red);

  const enviar = (e) => {
    e.preventDefault();
    const r = normalizarEnlaceRed(red, url);
    if (r.error) { setError(r.error); return; }
    onGuardar({ id: inicial?.id || nuevoId(), red, url: r.url, activa: inicial?.activa ?? true });
  };

  return (
    <form onSubmit={enviar} className="rounded-2xl border-2 border-terracota/60 bg-hueso p-4 flex flex-col gap-3 animate-fade-in-down" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
        <Campo id="red-tipo" label="Red">
          <select id="red-tipo" value={red} onChange={(e) => { setRed(e.target.value); setError(''); }} className={claseInput}>
            {TIPOS_RED.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </Campo>
        <div>
          <label htmlFor="red-url" className="block text-[13px] font-extrabold mb-1.5">{red === 'whatsapp' ? 'Número o enlace' : 'Enlace'}</label>
          <input
            id="red-url"
            autoFocus
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(''); }}
            placeholder={tipo.ejemplo}
            className={`${claseInput} ${error ? 'border-red-600 bg-red-50' : ''}`}
            aria-invalid={Boolean(error) || undefined}
          />
          {error && <p className="text-xs font-semibold text-red-700 mt-1.5"><i className="fas fa-exclamation-circle mr-1"></i>{error}</p>}
        </div>
      </div>
      <BotonesForm guardando={guardando} onCancelar={onCancelar} />
    </form>
  );
};

const AdminAbout = () => {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(INFO_VACIA);
  const [borrador, setBorrador] = useState(INFO_VACIA);
  const [redes, setRedes] = useState([]);
  const [redesAntiguas, setRedesAntiguas] = useState(false);
  const [editando, setEditando] = useState(null); // 'historia' | 'contacto' | null
  const [editandoRed, setEditandoRed] = useState(null); // id | 'nueva' | null
  const [guardando, setGuardando] = useState(false);
  const [fetchingAddress, setFetchingAddress] = useState(false);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    getDoc(doc(db, 'content', 'about'))
      .then((snap) => {
        const data = snap.exists() ? snap.data() : {};
        const limpio = Object.fromEntries(Object.keys(INFO_VACIA).map((k) => [k, data[k] ?? INFO_VACIA[k]]));
        setInfo(limpio);
        if (Array.isArray(data.redes)) {
          setRedes(data.redes);
        } else {
          // Datos antiguos (facebook/instagram/teléfono): se muestran y se guardan al primer cambio
          const antiguas = redesVisibles(data).map((r) => ({ ...r, id: nuevoId(), activa: true }));
          setRedes(antiguas);
          setRedesAntiguas(antiguas.length > 0);
        }
      })
      .catch((error) => {
        console.error('Error cargando info:', error);
        setAviso({ tipo: 'error', texto: 'No se pudo cargar la información de la empresa.' });
      })
      .finally(() => setLoading(false));
  }, []);

  const mostrarAviso = (tipo, texto) => {
    setAviso({ tipo, texto });
    if (tipo === 'ok') setTimeout(() => setAviso((a) => (a?.texto === texto ? null : a)), 3500);
  };

  const guardarDoc = async (cambios, textoOk) => {
    setGuardando(true);
    try {
      await setDoc(doc(db, 'content', 'about'), cambios, { merge: true });
      mostrarAviso('ok', textoOk);
      return true;
    } catch (error) {
      console.error(error);
      mostrarAviso('error', error?.code === 'permission-denied' ? 'No tiene permiso para editar esta información (solo admin).' : 'No se pudo guardar. Revise la conexión.');
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const empezarEdicion = (seccion) => { setBorrador(info); setEditando(seccion); };
  const cambiar = (e) => setBorrador({ ...borrador, [e.target.name]: e.target.value });

  const guardarSeccion = async (e, campos, texto) => {
    e.preventDefault();
    const cambios = Object.fromEntries(campos.map((k) => [k, String(borrador[k] ?? '').trim()]));
    if (await guardarDoc(cambios, texto)) {
      setInfo({ ...info, ...cambios });
      setEditando(null);
    }
  };

  const guardarRedes = async (nuevas, texto) => {
    if (await guardarDoc({ redes: nuevas }, texto)) {
      setRedes(nuevas);
      setEditandoRed(null);
      setRedesAntiguas(false);
    }
  };

  const guardarRed = (red) => {
    const existe = redes.some((r) => r.id === red.id);
    guardarRedes(existe ? redes.map((r) => (r.id === red.id ? red : r)) : [...redes, red], existe ? 'Red actualizada.' : 'Red agregada.');
  };
  const eliminarRed = (red) => {
    if (!window.confirm(`¿Eliminar ${tipoRed(red.red).label} (${red.url})?`)) return;
    guardarRedes(redes.filter((r) => r.id !== red.id), 'Red eliminada.');
  };
  const alternarRed = (red) => guardarRedes(redes.map((r) => (r.id === red.id ? { ...r, activa: r.activa === false } : r)), red.activa === false ? 'Red visible en la web.' : 'Red oculta en la web.');
  const mover = (i, delta) => {
    const j = i + delta;
    if (j < 0 || j >= redes.length) return;
    const nuevas = [...redes];
    [nuevas[i], nuevas[j]] = [nuevas[j], nuevas[i]];
    guardarRedes(nuevas, 'Orden actualizado.');
  };

  const handleGetAddress = async () => {
    if (!borrador.lat || !borrador.lng) {
      mostrarAviso('error', 'Ingrese primero la latitud y la longitud.');
      return;
    }
    setFetchingAddress(true);
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${borrador.lat},${borrador.lng}&key=${GEOCODING_KEY}`);
      const data = await response.json();
      if (data.status === 'OK' && data.results.length > 0) {
        setBorrador((prev) => ({ ...prev, direccion: data.results[0].formatted_address }));
      } else {
        mostrarAviso('error', 'No se encontró una dirección para esas coordenadas.');
      }
    } catch (error) {
      console.error('Error buscando dirección:', error);
      mostrarAviso('error', 'No se pudo conectar con Google Maps.');
    } finally {
      setFetchingAddress(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" aria-busy="true">
        {[0, 1, 2].map((i) => <div key={i} className="h-64 rounded-3xl bg-arena animate-pulse"></div>)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-3xl font-semibold">Nosotros, contacto y redes</h2>
        <p className="text-cafe">Lo que se edita aquí aparece en la página «Nosotros», en el pie de la tienda y en la franja de muebles a medida.</p>
      </div>

      {aviso && (
        <div role="status" className={`px-4 py-3 rounded-2xl font-semibold flex justify-between items-center gap-3 animate-fade-in-down ${aviso.tipo === 'ok' ? 'bg-espresso text-hueso' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          <span>{aviso.tipo === 'ok' && <i className="fas fa-check-circle mr-2 text-terracota-claro"></i>}{aviso.texto}</span>
          <button type="button" onClick={() => setAviso(null)} className="w-9 h-9 rounded-full hover:bg-white/10" aria-label="Cerrar aviso"><i className="fas fa-times"></i></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* ---------- Redes sociales (CRUD) ---------- */}
        <Seccion
          titulo="Redes sociales"
          icono="fa-share-alt"
          accion={editandoRed !== null ? null : (
            <button type="button" onClick={() => setEditandoRed('nueva')} className="h-11 px-4 rounded-full bg-terracota text-espresso font-extrabold text-sm hover:bg-terracota-claro transition">
              <i className="fas fa-plus mr-2"></i>Agregar red
            </button>
          )}
        >
          {redesAntiguas && (
            <p className="text-sm bg-aviso-fondo text-aviso rounded-2xl px-4 py-3">
              Estas redes vienen de datos antiguos. Se guardarán en el formato nuevo cuando edite, agregue u oculte alguna.
            </p>
          )}
          {editandoRed === 'nueva' && <FormRed onGuardar={guardarRed} onCancelar={() => setEditandoRed(null)} guardando={guardando} />}
          {redes.length === 0 && editandoRed !== 'nueva' ? (
            <div className="text-center py-8 rounded-2xl border-2 border-dashed border-linea">
              <i className="fas fa-share-alt text-3xl text-piedra mb-2"></i>
              <p className="font-bold">Aún no hay redes sociales</p>
              <p className="text-sm text-cafe">Agregue Facebook, Instagram, TikTok o WhatsApp para que aparezcan en la tienda.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {redes.map((r, i) => {
                const t = tipoRed(r.red);
                if (editandoRed === r.id) {
                  return <li key={r.id}><FormRed inicial={r} onGuardar={guardarRed} onCancelar={() => setEditandoRed(null)} guardando={guardando} /></li>;
                }
                const visible = r.activa !== false;
                return (
                  <li key={r.id} className={`flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-hueso ${visible ? '' : 'opacity-60'}`}>
                    <span className="w-11 h-11 rounded-full bg-espresso text-hueso flex items-center justify-center shrink-0"><i className={t.icono}></i></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{t.label} {!visible && <span className="text-xs font-extrabold text-cafe ml-1">(oculta)</span>}</p>
                      <a href={r.url} target="_blank" rel="noreferrer" className="block text-sm text-cafe truncate hover:underline">{r.url}</a>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => mover(i, -1)} disabled={i === 0 || guardando} className="w-10 h-10 rounded-full hover:bg-arena disabled:opacity-30" aria-label={`Subir ${t.label}`}><i className="fas fa-arrow-up"></i></button>
                      <button type="button" onClick={() => mover(i, 1)} disabled={i === redes.length - 1 || guardando} className="w-10 h-10 rounded-full hover:bg-arena disabled:opacity-30" aria-label={`Bajar ${t.label}`}><i className="fas fa-arrow-down"></i></button>
                      <button type="button" onClick={() => alternarRed(r)} disabled={guardando} className="w-10 h-10 rounded-full hover:bg-arena" aria-label={visible ? `Ocultar ${t.label}` : `Mostrar ${t.label}`} title={visible ? 'Ocultar en la web' : 'Mostrar en la web'}><i className={`fas ${visible ? 'fa-eye' : 'fa-eye-slash'}`}></i></button>
                      <button type="button" onClick={() => setEditandoRed(r.id)} className="h-10 px-3 rounded-full hover:bg-espresso hover:text-hueso font-extrabold text-sm transition"><i className="fas fa-pen mr-1.5"></i>Editar</button>
                      <button type="button" onClick={() => eliminarRed(r)} disabled={guardando} className="w-10 h-10 rounded-full hover:bg-red-50 hover:text-red-700" aria-label={`Eliminar ${t.label}`}><i className="fas fa-trash-alt"></i></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Seccion>

        {/* ---------- Contacto y ubicación ---------- */}
        <Seccion titulo="Contacto y ubicación" icono="fa-map-marker-alt" editando={editando === 'contacto'} onEditar={() => empezarEdicion('contacto')}>
          {editando === 'contacto' ? (
            <form onSubmit={(e) => guardarSeccion(e, ['direccion', 'telefono', 'email', 'horario', 'lat', 'lng'], 'Contacto actualizado.')} className="flex flex-col gap-4 animate-fade-in" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Campo id="lat" label="Latitud"><input id="lat" name="lat" value={borrador.lat} onChange={cambiar} className={claseInput} placeholder="Ej: -12.0675" /></Campo>
                <Campo id="lng" label="Longitud"><input id="lng" name="lng" value={borrador.lng} onChange={cambiar} className={claseInput} placeholder="Ej: -75.2101" /></Campo>
              </div>
              <button type="button" onClick={handleGetAddress} disabled={fetchingAddress} className="h-11 rounded-full bg-arena font-extrabold text-sm hover:bg-linea transition">
                {fetchingAddress ? <><i className="fas fa-spinner fa-spin mr-2"></i>Buscando...</> : <><i className="fas fa-map-pin mr-2"></i>Obtener la dirección desde las coordenadas</>}
              </button>
              <Campo id="direccion" label="Dirección (se ve en la web)"><input id="direccion" name="direccion" value={borrador.direccion} onChange={cambiar} className={claseInput} /></Campo>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Campo id="telefono" label="Teléfono / WhatsApp" ayuda="Se usa para los botones de WhatsApp de la tienda."><input id="telefono" name="telefono" value={borrador.telefono} onChange={cambiar} className={claseInput} placeholder="987 654 321" /></Campo>
                <Campo id="email" label="Correo"><input id="email" name="email" type="email" value={borrador.email} onChange={cambiar} className={claseInput} placeholder="contacto@..." /></Campo>
              </div>
              <Campo id="horario" label="Horario de atención"><input id="horario" name="horario" value={borrador.horario} onChange={cambiar} className={claseInput} placeholder="Lun–Sáb: 9:00 a 19:00" /></Campo>
              <BotonesForm guardando={guardando} onCancelar={() => setEditando(null)} />
            </form>
          ) : (
            <div>
              <Dato icono="fa-map-marker-alt" label="Dirección" valor={info.direccion} />
              <Dato icono="fa-phone" label="Teléfono / WhatsApp" valor={info.telefono} />
              <Dato icono="fa-envelope" label="Correo" valor={info.email} />
              <Dato icono="fa-clock" label="Horario" valor={info.horario} />
              <Dato icono="fa-globe-americas" label="Coordenadas del mapa" valor={info.lat && info.lng ? `${info.lat}, ${info.lng}` : ''} />
            </div>
          )}
        </Seccion>

        {/* ---------- Historia ---------- */}
        <Seccion titulo="Nuestra historia" icono="fa-book-open" editando={editando === 'historia'} onEditar={() => empezarEdicion('historia')}>
          {editando === 'historia' ? (
            <form onSubmit={(e) => guardarSeccion(e, ['titulo', 'historia', 'imagen'], 'Historia actualizada.')} className="flex flex-col gap-4 animate-fade-in" noValidate>
              <Campo id="titulo" label="Título de la página"><input id="titulo" name="titulo" value={borrador.titulo} onChange={cambiar} className={claseInput} /></Campo>
              <Campo id="historia" label="Historia">
                <textarea id="historia" name="historia" value={borrador.historia} onChange={cambiar} className={`${claseInput} h-40 py-3 resize-y`} placeholder="Cuente cómo nació el negocio..." />
              </Campo>
              <Campo id="imagen" label="URL de la imagen"><input id="imagen" name="imagen" value={borrador.imagen} onChange={cambiar} className={claseInput} /></Campo>
              {borrador.imagen && <img src={fixImageURL(borrador.imagen)} alt="Vista previa" className="h-40 w-full object-cover rounded-2xl bg-arena" />}
              <BotonesForm guardando={guardando} onCancelar={() => setEditando(null)} />
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              {info.imagen && <img src={fixImageURL(info.imagen)} alt="Imagen de Nosotros" className="h-40 w-full object-cover rounded-2xl bg-arena" />}
              <p className="font-bold">{info.titulo}</p>
              <p className={`whitespace-pre-line line-clamp-6 ${info.historia ? 'text-cafe' : 'text-cafe/70 italic'}`}>{info.historia || 'Sin completar'}</p>
            </div>
          )}
        </Seccion>
      </div>
    </div>
  );
};

export default AdminAbout;
