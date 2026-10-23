import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { fixImageURL } from '../../utils/images';
import { validarMueble } from '../../utils/validaciones';
import { STOCK_MINIMO_DEFAULT } from '../../config/app';

const VACIO = {
  codigo: '',
  nombre: '',
  precio: '',
  stock: '',
  stockMinimo: String(STOCK_MINIMO_DEFAULT),
  color: '',
  medidas: '',
  unidad: 'pieza',
  categoria: '',
  subcategoria: '',
  imagen: '',
  descripcion: ''
};

const ProductForm = ({ productToEdit, onSave, onCancel, errorExterno = '' }) => {
  // El formulario se monta de nuevo cada vez que se abre, así que se inicializa una sola vez
  const [formData, setFormData] = useState(() => (productToEdit
    ? { ...VACIO, ...productToEdit, stockMinimo: String(productToEdit.stockMinimo ?? STOCK_MINIMO_DEFAULT) }
    : VACIO));
  const [errores, setErrores] = useState({});
  const [categoriesData, setCategoriesData] = useState([]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  useEffect(() => {
    getDocs(collection(db, "categories"))
      .then((snap) => setCategoriesData(snap.docs.map(d => ({ nombre: d.data().nombre, sub: d.data().subcategorias || [] }))))
      .catch((error) => console.error(error));
  }, []);

  const availableSubcats = useMemo(
    () => categoriesData.find(c => c.nombre === formData.categoria)?.sub || [],
    [categoriesData, formData.categoria],
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'categoria') {
        setFormData(prev => ({ ...prev, categoria: value, subcategoria: '' }));
    } else if (name === 'codigo') {
        setFormData(prev => ({ ...prev, codigo: value.toUpperCase().replace(/\s/g, '') }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validarMueble(formData);
    if (!productToEdit && (formData.stock === '' || !Number.isInteger(Number(formData.stock)) || Number(formData.stock) < 0)) {
      errs.stock = 'Stock inicial: entero de 0 o más.';
    }
    if (!formData.categoria) errs.categoria = 'Seleccione la categoría.';
    setErrores(errs);
    if (Object.keys(errs).length) return;

    onSave({
        ...formData,
        codigo: formData.codigo.trim().toUpperCase(),
        nombre: formData.nombre.trim(),
        precio: parseFloat(formData.precio),
        stock: parseInt(formData.stock, 10) || 0,
        stockMinimo: formData.stockMinimo === '' ? STOCK_MINIMO_DEFAULT : parseInt(formData.stockMinimo, 10),
    });
  };

  const cls = (campo) => `w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${errores[campo] ? 'border-red-400 bg-red-50' : 'border-gray-300'}`;
  const err = (campo) => (errores[campo] ? <p className="text-xs text-red-600 mt-1">{errores[campo]}</p> : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">

        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800">
                {productToEdit ? '✏️ Editar Mueble' : '✨ Nuevo Mueble'}
            </h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-red-500 transition">
                <i className="fas fa-times text-xl"></i>
            </button>
        </div>

        <div className="p-8 overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                {errorExterno && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{errorExterno}</div>}

                {/* FILA 1: Código, Nombre y Precio */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Código *</label>
                        <input name="codigo" value={formData.codigo} onChange={handleChange} placeholder="Ej: ROP-001" className={cls('codigo')} />
                        {err('codigo')}
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Nombre *</label>
                        <input name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Ej: Ropero de 3 puertas" className={cls('nombre')} />
                        {err('nombre')}
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Precio (S/) *</label>
                        <input name="precio" type="number" min="0" step="0.01" value={formData.precio} onChange={handleChange} placeholder="0.00" className={cls('precio')} />
                        {err('precio')}
                    </div>
                </div>

                {/* FILA 2: Color, medidas, unidad */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Color</label>
                        <input name="color" value={formData.color} onChange={handleChange} placeholder="Ej: Caoba" className={cls('color')} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Medidas</label>
                        <input name="medidas" value={formData.medidas} onChange={handleChange} placeholder="Ej: 1.80 × 0.60 × 2.00 m" className={cls('medidas')} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Unidad de venta *</label>
                        <select name="unidad" value={formData.unidad} onChange={handleChange} className={cls('unidad')}>
                            <option value="pieza">Pieza</option>
                            <option value="juego">Juego (ej. mesa con sillas)</option>
                        </select>
                        {err('unidad')}
                    </div>
                </div>

                {/* FILA 3: Stock */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">{productToEdit ? 'Stock actual' : 'Stock inicial *'}</label>
                        {productToEdit ? (
                            <>
                                <input value={formData.stock ?? 0} disabled className="w-full border border-gray-200 p-3 rounded-lg bg-gray-100 text-gray-600" />
                                <p className="text-xs text-gray-500 mt-1">El stock solo cambia con ventas, ingresos o ajustes en el módulo Inventario, para que quede registrado cada movimiento.</p>
                            </>
                        ) : (
                            <>
                                <input name="stock" type="number" min="0" step="1" value={formData.stock} onChange={handleChange} placeholder="Ej: 10" className={cls('stock')} />
                                {err('stock')}
                            </>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Stock mínimo (alerta)</label>
                        <input name="stockMinimo" type="number" min="0" step="1" value={formData.stockMinimo} onChange={handleChange} className={cls('stockMinimo')} />
                        {err('stockMinimo')}
                    </div>
                </div>

                {/* FILA 4: Categorías */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Categoría *</label>
                        <select name="categoria" value={formData.categoria} onChange={handleChange} className={cls('categoria')}>
                            <option value="">Seleccionar...</option>
                            {categoriesData.map((c, i) => <option key={i} value={c.nombre}>{c.nombre}</option>)}
                        </select>
                        {err('categoria')}
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Subcategoría</label>
                        <select name="subcategoria" value={formData.subcategoria} onChange={handleChange} className="w-full border border-gray-300 p-3 rounded-lg disabled:bg-gray-100 outline-none" disabled={!formData.categoria || availableSubcats.length === 0}>
                            <option value="">{availableSubcats.length === 0 ? '---' : 'Seleccionar...'}</option>
                            {availableSubcats.map((sub, i) => <option key={i} value={sub}>{sub}</option>)}
                        </select>
                    </div>
                </div>

                {/* FILA 5: Imagen y Preview */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">URL Imagen</label>
                    <div className="flex gap-4 items-start">
                        <input name="imagen" value={formData.imagen} onChange={handleChange} className="flex-1 border border-gray-300 p-3 rounded-lg outline-none" />
                        {formData.imagen && (
                            <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm shrink-0 bg-gray-50">
                                <img src={fixImageURL(formData.imagen)} alt="Vista" className="w-full h-full object-cover" onError={(e) => {e.target.src = 'https://via.placeholder.com/150?text=Error';}} />
                            </div>
                        )}
                    </div>
                </div>

                {/* FILA 6: Descripción */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Descripción</label>
                    <textarea name="descripcion" value={formData.descripcion} onChange={handleChange} className="w-full border border-gray-300 p-3 rounded-lg outline-none h-24 resize-none" />
                </div>
            </form>
        </div>

        <div className="px-8 py-5 bg-gray-50 border-t border-gray-200 flex justify-end gap-4">
            <button type="button" onClick={onCancel} className="px-6 py-2.5 text-gray-700 font-bold hover:bg-gray-200 rounded-lg transition">Cancelar</button>
            <button onClick={handleSubmit} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold shadow-lg hover:bg-blue-700 transition">
                {productToEdit ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
