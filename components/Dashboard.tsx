import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { Item, ItemStatus } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

interface DashboardProps {
  onNavigate: (view: string, params?: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<{
    total: number;
    service: number;
    maintenance: number;
    outOfService: number;
    byArea: { id: string; name: string; count: number }[];
  }>({ total: 0, service: 0, maintenance: 0, outOfService: 0, byArea: [] });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        const items = await db.getItems();
        const areas = await db.getAreas();
        
        const byArea = areas.map(area => ({
          id: area.id,
          name: area.name,
          count: items.filter(i => i.areaId === area.id).length
        }));

        setStats({
          total: items.length,
          service: items.filter(i => i.status === ItemStatus.SERVICE).length,
          maintenance: items.filter(i => i.status === ItemStatus.MAINTENANCE).length,
          outOfService: items.filter(i => i.status === ItemStatus.OUT_OF_SERVICE).length,
          byArea
        });
        setLoading(false);
    };

    fetchData();
  }, []);

  const pieData = [
    { name: 'En Servicio', value: stats.service, color: '#10B981', status: ItemStatus.SERVICE },
    { name: 'Mantenimiento', value: stats.maintenance, color: '#F59E0B', status: ItemStatus.MAINTENANCE },
    { name: 'Fuera de Servicio', value: stats.outOfService, color: '#EF4444', status: ItemStatus.OUT_OF_SERVICE },
  ];

  if (loading) {
      return (
          <div className="flex h-full items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-900">Panel de Control</h2>
      
      {/* Stats Cards - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => onNavigate('inventory')}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 hover:shadow-md transition-all cursor-pointer hover:-translate-y-1 group"
        >
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500">Total Objetos</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.total}</h3>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div 
          onClick={() => onNavigate('inventory', { status: ItemStatus.SERVICE })}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 hover:shadow-md transition-all cursor-pointer hover:-translate-y-1 group"
        >
          <div className="p-3 bg-green-100 text-green-600 rounded-xl group-hover:bg-green-600 group-hover:text-white transition-colors">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500">En Servicio</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.service}</h3>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div 
          onClick={() => onNavigate('inventory', { status: ItemStatus.MAINTENANCE })}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 hover:shadow-md transition-all cursor-pointer hover:-translate-y-1 group"
        >
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl group-hover:bg-yellow-600 group-hover:text-white transition-colors">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500">Mantenimiento</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.maintenance}</h3>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div 
          onClick={() => onNavigate('inventory', { status: ItemStatus.OUT_OF_SERVICE })}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 hover:shadow-md transition-all cursor-pointer hover:-translate-y-1 group"
        >
          <div className="p-3 bg-red-100 text-red-600 rounded-xl group-hover:bg-red-600 group-hover:text-white transition-colors">
            <XCircle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500">Fuera de Servicio</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.outOfService}</h3>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribución por Estado</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  cursor="pointer"
                  onClick={(data) => onNavigate('inventory', { status: data.payload.status })}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">Haz clic en el gráfico para filtrar el inventario</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Objetos por Área</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byArea}>
                <XAxis dataKey="name" fontSize={12} tickMargin={10} />
                <YAxis />
                <Tooltip cursor={{ fill: '#F3F4F6' }} />
                <Bar 
                  dataKey="count" 
                  fill="#4F46E5" 
                  radius={[4, 4, 0, 0]} 
                  cursor="pointer"
                  onClick={(data) => onNavigate('inventory', { areaId: data.id })}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">Haz clic en una barra para ver objetos de esa área</p>
        </div>
      </div>
    </div>
  );
};