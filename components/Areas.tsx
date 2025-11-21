import React, { useState, useEffect } from 'react';
import { Area, UserRole, User } from '../types';
import { db, generateId } from '../services/db';
import { Edit2, Save, X, Upload, MapPin, Plus, Trash2, Box, ArrowRight } from 'lucide-react';

interface AreasProps {
  user: User;
  onNavigate: (view: string, params?: any) => void;
}

export const Areas: React.FC<AreasProps> = ({ user, onNavigate }) => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Area>>({});
  
  // State for creating new area
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAreaForm, setNewAreaForm] = useState<Partial<Area>>({
    image: 'https://picsum.photos/seed/new/400/300'
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    refreshAreas();
  }, []);

  const refreshAreas = async () => {
    setIsLoading(true);
    const data = await db.getAreas();
    setAreas(data);
    setIsLoading(false);
  };

  const handleEdit = (area: Area) => {
    if (user.role !== UserRole.ADMIN) {
      alert('Solo administradores pueden editar áreas.');
      return;
    }
    setEditingId(area.id);
    setEditForm(area);
  };

  const handleDelete = async (id: string) => {
    if (user.role !== UserRole.ADMIN) return;
    
    if (window.confirm('¿Estás seguro de eliminar esta área? Los objetos asignados a ella quedarán sin ubicación definida.')) {
      await db.deleteArea(id);
      await db.addLog({
        id: generateId(),
        action: 'DELETE',
        details: `Área eliminada ID: ${id}`,
        timestamp: new Date().toISOString(),
        userId: user.id,
        username: user.username
      });
      await refreshAreas();
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.name) return;
    
    const areaToUpdate = { ...editForm, id: editingId } as Area;
    // We just update this specific area in DB
    await db.updateArea(areaToUpdate);
    
    await db.addLog({
      id: generateId(),
      action: 'UPDATE',
      details: `Área actualizada: ${editForm.name}`,
      timestamp: new Date().toISOString(),
      userId: user.id,
      username: user.username
    });

    setEditingId(null);
    setEditForm({});
    await refreshAreas();
  };

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaForm.name || !newAreaForm.description) {
      alert('Por favor complete el nombre y la descripción.');
      return;
    }

    const newArea: Area = {
      id: generateId(),
      name: newAreaForm.name,
      description: newAreaForm.description,
      image: newAreaForm.image || 'https://picsum.photos/400/300'
    };

    await db.addArea(newArea);
    await db.addLog({
      id: generateId(),
      action: 'CREATE',
      details: `Nueva área creada: ${newArea.name}`,
      timestamp: new Date().toISOString(),
      userId: user.id,
      username: user.username
    });

    setIsAddModalOpen(false);
    setNewAreaForm({ image: 'https://picsum.photos/seed/new/400/300' });
    await refreshAreas();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isNew: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isNew) {
          setNewAreaForm(prev => ({ ...prev, image: reader.result as string }));
        } else {
          setEditForm(prev => ({ ...prev, image: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading && areas.length === 0) {
      return <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Áreas</h2>
          <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">
            {areas.length} Áreas Activas
          </span>
        </div>
        
        {user.role === UserRole.ADMIN && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-md transition-transform transform hover:scale-105"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Área
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {areas.map(area => (
          <div key={area.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col">
            {/* Área de imagen clickeable */}
            <div 
              className={`relative h-48 overflow-hidden group ${!editingId ? 'cursor-pointer' : ''}`}
              onClick={() => {
                if (!editingId) {
                  onNavigate('inventory', { areaId: area.id });
                }
              }}
            >
              <img 
                src={editingId === area.id && editForm.image ? editForm.image : area.image} 
                alt={area.name} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              
              {/* Overlay dinámico */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                {editingId === area.id ? (
                  <label className="flex flex-col items-center justify-center cursor-pointer text-white hover:text-indigo-200 transition-colors p-4 rounded-xl hover:bg-white/10">
                    <Upload className="h-8 w-8 mb-2" />
                    <span className="text-xs font-medium">Cambiar Foto</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, false)} />
                  </label>
                ) : (
                  <div className="flex items-center text-white font-medium bg-white/20 px-4 py-2 rounded-full backdrop-blur-md border border-white/30 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                     <Box className="w-5 h-5 mr-2" />
                     Ver Inventario
                     <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col">
              {editingId === area.id ? (
                <div className="space-y-3 animate-fade-in flex-1">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nombre del área"
                  />
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="Descripción"
                    rows={2}
                  />
                  <div className="flex justify-end space-x-2 mt-2">
                    <button onClick={() => setEditingId(null)} className="p-2 text-red-500 hover:bg-red-50 rounded-full">
                      <X className="h-5 w-5" />
                    </button>
                    <button onClick={handleSaveEdit} className="p-2 text-green-500 hover:bg-green-50 rounded-full">
                      <Save className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-indigo-500" />
                      {area.name}
                    </h3>
                    {user.role === UserRole.ADMIN && (
                      <div className="flex space-x-1">
                        <button 
                          onClick={() => handleEdit(area)}
                          className="p-1 text-gray-400 hover:text-indigo-600 transition-colors rounded hover:bg-indigo-50"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(area.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded hover:bg-red-50"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4 flex-1">
                    {area.description}
                  </p>
                  
                  <button 
                    onClick={() => onNavigate('inventory', { areaId: area.id })}
                    className="w-full mt-auto py-2 px-4 bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center group"
                  >
                    Explorar Objetos
                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nueva Área */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-900 opacity-75 backdrop-blur-sm"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full animate-slide-up">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-5">
                   <h3 className="text-xl font-bold text-gray-900">Registrar Nueva Área</h3>
                   <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <form onSubmit={handleCreateArea} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Área</label>
                    <input 
                      type="text" 
                      required
                      value={newAreaForm.name || ''}
                      onChange={e => setNewAreaForm({...newAreaForm, name: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Ej. Almacén Central"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Imagen de Portada</label>
                    <div className="flex items-center space-x-4 p-3 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                      <img src={newAreaForm.image} alt="Preview" className="h-16 w-16 rounded-lg object-cover shadow-sm" />
                      <label className="cursor-pointer bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-indigo-600 hover:bg-indigo-50 focus:outline-none transition-colors">
                        Subir Foto
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, true)} />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea 
                      required
                      rows={3}
                      value={newAreaForm.description || ''}
                      onChange={e => setNewAreaForm({...newAreaForm, description: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Describe el propósito de esta área..."
                    />
                  </div>

                  <div className="mt-5 sm:mt-6 flex space-x-3">
                    <button 
                      type="button" 
                      onClick={() => setIsAddModalOpen(false)} 
                      className="flex-1 justify-center rounded-xl border border-gray-300 shadow-sm px-4 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 justify-center rounded-xl border border-transparent shadow-sm px-4 py-3 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:text-sm transition-colors shadow-indigo-200"
                    >
                      Crear Área
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};