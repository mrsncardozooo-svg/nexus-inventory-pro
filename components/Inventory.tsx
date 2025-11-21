import React, { useState, useEffect } from 'react';
import { Item, User, UserRole, ItemStatus, Area } from '../types';
import { db, generateId } from '../services/db';
import { 
  Plus, Search, Filter, FileDown, Trash2, Edit, 
  MoreVertical, Image as ImageIcon, Tag, QrCode, X, RefreshCw 
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InventoryProps {
  user: User;
  initialFilters?: {
    areaId?: string;
    status?: string;
  };
}

export const Inventory: React.FC<InventoryProps> = ({ user, initialFilters }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [statusFilter, setStatusFilter] = useState<string>(initialFilters?.status || 'all');
  const [areaFilter, setAreaFilter] = useState<string>(initialFilters?.areaId || 'all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Item>>({
    status: ItemStatus.SERVICE
  });

  useEffect(() => {
    if (initialFilters?.areaId) setAreaFilter(initialFilters.areaId);
    if (initialFilters?.status) setStatusFilter(initialFilters.status);
  }, [initialFilters]);

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    let result = items;

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(i => 
        i.name.toLowerCase().includes(lowerTerm) || 
        i.code.toLowerCase().includes(lowerTerm) ||
        i.category.toLowerCase().includes(lowerTerm)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(i => i.status === statusFilter);
    }

    if (areaFilter !== 'all') {
      result = result.filter(i => i.areaId === areaFilter);
    }

    setFilteredItems(result);
  }, [items, searchTerm, statusFilter, areaFilter]);

  const refreshData = async () => {
    setIsLoading(true);
    const fetchedItems = await db.getItems();
    const fetchedAreas = await db.getAreas();
    setItems(fetchedItems);
    setAreas(fetchedAreas);
    setIsLoading(false);
  };

  const handleOpenModal = (item?: Item) => {
    if (user.role !== UserRole.ADMIN) return;

    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({
        status: ItemStatus.SERVICE,
        image: 'https://picsum.photos/200',
        code: `INV-${Date.now().toString().slice(-6)}`
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user.role !== UserRole.ADMIN) return;

    if (!formData.name || !formData.areaId || !formData.category) {
      alert('Por favor complete los campos requeridos');
      return;
    }

    const itemToSave: Item = {
      id: editingItem ? editingItem.id : generateId(),
      code: formData.code || '',
      name: formData.name || '',
      category: formData.category || '',
      status: formData.status as ItemStatus,
      description: formData.description || '',
      areaId: formData.areaId || '',
      image: formData.image || '',
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.saveItem(itemToSave);
    await db.addLog({
      id: generateId(),
      action: editingItem ? 'UPDATE' : 'CREATE',
      details: `${editingItem ? 'Actualizó' : 'Creó'} item: ${itemToSave.name}`,
      timestamp: new Date().toISOString(),
      userId: user.id,
      username: user.username
    });

    setIsModalOpen(false);
    await refreshData();
  };

  const handleDelete = async (id: string) => {
    if (user.role !== UserRole.ADMIN) return;

    if (window.confirm('¿Está seguro de eliminar este objeto?')) {
      await db.deleteItem(id);
      await db.addLog({
        id: generateId(),
        action: 'DELETE',
        details: `Eliminó item ID: ${id}`,
        timestamp: new Date().toISOString(),
        userId: user.id,
        username: user.username
      });
      await refreshData();
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Inventario - Nexus Pro", 14, 15);
    
    const tableData = filteredItems.map(item => [
      item.code,
      item.name,
      item.category,
      item.status,
      areas.find(a => a.id === item.areaId)?.name || 'N/A'
    ]);

    autoTable(doc, {
      head: [['Código', 'Nombre', 'Categoría', 'Estado', 'Área']],
      body: tableData,
      startY: 20
    });

    doc.save('inventario.pdf');
  };

  const handleExportExcel = () => {
    const headers = ['Codigo,Nombre,Categoria,Estado,Area,Descripcion'];
    const rows = filteredItems.map(item => 
      `${item.code},${item.name},${item.category},${item.status},${areas.find(a => a.id === item.areaId)?.name || 'N/A'},"${item.description}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "inventario_nexus.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetFilters = () => {
    setAreaFilter('all');
    setStatusFilter('all');
    setSearchTerm('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
           <h2 className="text-2xl font-bold text-gray-900 flex items-center">
               Inventario General
               <button onClick={refreshData} className="ml-3 p-1 text-gray-400 hover:text-indigo-600 transition-colors" title="Recargar">
                   <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
               </button>
           </h2>
           {(areaFilter !== 'all' || statusFilter !== 'all') && (
             <p className="text-sm text-indigo-600 mt-1 flex items-center">
               Filtros activos: 
               {areaFilter !== 'all' && <span className="ml-1 font-semibold bg-indigo-50 px-2 rounded text-indigo-700">{areas.find(a => a.id === areaFilter)?.name}</span>}
               {statusFilter !== 'all' && <span className="ml-1 font-semibold bg-indigo-50 px-2 rounded text-indigo-700">{statusFilter}</span>}
               <button onClick={handleResetFilters} className="ml-2 text-gray-400 hover:text-gray-600 underline text-xs">Limpiar</button>
             </p>
           )}
        </div>
        <div className="flex space-x-2">
          <button onClick={handleExportExcel} className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <FileDown className="h-4 w-4 mr-2" /> Excel
          </button>
          <button onClick={handleExportPDF} className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <FileDown className="h-4 w-4 mr-2" /> PDF
          </button>
          {user.role === UserRole.ADMIN && (
            <button 
              onClick={() => handleOpenModal()} 
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-md transition-transform transform hover:scale-105"
            >
              <Plus className="h-4 w-4 mr-2" /> Nuevo Objeto
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="relative col-span-1 md:col-span-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input 
            type="text" 
            placeholder="Buscar por nombre, código o categoría..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <select 
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            {Object.values(ItemStatus).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <select 
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
          >
            <option value="all">Todas las áreas</option>
            {areas.map(area => (
              <option key={area.id} value={area.id}>{area.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Grid/Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Objeto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                {user.role === UserRole.ADMIN && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <img className="h-10 w-10 rounded-lg object-cover" src={item.image} alt="" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="text-xs text-gray-500">{item.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${item.status === ItemStatus.SERVICE ? 'bg-green-100 text-green-800' : 
                          item.status === ItemStatus.MAINTENANCE ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {areas.find(a => a.id === item.areaId)?.name || 'Desconocido'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.category}
                    </td>
                    {user.role === UserRole.ADMIN && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleOpenModal(item)} className="text-indigo-600 hover:text-indigo-900 mr-3 transition-colors">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={user.role === UserRole.ADMIN ? 5 : 4} className="px-6 py-12 text-center text-gray-500">
                    {isLoading ? 'Cargando datos...' : 'No se encontraron objetos con los filtros actuales.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && user.role === UserRole.ADMIN && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full animate-slide-up">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-5">
                   <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    {editingItem ? 'Editar Objeto' : 'Registrar Nuevo Objeto'}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                        <div className="relative">
                          <QrCode className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                          <input 
                            type="text" 
                            value={formData.code}
                            onChange={e => setFormData({...formData, code: e.target.value})}
                            className="pl-9 w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-indigo-500"
                          />
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                        <select 
                          value={formData.status}
                          onChange={e => setFormData({...formData, status: e.target.value as ItemStatus})}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-indigo-500 bg-white"
                        >
                          {Object.values(ItemStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                     </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Objeto</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                      <div className="relative">
                        <Tag className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input 
                          type="text" 
                          required
                          value={formData.category}
                          onChange={e => setFormData({...formData, category: e.target.value})}
                          placeholder="Ej. Electrónica"
                          className="pl-9 w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Área Asignada</label>
                      <select 
                        required
                        value={formData.areaId}
                        onChange={e => setFormData({...formData, areaId: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-indigo-500 bg-white"
                      >
                        <option value="">Seleccionar...</option>
                        {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Imagen</label>
                    <div className="flex items-center space-x-3">
                      <img src={formData.image} alt="Preview" className="h-12 w-12 rounded object-cover border" />
                      <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
                        Subir Foto
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea 
                      rows={3}
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-indigo-500"
                    />
                  </div>

                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse -mx-6 -mb-6 mt-4 rounded-b-2xl">
                    <button 
                      type="submit" 
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Guardar
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)} 
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Cancelar
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