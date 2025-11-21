import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { User, Item, Area, Log, UserRole, ItemStatus } from '../types';

// Configuración de Firebase proporcionada por el usuario
const firebaseConfig = {
  apiKey: "AIzaSyDr9Oh82-wNvRJ7kt9VtW6-R4DwMvRQKqs",
  authDomain: "nexus-inventory-8f577.firebaseapp.com",
  projectId: "nexus-inventory-8f577",
  storageBucket: "nexus-inventory-8f577.firebasestorage.app",
  messagingSenderId: "492718794862",
  appId: "1:492718794862:web:d16af7ec6a9338fc6b5e7f",
  measurementId: "G-JCGC78S9GJ"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

const COLLECTIONS = {
  USERS: 'users',
  ITEMS: 'items',
  AREAS: 'areas',
  LOGS: 'logs'
};

// Utilidad para generar IDs (mantenemos compatibilidad con lógica frontend)
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try { return crypto.randomUUID(); } catch (e) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const db = {
  init: async () => {
    try {
      console.log("Conectando a Firebase Nexus Cloud...");
      
      // 1. Verificar si existe el SuperAdmin
      const usersRef = collection(firestore, COLLECTIONS.USERS);
      const q = query(usersRef, where("username", "==", "ElSuperAdmin"));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log("Creando SuperAdmin por primera vez...");
        const superAdmin: User = {
            id: 'super-admin-001',
            username: 'ElSuperAdmin',
            email: 'admin@nexus.com',
            password: 'Superadmin-123',
            fullName: 'Administrador General',
            role: UserRole.ADMIN,
            createdAt: new Date().toISOString()
        };
        await setDoc(doc(firestore, COLLECTIONS.USERS, superAdmin.id), superAdmin);
      }

      // 2. Verificar si existen áreas por defecto
      const areasSnap = await getDocs(collection(firestore, COLLECTIONS.AREAS));
      if (areasSnap.empty) {
        console.log("Inicializando áreas por defecto...");
        const defaultAreas: Area[] = Array.from({ length: 6 }).map((_, i) => ({
            id: `area-${i + 1}`,
            name: `Área ${i + 1}`,
            description: 'Espacio designado para operaciones.',
            image: `https://picsum.photos/seed/area${i}/400/300`
        }));
        
        await Promise.all(defaultAreas.map(area => 
            setDoc(doc(firestore, COLLECTIONS.AREAS, area.id), area)
        ));
      }
      
    } catch (e) {
      console.error("Error inicializando DB en Firebase:", e);
    }
  },
  
  // --- USERS ---
  getUsers: async (): Promise<User[]> => {
    const snap = await getDocs(collection(firestore, COLLECTIONS.USERS));
    return snap.docs.map(d => d.data() as User);
  },
  
  addUser: async (user: User) => {
    await setDoc(doc(firestore, COLLECTIONS.USERS, user.id), user);
  },
  
  updateUser: async (updatedUser: User) => {
    await updateDoc(doc(firestore, COLLECTIONS.USERS, updatedUser.id), { ...updatedUser });
  },
  
  deleteUser: async (id: string) => {
    await deleteDoc(doc(firestore, COLLECTIONS.USERS, id));
  },

  // --- AREAS ---
  getAreas: async (): Promise<Area[]> => {
    const snap = await getDocs(collection(firestore, COLLECTIONS.AREAS));
    return snap.docs.map(d => d.data() as Area);
  },
  
  addArea: async (area: Area) => {
    await setDoc(doc(firestore, COLLECTIONS.AREAS, area.id), area);
  },

  updateArea: async (area: Area) => {
    await updateDoc(doc(firestore, COLLECTIONS.AREAS, area.id), { ...area });
  },

  deleteArea: async (id: string) => {
    await deleteDoc(doc(firestore, COLLECTIONS.AREAS, id));
  },
  
  // --- ITEMS ---
  getItems: async (): Promise<Item[]> => {
    const snap = await getDocs(collection(firestore, COLLECTIONS.ITEMS));
    return snap.docs.map(d => d.data() as Item);
  },
  
  saveItem: async (item: Item) => {
    // setDoc con el ID específico actúa como "upsert" (crear o reemplazar)
    await setDoc(doc(firestore, COLLECTIONS.ITEMS, item.id), item);
  },
  
  deleteItem: async (id: string) => {
    await deleteDoc(doc(firestore, COLLECTIONS.ITEMS, id));
  },

  // --- LOGS ---
  addLog: async (log: Log) => {
    if (log.username === 'ElSuperAdmin') {
      // Opcional: no saturar logs con acciones del admin si se desea, 
      // pero en cloud es mejor tener todo registrado.
    }
    await setDoc(doc(firestore, COLLECTIONS.LOGS, log.id), log);
  },

  getLogs: async (): Promise<Log[]> => {
    try {
        // Intentamos ordenar por fecha descendente
        // Nota: Firestore puede pedir crear un índice compuesto en la consola para esto.
        // Si falla, el catch hará un ordenamiento manual en el cliente.
        const q = query(collection(firestore, COLLECTIONS.LOGS), orderBy('timestamp', 'desc'), limit(100));
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data() as Log);
    } catch (e) {
        console.warn("Aviso: Ordenando logs en cliente (posible falta de índice en Firebase).", e);
        const snap = await getDocs(collection(firestore, COLLECTIONS.LOGS));
        const data = snap.docs.map(d => d.data() as Log);
        return data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 100);
    }
  },

  // --- SESSION (Local Only) ---
  // Mantenemos la sesión en localStorage para no re-autenticar al recargar la página,
  // ya que estamos usando un sistema de auth personalizado sobre Firestore.
  setSession: (user: User) => localStorage.setItem('nexus_session', JSON.stringify(user)),
  getSession: (): User | null => {
    const s = localStorage.getItem('nexus_session');
    return s ? JSON.parse(s) : null;
  },
  clearSession: () => localStorage.removeItem('nexus_session'),

  // Clear (Solo local para logout forzado, no borra la BD en la nube)
  clear: async () => {
    localStorage.removeItem('nexus_session');
    window.location.reload();
  }
};