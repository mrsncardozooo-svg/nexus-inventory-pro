export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export enum ItemStatus {
  SERVICE = 'En Servicio',
  MAINTENANCE = 'Mantenimiento',
  OUT_OF_SERVICE = 'Fuera de Servicio'
}

export interface User {
  id: string;
  username: string;
  email: string; // New field for password recovery
  password?: string; // Only used during auth check, usually hashed in real backend
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export interface Area {
  id: string;
  name: string;
  description: string;
  image: string;
}

export interface Item {
  id: string;
  code: string;
  name: string;
  category: string;
  status: ItemStatus;
  description: string;
  areaId: string;
  image: string;
  createdAt: string;
  updatedAt: string;
}

export interface Log {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN';
  details: string;
  timestamp: string;
  userId: string;
  username: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}