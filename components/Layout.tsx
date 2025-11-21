import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { db, generateId } from '../services/db';
import { 
  Menu, X, LayoutDashboard, Box, Map, BarChart3, 
  LogOut, User as UserIcon, Shield, Eye, EyeOff, Save, Users, Trash2, Edit2, RefreshCw, UserPlus, Mail, History
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => Promise<void>; // Async
  currentView: string;
  setCurrentView: (view: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, onUpdateUser, currentView, setCurrentView }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // Profile/User Management State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Nuevo estado para confirmar pass
  
  const [targetUser, setTargetUser] = useState<User>(user); 
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
    fullName: '',
    role: UserRole.USER,
    password: '',
    confirmPassword: ''
  });
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const isSuperAdmin = user.username === 'ElSuperAdmin';

  useEffect(() => {
    if (isProfileModalOpen) {
      if (!isCreating && targetUser.id === user.id) {
        handleSelectUserToEdit(user);
      }
      if (isSuperAdmin) {
        refreshUserList();
      }
    }
  }, [isProfileModalOpen, isSuperAdmin, user.id]); 

  const refreshUserList = async () => {
    if (isSuperAdmin) {
      setIsLoading(true);
      const users = await db.getUsers();
      setAllUsers(users);
      setIsLoading(false);
    }
  };

  const handleSelectUserToEdit = (selectedUser: User) => {
    setIsCreating(false);
    setTargetUser(selectedUser);
    setProfileForm({
      username: selectedUser.username,
      email: selectedUser.email || '',
      fullName: selectedUser.fullName,
      role: selectedUser.role,
      password: '', 
      confirmPassword: ''
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleCreateNewUserMode = () => {
    if (!isSuperAdmin) return;

    setIsCreating(true);
    const dummyUser: User = {
        id: 'new', 
        username: '', 
        email: '',
        fullName: '', 
        role: UserRole.USER, 
        createdAt: ''
    };
    setTargetUser(dummyUser);
    setProfileForm({
      username: '',
      email: '',
      fullName: '',
      role: UserRole.USER,
      password: '',
      confirmPassword: ''
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleDeleteUser = async (id: string) => {
    if (!isSuperAdmin) return;

    if (id === user.id) {
      alert("No puedes eliminar tu propia cuenta desde aquí.");
      return;
    }
    if (window.confirm("¿Estás seguro de eliminar este usuario permanentemente?")) {
      setIsLoading(true);
      await db.deleteUser(id);
      await db.addLog({
        id: generateId(),
        action: 'DELETE',
        details: `Usuario eliminado ID: ${id}`,
        timestamp: new Date().toISOString(),
        userId: user.id,
        username: user.username
      });
      await refreshUserList();
      setIsLoading(false);
      
      if (targetUser.id === id) {
        handleSelectUserToEdit(user);
      }
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Estadísticas', icon: BarChart3 },
    { id: 'inventory', label: 'Inventario', icon: Box },
    { id: 'areas', label: 'Áreas', icon: Map },
    { id: 'logs', label: 'Historial', icon: History },
  ];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
        // Validaciones generales
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(profileForm.email)) {
            alert('Correo electrónico inválido.');
            setIsLoading(false);
            return;
        }

        // Validaciones de contraseña SI se está escribiendo una nueva
        if (isCreating && !profileForm.password) {
            alert('La contraseña es obligatoria para nuevos usuarios.');
            setIsLoading(false);
            return;
        }

        if (profileForm.password) {
            if (profileForm.password !== profileForm.confirmPassword) {
                alert('Las contraseñas no coinciden');
                setIsLoading(false);
                return;
            }
            if (profileForm.password.length < 12) {
                alert('La contraseña debe tener al menos 12 caracteres.');
                setIsLoading(false);
                return;
            }
            const complexityRegex = /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])/;
            if (!complexityRegex.test(profileForm.password)) {
                alert('La contraseña debe incluir mayúsculas, minúsculas, números y caracteres especiales.');
                setIsLoading(false);
                return;
            }
        }

        // Verificar duplicados (Username y Email)
        // Obtenemos la lista actualizada para validar
        const currentUsers = await db.getUsers();
        
        // Validar username duplicado (excluyendo al usuario actual si se está editando)
        const usernameExists = currentUsers.some(u => 
            u.username.toLowerCase() === profileForm.username.toLowerCase() && 
            (isCreating || u.id !== targetUser.id)
        );
        
        if (usernameExists) {
            alert(`El nombre de usuario "${profileForm.username}" ya está en uso.`);
            setIsLoading(false);
            return;
        }

        // Validar email duplicado
        const emailExists = currentUsers.some(u => 
            u.email && u.email.toLowerCase() === profileForm.email.toLowerCase() && 
            (isCreating || u.id !== targetUser.id)
        );

        if (emailExists) {
            alert(`El correo "${profileForm.email}" ya está registrado en otra cuenta.`);
            setIsLoading(false);
            return;
        }

        // --- PROCESO DE CREACIÓN ---
        if (isCreating) {
            if (!isSuperAdmin) return;

            if (!profileForm.username || profileForm.username.length < 4) {
                alert('El nombre de usuario es muy corto.');
                setIsLoading(false);
                return;
            }

            const newUser: User = {
                id: generateId(),
                username: profileForm.username,
                email: profileForm.email,
                fullName: profileForm.fullName,
                role: profileForm.role,
                password: profileForm.password,
                createdAt: new Date().toISOString()
            };

            await db.addUser(newUser);
            await db.addLog({
                id: generateId(),
                action: 'CREATE',
                details: `Admin ${user.username} creó al usuario ${newUser.username}`,
                timestamp: new Date().toISOString(),
                userId: user.id,
                username: user.username
            });
            
            alert(`Usuario ${newUser.username} creado correctamente.`);
            await refreshUserList();
            setIsCreating(false);
            handleSelectUserToEdit(user); 
            setIsLoading(false);
            return;
        }

        // --- PROCESO DE ACTUALIZACIÓN ---
        const updatedUser: User = {
          ...targetUser,
          username: profileForm.username, // Permitimos actualizar username
          fullName: profileForm.fullName,
          email: profileForm.email,
          role: isSuperAdmin ? profileForm.role : targetUser.role,
          // Si hay password en el form, la usamos. Si no, mantenemos la vieja.
          password: profileForm.password ? profileForm.password : targetUser.password
        };

        if (targetUser.id === user.id) {
            await onUpdateUser(updatedUser);
            alert('Tu perfil ha sido actualizado.');
        } else {
            if (!isSuperAdmin) return;
            await db.updateUser(updatedUser);
            await db.addLog({
                id: generateId(),
                action: 'UPDATE',
                details: `Admin ${user.username} actualizó al usuario ${updatedUser.username}`,
                timestamp: new Date().toISOString(),
                userId: user.id,
                username: user.username
            });
            alert(`Usuario ${updatedUser.username} actualizado correctamente.`);
            await refreshUserList();
        }
    } catch (e) {
        console.error(e);
        alert("Ocurrió un error guardando los datos.");
    } finally {
        setIsLoading(false);
    }
  };

  // Helper para saber si los campos deben estar habilitados
  // LÓGICA: Habilitado si estoy creando, soy SuperAdmin, O si soy yo mismo editando mi perfil.
  const canEdit = isCreating || isSuperAdmin || targetUser.id === user.id;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 shadow-lg transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <LayoutDashboard className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-800">Nexus</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-500">
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    currentView === item.id
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm font-medium'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50 rounded-xl">
              <div className="bg-gray-200 p-2 rounded-full">
                <UserIcon className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.fullName}</p>
                <p className="text-xs text-gray-500 truncate flex items-center">
                  {user.role === UserRole.ADMIN && <Shield className="h-3 w-3 mr-1 text-indigo-500" />}
                  {user.role === UserRole.ADMIN ? 'Administrador' : 'Usuario'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
        <header className="bg-white shadow-sm border-b border-gray-200 z-30">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-md"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex-1 flex justify-end items-center space-x-4">
               {/* Simple Menu */}
               <div className="relative">
                 <button 
                   onClick={() => setShowProfileMenu(!showProfileMenu)}
                   className="p-2 rounded-full hover:bg-gray-100 focus:outline-none transition-colors"
                 >
                   <Menu className="h-6 w-6 text-gray-600 transform rotate-90" />
                 </button>

                 {showProfileMenu && (
                   <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg py-2 ring-1 ring-black ring-opacity-5 focus:outline-none animate-fade-in z-50 origin-top-right">
                     <div className="px-4 py-3 border-b border-gray-100">
                       <p className="text-xs text-gray-500 uppercase font-semibold">Sesión activa</p>
                       <p className="text-sm font-medium text-gray-900 truncate mt-1">{user.username}</p>
                     </div>
                     <button
                       onClick={() => {
                         setIsProfileModalOpen(true);
                         setShowProfileMenu(false);
                       }}
                       className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center transition-colors"
                     >
                       <UserIcon className="h-4 w-4 mr-2" /> Gestión de Cuenta
                     </button>
                     <button
                       onClick={onLogout}
                       className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                     >
                       <LogOut className="h-4 w-4 mr-2" /> Cerrar Sesión
                     </button>
                   </div>
                 )}
               </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
             {children}
          </div>
        </main>
      </div>

      {/* User Management Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-900 opacity-75 backdrop-blur-sm"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className={`inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${isSuperAdmin ? 'sm:max-w-4xl' : 'sm:max-w-md'} w-full animate-slide-up`}>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-5 border-b pb-2">
                   <div className="flex items-center">
                     <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                        <UserIcon className="h-6 w-6 text-indigo-600" />
                     </div>
                     <div>
                        <h3 className="text-xl font-bold text-gray-900">Gestión de Usuarios</h3>
                        <p className="text-xs text-gray-500">
                            {isSuperAdmin 
                                ? 'Administración centralizada de personal.' 
                                : 'Actualiza tu información personal.'}
                        </p>
                     </div>
                   </div>
                   <button onClick={() => setIsProfileModalOpen(false)} className="text-gray-400 hover:text-gray-500 transition-colors p-2 hover:bg-gray-100 rounded-full">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className={`grid ${isSuperAdmin ? 'grid-cols-1 lg:grid-cols-5 gap-8' : 'grid-cols-1'}`}>
                  
                  {/* Form */}
                  <div className={`${isSuperAdmin ? 'lg:col-span-2' : ''} space-y-5`}>
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                            {isCreating ? 'Creando Nuevo Usuario' : (isSuperAdmin && targetUser.id !== user.id ? `Editando: ${targetUser.username}` : 'Mi Perfil')}
                        </h4>
                        {isSuperAdmin && (targetUser.id !== user.id || isCreating) && (
                            <button 
                                onClick={() => handleSelectUserToEdit(user)}
                                className="text-xs text-gray-500 underline hover:text-indigo-600"
                            >
                                Cancelar / Volver a mí
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleSaveProfile} className="space-y-5">
                      {/* Username */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Usuario (Login)</label>
                        <input 
                          type="text" 
                          required
                          value={profileForm.username}
                          onChange={e => setProfileForm({...profileForm, username: e.target.value})}
                          // Habilitado si: Creando nuevo, soy SuperAdmin, o me edito a mí mismo
                          disabled={!canEdit}
                          className={`w-full border rounded-lg p-3 text-sm outline-none transition-shadow ${
                              canEdit
                                ? 'border-gray-300 focus:ring-2 focus:ring-indigo-500 bg-white' 
                                : 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'
                          }`}
                          placeholder={isCreating ? "Ej. usuario123" : ""}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                        <input 
                          type="text" 
                          required
                          value={profileForm.fullName}
                          onChange={e => setProfileForm({...profileForm, fullName: e.target.value})}
                          disabled={!canEdit}
                          className={`w-full border rounded-lg p-3 text-sm outline-none transition-shadow ${
                              canEdit
                                ? 'border-gray-300 focus:ring-2 focus:ring-indigo-500 bg-white' 
                                : 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <input 
                            type="email" 
                            required
                            value={profileForm.email}
                            onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                            disabled={!canEdit}
                            className={`w-full pl-10 p-3 border rounded-lg text-sm outline-none transition-shadow ${
                                canEdit
                                  ? 'border-gray-300 focus:ring-2 focus:ring-indigo-500 bg-white' 
                                  : 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'
                            }`}
                            placeholder="usuario@ejemplo.com"
                            />
                        </div>
                      </div>

                      {/* Role Selector - ADMIN ONLY */}
                      {isSuperAdmin && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rol de Usuario</label>
                            <select
                                value={profileForm.role}
                                onChange={e => setProfileForm({...profileForm, role: e.target.value as UserRole})}
                                disabled={targetUser.id === user.id && !isCreating} 
                                className={`w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white ${targetUser.id === user.id && !isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <option value={UserRole.USER}>Usuario (Limitado)</option>
                                <option value={UserRole.ADMIN}>Administrador (Control Total)</option>
                            </select>
                          </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {isCreating ? 'Contraseña' : 'Nueva Contraseña'} <span className="text-gray-400 font-normal">{!isCreating && '(Dejar en blanco para mantener actual)'}</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={profileForm.password}
                            onChange={e => setProfileForm({...profileForm, password: e.target.value})}
                            required={isCreating}
                            className="w-full border border-gray-300 rounded-lg p-3 pr-10 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow bg-white"
                            placeholder={isCreating ? "Requerido" : "Cambiar contraseña..."}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600 transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>

                      {profileForm.password && (
                        <div className="animate-fade-in">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                          <div className="relative">
                              <input
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                value={profileForm.confirmPassword}
                                onChange={e => setProfileForm({...profileForm, confirmPassword: e.target.value})}
                                className={`w-full border rounded-lg p-3 pr-10 text-sm focus:ring-2 outline-none transition-shadow bg-white ${
                                  profileForm.confirmPassword && profileForm.password !== profileForm.confirmPassword 
                                  ? 'border-red-300 focus:ring-red-500' 
                                  : 'border-gray-300 focus:ring-indigo-500'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600 transition-colors"
                              >
                                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                              </button>
                          </div>
                        </div>
                      )}

                      <button 
                        type="submit" 
                        disabled={isLoading}
                        className={`w-full justify-center items-center rounded-xl border border-transparent shadow-sm px-4 py-3 text-base font-medium text-white focus:outline-none sm:text-sm transition-colors flex disabled:opacity-50 ${
                            isCreating 
                            ? 'bg-green-600 hover:bg-green-700 shadow-green-200' 
                            : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                        }`}
                      >
                        {isLoading ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                {isCreating 
                                    ? 'Crear Nuevo Usuario' 
                                    : (targetUser.id === user.id ? 'Guardar Mi Perfil' : 'Guardar Cambios')}
                            </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Right Column: All Users List */}
                  {isSuperAdmin && (
                    <div className="lg:col-span-3 space-y-4 border-t lg:border-t-0 lg:border-l pt-6 lg:pt-0 lg:pl-8 border-gray-200 flex flex-col h-full">
                      <div className="flex items-center justify-between shrink-0">
                         <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center">
                           <Users className="h-4 w-4 mr-2" />
                           Directorio de Usuarios
                         </h4>
                         <div className="flex space-x-2">
                             <button 
                                onClick={handleCreateNewUserMode}
                                className="flex items-center px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors shadow-sm"
                             >
                                 <UserPlus className="h-3 w-3 mr-1" />
                                 Nuevo Usuario
                             </button>
                             <button onClick={refreshUserList} className="text-gray-400 hover:text-indigo-600 p-1 rounded hover:bg-gray-100 transition-colors">
                                 <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                             </button>
                         </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden flex-1 min-h-[300px] flex flex-col">
                        <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-2">
                            {allUsers.map((u) => (
                                <div 
                                    key={u.id} 
                                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                        targetUser.id === u.id && !isCreating
                                            ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-200' 
                                            : 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-sm'
                                    }`}
                                >
                                    <div className="flex-1 min-w-0 mr-2">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm font-semibold text-gray-900 truncate">{u.username}</span>
                                            <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                                                u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                {u.role}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{u.fullName}</p>
                                        <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                                    </div>

                                    <div className="flex items-center space-x-1">
                                        <button 
                                            onClick={() => handleSelectUserToEdit(u)}
                                            className={`p-1.5 rounded-md transition-colors ${
                                                targetUser.id === u.id && !isCreating ? 'bg-indigo-200 text-indigo-800' : 'hover:bg-gray-100 text-gray-400 hover:text-indigo-600'
                                            }`}
                                            title="Editar"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        
                                        {u.id !== user.id ? (
                                            <button 
                                                onClick={() => handleDeleteUser(u.id)}
                                                className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-md transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        ) : (
                                            <div className="w-7"></div> 
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};