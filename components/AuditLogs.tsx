import React, { useState, useEffect } from 'react';
import { Log } from '../types';
import { db } from '../services/db';
import { History, Search, Filter, Clock, User, Activity, RefreshCw } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<Log[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
      setIsLoading(true);
      const allLogs = await db.getLogs();
      setLogs(allLogs);
      setIsLoading(false);
  };

  useEffect(() => {
    let result = logs;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(log => 
        log.username.toLowerCase().includes(term) || 
        log.details.toLowerCase().includes(term)
      );
    }

    if (actionFilter !== 'all') {
      result = result.filter(log => log.action === actionFilter);
    }

    setFilteredLogs(result);
  }, [logs, searchTerm, actionFilter]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800 border-green-200';
      case 'UPDATE': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DELETE': return 'bg-red-100 text-red-800 border-red-200';
      case 'LOGIN': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'CREATE': return 'Creación';
      case 'UPDATE': return 'Edición';
      case 'DELETE': return 'Eliminación';
      case 'LOGIN': return 'Acceso';
      default: return action;
    }
  };

  const formatDate = (dateString: string) => {
    try {
        return new Date(dateString).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
            <div className="p-3 bg-orange-100 rounded-xl">
                <History className="h-8 w-8 text-orange-600" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Historial de Cambios</h2>
                <p className="text-sm text-gray-500">Registro de auditoría de movimientos en el sistema.</p>
            </div>
        </div>
        <button onClick={fetchLogs} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg hover:text-orange-600 transition-colors">
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="relative col-span-1 md:col-span-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input 
            type="text" 
            placeholder="Buscar por usuario o detalles..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <select 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white appearance-none"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
            >
                <option value="all">Todos los eventos</option>
                <option value="CREATE">Creación</option>
                <option value="UPDATE">Edición</option>
                <option value="DELETE">Eliminación</option>
                <option value="LOGIN">Acceso</option>
            </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center"><Activity className="h-3 w-3 mr-1" /> Acción</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center"><User className="h-3 w-3 mr-1" /> Usuario</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center"><Clock className="h-3 w-3 mr-1" /> Fecha y Hora</div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getActionColor(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{log.username}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {log.details}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {formatDate(log.timestamp)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    {isLoading ? 'Cargando registros...' : 'No hay registros disponibles.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <p className="text-xs text-center text-gray-400 italic">
        * Solo se muestran los últimos 100 eventos del sistema. Las acciones de ElSuperAdmin están ocultas por seguridad.
      </p>
    </div>
  );
};