import React, { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';
import { Inventory } from './components/Inventory';
import { Areas } from './components/Areas';
import { Dashboard } from './components/Dashboard';
import { AuditLogs } from './components/AuditLogs';
import { User } from './types';
import { db, generateId } from './services/db';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  // State to pass parameters between views (e.g., clicking a chart to filter inventory)
  const [viewParams, setViewParams] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
        await db.init();
        const session = db.getSession();
        if (session) {
          // Optional: Verify session user still exists in cloud?
          // For now, trust local session to keep it fast
          setUser(session);
        }
        setLoading(false);
    };
    initApp();
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    db.setSession(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
    db.clearSession();
    setCurrentView('dashboard');
    setViewParams(null);
  };

  const handleUpdateUser = async (updatedUser: User) => {
    setUser(updatedUser);
    await db.updateUser(updatedUser);
    db.setSession(updatedUser); // Update session to persist changes
    
    await db.addLog({
      id: generateId(),
      action: 'UPDATE',
      details: `Usuario actualizó su perfil: ${updatedUser.username}`,
      timestamp: new Date().toISOString(),
      userId: updatedUser.id,
      username: updatedUser.username
    });
  };

  const handleNavigate = (view: string, params?: any) => {
    setViewParams(params || null);
    setCurrentView(view);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Conectando con Nexus Cloud...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'inventory':
        return <Inventory user={user} initialFilters={viewParams} />;
      case 'areas':
        return <Areas user={user} onNavigate={handleNavigate} />;
      case 'logs':
        return <AuditLogs />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout}
      onUpdateUser={handleUpdateUser}
      currentView={currentView}
      setCurrentView={(view) => handleNavigate(view)}
    >
      {renderView()}
    </Layout>
  );
};

export default App;