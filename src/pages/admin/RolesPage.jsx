import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc,
  query,
  where
} from 'firebase/firestore';

// 1. DEFINIMOS LOS MÓDULOS DISPONIBLES (IDs fijos)
export const SYSTEM_MODULES = [
  { id: 'ventas', label: 'Ventas en tienda' },
  { id: 'disponibilidad', label: 'Consulta de disponibilidad' },
  { id: 'inventario', label: 'Inventario (ingresos, ajustes y kárdex)' },
  { id: 'pedidos_personalizados', label: 'Pedidos personalizados' },
  { id: 'reportes', label: 'Reportes de ventas y stock' },
  { id: 'dashboard', label: 'Dashboard Principal' },
  { id: 'pedidos', label: 'Pedidos en línea' },
  { id: 'productos', label: 'Inventario (Productos/Categorías)' },
  { id: 'clientes', label: 'Mensajes y Clientes' },
  { id: 'web', label: 'Configuración Web (Portada/Info)' },
  { id: 'roles', label: 'Gestión de Roles (Seguridad)' },
];

const RolesPage = () => {
  // Estados
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Formulario
  const [roleName, setRoleName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [editingId, setEditingId] = useState(null); // Si es null, estamos creando. Si tiene ID, editando.

  // Búsqueda de Usuario
  const [emailSearch, setEmailSearch] = useState("");
  const [foundUser, setFoundUser] = useState(null);
  const [userRoleSelect, setUserRoleSelect] = useState("");

  // Personal con acceso al panel (RF04)
  const [personal, setPersonal] = useState([]);

  const fetchPersonal = async () => {
    try {
      const snap = await getDocs(query(collection(db, "users"), where("role", "!=", "cliente")));
      setPersonal(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error cargando personal:", error);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchPersonal();
  }, []);

  const fetchRoles = async () => {
    const querySnapshot = await getDocs(collection(db, "roles"));
    const rolesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setRoles(rolesData);
  };

  // --- LOGICA DE CHECKBOXES ---
  const handleCheckboxChange = (moduleId) => {
    if (selectedPermissions.includes(moduleId)) {
      setSelectedPermissions(selectedPermissions.filter(id => id !== moduleId));
    } else {
      setSelectedPermissions([...selectedPermissions, moduleId]);
    }
  };

  // --- GUARDAR ROL (CREAR O EDITAR) ---
  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleName.trim()) return;

    setLoading(true);
    try {
      const roleData = {
        nombre: roleName.toLowerCase(), // Guardamos en minúscula para consistencia
        permissions: selectedPermissions // Guardamos el array de IDs permitidos
      };

      if (editingId) {
        // MODO EDICIÓN
        await updateDoc(doc(db, "roles", editingId), roleData);
        alert("Rol actualizado correctamente");
      } else {
        // MODO CREACIÓN
        await addDoc(collection(db, "roles"), roleData);
        alert("Rol creado correctamente");
      }

      // Resetear form
      setRoleName("");
      setSelectedPermissions([]);
      setEditingId(null);
      fetchRoles();
    } catch (error) {
      console.error("Error guardando rol:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- CARGAR DATOS PARA EDITAR ---
  const handleEditClick = (role) => {
    setRoleName(role.nombre);
    setSelectedPermissions(role.permissions || []); // Cargar sus permisos actuales
    setEditingId(role.id);
    // Hacemos scroll arriba para ver el formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setRoleName("");
    setSelectedPermissions([]);
    setEditingId(null);
  };

  const handleDeleteRole = async (id) => {
    if(!window.confirm("¿Seguro que deseas eliminar este rol?")) return;
    await deleteDoc(doc(db, "roles", id));
    fetchRoles();
  };

  // --- ASIGNACIÓN DE USUARIOS (Misma lógica anterior resumida) ---
  const handleSearchUser = async (e) => {
    e.preventDefault();
    const q = query(collection(db, "users"), where("email", "==", emailSearch.trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const u = snap.docs[0];
      setFoundUser({ id: u.id, ...u.data() });
      setUserRoleSelect(u.data().role || "cliente");
    } else {
      alert("Usuario no encontrado");
    }
  };

  const handleUpdateUserRole = async () => {
    if (!foundUser) return;
    await updateDoc(doc(db, "users", foundUser.id), { role: userRoleSelect });
    alert("Rol de usuario actualizado");
    setFoundUser(null);
    setEmailSearch("");
    fetchPersonal();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Gestión de Seguridad y Roles</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* --- FORMULARIO DE GESTIÓN DE ROLES --- */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-fit">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold text-gray-800">
               {editingId ? "✏️ Editando Rol" : "➕ Crear Nuevo Rol"}
             </h2>
             {editingId && (
               <button onClick={handleCancelEdit} className="text-sm text-red-500 underline">Cancelar Edición</button>
             )}
          </div>
          
          <form onSubmit={handleSaveRole}>
            <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Rol</label>
                <input 
                  type="text" 
                  placeholder="Ej: Encargado de Ventas" 
                  className="w-full border p-2 rounded-lg"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  required
                />
            </div>

            <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">Permisos de Acceso:</label>
                <div className="space-y-2 bg-gray-50 p-4 rounded-lg border">
                    {SYSTEM_MODULES.map((mod) => (
                        <label key={mod.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-1 rounded">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                                checked={selectedPermissions.includes(mod.id)}
                                onChange={() => handleCheckboxChange(mod.id)}
                            />
                            <span className="text-gray-700">{mod.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className={`w-full py-3 rounded-lg font-bold text-white transition ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-900 hover:bg-gray-800'}`}
            >
                {loading ? "Guardando..." : (editingId ? "Actualizar Permisos" : "Guardar Rol")}
            </button>
          </form>
        </div>

        {/* --- LISTA DE ROLES EXISTENTES --- */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <h2 className="text-xl font-bold mb-4">Roles Configurados</h2>
                <div className="space-y-3">
                    {/* Admin siempre visible pero ineditable */}
                    <div className="flex justify-between items-center p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div>
                            <h3 className="font-bold text-orange-900">Admin / Superadmin</h3>
                            <p className="text-xs text-orange-700">Acceso total al sistema</p>
                        </div>
                        <span className="text-xs font-bold bg-orange-200 text-orange-800 px-2 py-1 rounded">SISTEMA</span>
                    </div>

                    {roles.map(role => (
                        <div key={role.id} className="flex justify-between items-center p-4 bg-white border rounded-lg hover:shadow-md transition">
                            <div>
                                <h3 className="font-bold text-gray-800 capitalize">{role.nombre}</h3>
                                <p className="text-xs text-gray-500">
                                    {role.permissions?.length || 0} módulos permitidos
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleEditClick(role)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded tooltip"
                                    title="Editar permisos"
                                >
                                    <i className="fas fa-edit"></i>
                                </button>
                                <button 
                                    onClick={() => handleDeleteRole(role.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                                    title="Eliminar rol"
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- ASIGNAR ROL A USUARIO --- */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <h2 className="text-xl font-bold mb-4">Asignar Rol a Empleado</h2>
                <form onSubmit={handleSearchUser} className="flex gap-2 mb-4">
                    <input 
                        type="email" 
                        placeholder="empleado@email.com" 
                        className="flex-1 border p-2 rounded-lg"
                        value={emailSearch}
                        onChange={e => setEmailSearch(e.target.value)}
                    />
                    <button className="bg-gray-800 text-white px-4 rounded-lg"><i className="fas fa-search"></i></button>
                </form>

                {foundUser && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 animate-fade-in">
                        <p className="font-bold text-gray-700 mb-2">Usuario: {foundUser.nombre}</p>
                        <select 
                            className="w-full p-2 border rounded mb-3 bg-white"
                            value={userRoleSelect}
                            onChange={(e) => setUserRoleSelect(e.target.value)}
                        >
                            <option value="cliente">Cliente (Sin acceso)</option>
                            <option value="admin">Admin (Total)</option>
                            {roles.map(r => (
                                <option key={r.id} value={r.nombre}>{r.nombre}</option>
                            ))}
                        </select>
                        <button onClick={handleUpdateUserRole} className="w-full bg-blue-600 text-white py-2 rounded font-bold">Confirmar Cambio</button>
                    </div>
                )}

                <p className="text-xs text-gray-500 mt-4">Para dar acceso a un trabajador: el trabajador crea su cuenta en «Registrarse» y luego aquí se busca su correo y se le asigna un rol.</p>
                <h3 className="font-bold text-gray-700 mt-6 mb-2">Personal con acceso al panel</h3>
                <table className="w-full text-sm">
                    <tbody className="divide-y">
                        {personal.map(u => (
                            <tr key={u.id}>
                                <td className="py-2 font-medium">{u.nombre || '—'}</td>
                                <td className="py-2 text-gray-500">{u.email}</td>
                                <td className="py-2 text-right"><span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold uppercase">{u.role}</span></td>
                            </tr>
                        ))}
                        {personal.length === 0 && <tr><td className="py-2 text-gray-400">Aún no hay personal asignado.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
};

export default RolesPage;