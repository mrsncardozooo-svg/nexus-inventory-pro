import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole } from '../types';
import { db, generateId } from '../services/db';
import { Eye, EyeOff, Lock, User as UserIcon, LogIn, UserPlus, ArrowRight, RefreshCw, Info, Key, Unlock, Clock, Mail, Send, CheckCircle, X, AlertTriangle, Copy, Check, HelpCircle, ChevronUp, ChevronDown } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: UserRole.USER
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password State
  const [showForgot, setShowForgot] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showConfirmResetPassword, setShowConfirmResetPassword] = useState(false); // Nuevo estado para confirmar pass en reset
  const [resetLoading, setResetLoading] = useState(false);
  
  // Simulation State (Para mostrar el código en pantalla y copiarlo)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Security Question State (Logic for showing the credentials result)
  const [showCredentials, setShowCredentials] = useState(false);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [securityError, setSecurityError] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); // Timer for the credentials result
  
  // Security Question VISIBILITY State (New logic requested)
  const [showSecurityInput, setShowSecurityInput] = useState(false);
  const [securityInputTimeLeft, setSecurityInputTimeLeft] = useState(0);

  const timerIntervalRef = useRef<number | null>(null); // Timer for credentials result
  const securityInputIntervalRef = useRef<number | null>(null); // Timer for input visibility

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
      if (securityInputIntervalRef.current) window.clearInterval(securityInputIntervalRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleResetDB = async () => {
    if (window.confirm('¿Estás seguro? Esto borrará tu sesión local (la base de datos en la nube no se verá afectada por este botón).')) {
      await db.clear();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
        const users = await db.getUsers();
        const user = users.find(u => u.username === formData.username && u.password === formData.password);
        
        if (user) {
          await db.addLog({
            id: generateId(),
            action: 'LOGIN',
            details: `Usuario ${user.username} inició sesión`,
            timestamp: new Date().toISOString(),
            userId: user.id,
            username: user.username
          });
          onLogin(user);
        } else {
          setError('Credenciales inválidas. Verifique usuario y contraseña.');
        }
    } catch (err) {
        setError('Error de conexión. Verifique su internet o configuración.');
    } finally {
        setIsLoading(false);
    }
  };

  const validateRegistration = () => {
    if (formData.username.length < 9) return 'El nombre de usuario debe tener al menos 9 caracteres.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return 'Por favor ingrese un correo electrónico válido.';
    if (formData.password.length < 12) return 'La contraseña debe tener al menos 12 caracteres.';
    const complexityRegex = /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])/;
    if (!complexityRegex.test(formData.password)) return 'La contraseña debe incluir mayúsculas, minúsculas, números y caracteres especiales.';
    return null;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password || !formData.fullName || !formData.email) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    const validationError = validateRegistration();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    try {
        const users = await db.getUsers();
        if (users.find(u => u.username === formData.username)) {
          setError(`El usuario "${formData.username}" ya existe. Intente con otro.`);
          setIsLoading(false);
          return;
        }
        if (users.find(u => u.email && u.email.toLowerCase() === formData.email.toLowerCase())) {
            setError(`El correo "${formData.email}" ya está registrado.`);
            setIsLoading(false);
            return;
        }

        const newUser: User = {
          id: generateId(),
          username: formData.username,
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          role: UserRole.USER,
          createdAt: new Date().toISOString()
        };
        
        await db.addUser(newUser);
        alert('Registro exitoso. Ahora puede iniciar sesión.');
        setIsFlipped(false);
        setFormData({ username: '', email: '', password: '', fullName: '', role: UserRole.USER });
        setError('');
    } catch (err) {
        setError('Error registrando usuario.');
    } finally {
        setIsLoading(false);
    }
  };

  // --- Forgot Password Logic ---
  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    
    try {
        const users = await db.getUsers();
        const user = users.find(u => u.email && u.email.toLowerCase() === resetEmail.toLowerCase());

        if (user) {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            setResetCode(code);
            setGeneratedCode(code); // Guardamos el código para mostrarlo en UI
            setResetStep(2);
        } else {
            alert('No encontramos un usuario con ese correo electrónico.');
        }
    } catch (err) {
        alert('Error de conexión.');
    } finally {
        setResetLoading(false);
    }
  };

  const copyCodeToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputCode !== resetCode) {
        alert('El código ingresado es incorrecto.');
        return;
    }

    if (newPassword !== confirmNewPassword) {
        alert('Las contraseñas no coinciden.');
        return;
    }

    if (newPassword.length < 12) {
        alert('La nueva contraseña debe tener al menos 12 caracteres.');
        return;
    }
    const complexityRegex = /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])/;
    if (!complexityRegex.test(newPassword)) {
        alert('La contraseña debe incluir mayúsculas, minúsculas, números y caracteres especiales.');
        return;
    }

    try {
        const users = await db.getUsers();
        const userToUpdate = users.find(u => u.email && u.email.toLowerCase() === resetEmail.toLowerCase());
        
        if (userToUpdate) {
            const updatedUser = { ...userToUpdate, password: newPassword };
            await db.updateUser(updatedUser);
            alert('¡Contraseña restablecida con éxito! Ahora puedes iniciar sesión.');
            closeForgotModal();
        }
    } catch (err) {
        alert('Error actualizando contraseña.');
    }
  };

  const closeForgotModal = () => {
    setShowForgot(false);
    setResetStep(1);
    setResetEmail('');
    setInputCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setResetCode('');
    setGeneratedCode(null);
    setShowResetPassword(false);
    setShowConfirmResetPassword(false);
  };

  // --- Security Question Logic ---

  // 1. Toggle Visibility of the Input Area
  const handleToggleSecurityInput = () => {
    if (showSecurityInput) {
      // If open, close it
      setShowSecurityInput(false);
      if (securityInputIntervalRef.current) {
        window.clearInterval(securityInputIntervalRef.current);
        securityInputIntervalRef.current = null;
      }
    } else {
      // If closed, open it and start timer
      setShowSecurityInput(true);
      setSecurityInputTimeLeft(40); // 40 seconds as requested
      
      if (securityInputIntervalRef.current) window.clearInterval(securityInputIntervalRef.current);
      
      securityInputIntervalRef.current = window.setInterval(() => {
        setSecurityInputTimeLeft((prev) => {
          if (prev <= 1) {
            setShowSecurityInput(false);
            if (securityInputIntervalRef.current) window.clearInterval(securityInputIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  // 2. Check Answer and Show Credentials
  const handleUnlockCredentials = () => {
    const normalizedInput = securityAnswer.toLowerCase().replace(/\s+/g, '');
    const normalizedTarget = 'elcolornegroydorado'; 

    if (normalizedInput === normalizedTarget) {
      setShowCredentials(true);
      setSecurityError(false);
      
      // Close the input area logic since we are showing the result now
      setShowSecurityInput(false);
      if (securityInputIntervalRef.current) window.clearInterval(securityInputIntervalRef.current);

      setTimeLeft(15); // 15 seconds for the credentials view
      
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }

      timerIntervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setShowCredentials(false);
            setSecurityAnswer(''); 
            if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } else {
      setSecurityError(true);
      setTimeout(() => setSecurityError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 perspective-1000 relative overflow-hidden">
      
      {/* Forgot Password Modal */}
      {showForgot && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4 relative animate-slide-up">
                  <button 
                    onClick={closeForgotModal} 
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                  >
                      <X className="h-6 w-6" />
                  </button>
                  
                  <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 mb-4">
                          <Key className="h-6 w-6" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">Recuperar Contraseña</h2>
                      <p className="text-sm text-gray-500 mt-2">
                          {resetStep === 1 
                            ? 'Ingresa tu correo para recibir un código de verificación.' 
                            : 'Ingresa el código enviado a tu correo y tu nueva contraseña.'}
                      </p>
                  </div>

                  {resetStep === 1 ? (
                      <form onSubmit={handleSendResetCode} className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                <input 
                                    type="email" 
                                    required
                                    className="w-full pl-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="ejemplo@nexus.com"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                />
                              </div>
                          </div>
                          <button 
                            type="submit"
                            disabled={resetLoading}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex justify-center items-center transition-colors disabled:opacity-70"
                          >
                              {resetLoading ? (
                                  <RefreshCw className="h-5 w-5 animate-spin" />
                              ) : (
                                  <>Enviar Código <Send className="h-4 w-4 ml-2" /></>
                              )}
                          </button>
                      </form>
                  ) : (
                      <div className="space-y-4">
                          {/* SIMULACIÓN DE EMAIL */}
                          {generatedCode && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between mb-4 animate-fade-in">
                                <div className="flex items-center space-x-2 overflow-hidden">
                                    <div className="bg-blue-100 p-1.5 rounded-full">
                                        <Mail className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-blue-500 font-bold uppercase">Simulación de Correo</p>
                                        <p className="text-sm text-blue-900 truncate">Tu código es: <span className="font-mono font-bold tracking-wider">{generatedCode}</span></p>
                                    </div>
                                </div>
                                <button 
                                    onClick={copyCodeToClipboard}
                                    className="flex items-center px-2 py-1 bg-white border border-blue-200 rounded text-xs text-blue-600 hover:bg-blue-50 transition-colors"
                                    title="Copiar código"
                                >
                                    {copiedCode ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                                    {copiedCode ? 'Copiado' : 'Copiar'}
                                </button>
                            </div>
                          )}

                          <form onSubmit={handleResetPassword} className="space-y-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Código de Verificación</label>
                                  <input 
                                      type="text" 
                                      required
                                      maxLength={6}
                                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-center tracking-widest text-xl font-mono"
                                      placeholder="000000"
                                      value={inputCode}
                                      onChange={(e) => setInputCode(e.target.value)}
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                                  <div className="relative">
                                    <input 
                                        type={showResetPassword ? "text" : "password"}
                                        required
                                        className="w-full p-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Mín. 12 caracteres"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowResetPassword(!showResetPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600 transition-colors"
                                    >
                                        {showResetPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nueva Contraseña</label>
                                  <div className="relative">
                                    <input 
                                        type={showConfirmResetPassword ? "text" : "password"}
                                        required
                                        className={`w-full p-3 pr-10 border rounded-xl focus:ring-2 outline-none transition-colors ${
                                            confirmNewPassword && newPassword !== confirmNewPassword 
                                            ? 'border-red-300 focus:ring-red-500' 
                                            : 'border-gray-300 focus:ring-indigo-500'
                                        }`}
                                        placeholder="Repite la contraseña"
                                        value={confirmNewPassword}
                                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmResetPassword(!showConfirmResetPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600 transition-colors"
                                    >
                                        {showConfirmResetPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                  </div>
                                  {confirmNewPassword && newPassword !== confirmNewPassword && (
                                      <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden.</p>
                                  )}
                              </div>
                              <button 
                                type="submit"
                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold flex justify-center items-center transition-colors"
                              >
                                  Cambiar Contraseña <CheckCircle className="h-4 w-4 ml-2" />
                              </button>
                          </form>
                      </div>
                  )}
              </div>
          </div>
      )}

      <div className={`relative w-full max-w-md h-[800px] transition-all duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
        
        {/* FRONT: Login Form */}
        <div className="absolute inset-0 backface-hidden">
          <div className="h-full bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 flex flex-col p-8">
            <div className="text-center mb-6 mt-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 mb-4 shadow-lg shadow-blue-500/50">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Nexus</h1>
              <p className="text-blue-200 text-sm mt-2">Acceso Global (Cloud)</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6 flex-1">
              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-blue-200 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    name="username"
                    placeholder="Usuario"
                    value={formData.username}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-4 bg-black/20 border border-blue-500/30 rounded-xl text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  />
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-blue-200 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Contraseña"
                    value={formData.password}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-12 py-4 bg-black/20 border border-blue-500/30 rounded-xl text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-blue-200 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                <div className="flex justify-end">
                    <button 
                        type="button"
                        onClick={() => setShowForgot(true)}
                        className="text-xs text-blue-300 hover:text-white hover:underline transition-colors"
                    >
                        ¿Olvidaste tu contraseña?
                    </button>
                </div>
              </div>

              {error && !isFlipped && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-100 text-sm text-center animate-fade-in">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <><LogIn className="h-5 w-5 mr-2" /> Iniciar Sesión</>}
              </button>
            </form>

            {/* Security Question Section */}
            <div className="mt-4 text-center relative">
              {!showCredentials ? (
                <>
                  {/* Button to Toggle Question Visibility */}
                  <button
                    onClick={handleToggleSecurityInput}
                    className="flex items-center justify-center mx-auto space-x-2 text-xs text-blue-300 hover:text-white transition-colors mb-2 py-2"
                  >
                    {showSecurityInput ? (
                      <><ChevronUp className="h-3 w-3" /> <span>Ocultar Pregunta de Seguridad</span></>
                    ) : (
                      <><HelpCircle className="h-3 w-3" /> <span>Recuperar Credenciales Admin</span></>
                    )}
                  </button>

                  {/* Conditional Rendering of the Input Area */}
                  {showSecurityInput && (
                    <div className="bg-black/20 border border-blue-500/10 rounded-xl p-4 mb-4 backdrop-blur-sm animate-fade-in relative overflow-hidden">
                       {/* Timer Bar */}
                       <div className="absolute top-0 left-0 h-0.5 bg-blue-500 transition-all duration-1000 ease-linear" style={{ width: `${(securityInputTimeLeft / 40) * 100}%` }}></div>
                       
                       <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Key className="h-4 w-4 text-yellow-400" />
                            <span className="text-xs text-blue-100 font-semibold uppercase tracking-wide">Pregunta de Seguridad</span>
                          </div>
                          <span className="text-[10px] text-blue-300 font-mono">{securityInputTimeLeft}s</span>
                       </div>
                       
                       <p className="text-xs text-blue-200 mb-3 italic text-left">
                         "¿Cuál es el color favorito de ElSuperAdmin?"
                       </p>
                       <div className="flex space-x-2">
                         <input 
                            type="text" 
                            value={securityAnswer}
                            onChange={(e) => setSecurityAnswer(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUnlockCredentials()}
                            className={`flex-1 bg-black/30 border ${securityError ? 'border-red-500 ring-1 ring-red-500' : 'border-blue-500/30'} rounded-lg px-3 py-2 text-xs text-white placeholder-blue-200/30 focus:outline-none transition-all`}
                            placeholder="Respuesta..."
                         />
                         <button 
                            type="button"
                            onClick={handleUnlockCredentials}
                            className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-2 transition-colors"
                         >
                            <Unlock className="h-4 w-4" />
                         </button>
                       </div>
                       {securityError && <p className="text-[10px] text-red-300 mt-1 animate-pulse text-left">Respuesta incorrecta</p>}
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-blue-900/30 border border-blue-500/20 rounded-lg p-3 mb-4 animate-fade-in relative overflow-hidden">
                   <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="flex items-center space-x-2">
                        <Info className="h-4 w-4 text-blue-300" />
                        <span className="text-xs text-blue-200 font-bold">Credenciales</span>
                      </div>
                      <div className="flex items-center space-x-1 text-yellow-400 text-[10px]">
                         <Clock className="h-3 w-3 animate-spin" />
                         <span className="font-mono font-bold">{timeLeft}s</span>
                      </div>
                   </div>
                   <div className="text-xs text-blue-200">
                     User: <strong className="text-white select-all">ElSuperAdmin</strong> <br/>
                     Pass: <strong className="text-white select-all">Superadmin-123</strong>
                   </div>
                   <div 
                     className="absolute bottom-0 left-0 h-1 bg-yellow-400 transition-all duration-1000 ease-linear"
                     style={{ width: `${(timeLeft / 15) * 100}%` }}
                   ></div>
                </div>
              )}

              <p className="text-blue-200 text-sm mt-2">¿No tienes cuenta?</p>
              <button 
                onClick={() => { setIsFlipped(true); setError(''); }}
                className="mt-2 text-white font-medium hover:text-blue-300 transition-colors border-b border-transparent hover:border-blue-300"
              >
                Registrarse ahora
              </button>
            </div>
          </div>
        </div>

        {/* BACK: Register Form */}
        <div className="absolute inset-0 backface-hidden rotate-y-180" style={{ transform: 'rotateY(180deg)' }}>
          <div className="h-full bg-gradient-to-b from-indigo-900/90 to-purple-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 flex flex-col p-8">
            <div className="text-center mb-6 mt-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500 mb-4 shadow-lg shadow-purple-500/50">
                <UserPlus className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Nueva Cuenta</h2>
              <p className="text-purple-200 text-xs mt-1">
                Requisitos: Usuario 9+ caracteres. Pass 12+ (A, a, 1, #)
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-5 flex-1">
              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-purple-200 group-focus-within:text-purple-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    name="fullName"
                    placeholder="Nombre Completo"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 bg-black/20 border border-purple-500/30 rounded-xl text-white placeholder-purple-200/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                  />
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-purple-200 group-focus-within:text-purple-400 transition-colors" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    placeholder="Correo Electrónico"
                    value={formData.email}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 bg-black/20 border border-purple-500/30 rounded-xl text-white placeholder-purple-200/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                  />
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-purple-200 group-focus-within:text-purple-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    name="username"
                    placeholder="Usuario (Min. 9 car.)"
                    value={formData.username}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 bg-black/20 border border-purple-500/30 rounded-xl text-white placeholder-purple-200/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                  />
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-purple-200 group-focus-within:text-purple-400 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Contraseña (Min. 12 car.)"
                    value={formData.password}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-12 py-3 bg-black/20 border border-purple-500/30 rounded-xl text-white placeholder-purple-200/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-purple-200 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && isFlipped && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-100 text-sm flex items-start space-x-2 animate-fade-in">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/30 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center disabled:opacity-70"
              >
                {isLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <><ArrowRight className="h-5 w-5 mr-2" /> Completar Registro</>}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button 
                onClick={() => { setIsFlipped(false); setError(''); }}
                className="text-purple-200 hover:text-white text-sm font-medium transition-colors"
              >
                ← Volver al inicio de sesión
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Utility button for demo purposes */}
      <button 
        onClick={handleResetDB}
        className="fixed bottom-4 right-4 p-2 text-white/20 hover:text-white/80 transition-colors"
        title="Reiniciar Sesión Local"
      >
        <RefreshCw className="h-5 w-5" />
      </button>
    </div>
  );
};