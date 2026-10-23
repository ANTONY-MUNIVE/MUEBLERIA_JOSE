import React, { useState } from 'react';

/** Ventana para pedir un motivo antes de una acción irreversible (anular, ajustar, etc.). */
const MotivoModal = ({ titulo, descripcion, textoBoton = 'Confirmar', peligro = false, onConfirmar, onCancelar }) => {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const confirmar = async (e) => {
    e.preventDefault();
    if (motivo.trim().length < 3) { setError('Indique el motivo (mínimo 3 caracteres).'); return; }
    setEnviando(true);
    try {
      await onConfirmar(motivo.trim());
    } catch (err) {
      setError(err.message || 'No se pudo completar la acción.');
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={confirmar} className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-800">{titulo}</h3>
        {descripcion && <p className="text-sm text-gray-600">{descripcion}</p>}
        <textarea
          autoFocus
          value={motivo}
          onChange={(e) => { setMotivo(e.target.value); setError(''); }}
          className="w-full border border-gray-300 rounded-lg p-2.5 h-24 resize-none outline-none focus:ring-2 focus:ring-orange-400"
          placeholder="Motivo"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancelar} className="px-4 py-2 font-bold text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button type="submit" disabled={enviando} className={`px-4 py-2 font-bold text-white rounded-lg disabled:opacity-60 ${peligro ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
            {enviando ? 'Procesando...' : textoBoton}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MotivoModal;
