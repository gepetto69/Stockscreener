export interface User {
  id: number;
  email: string;
  name: string;
  created_at?: string;
}

export interface AuthResponse {
  status: 'success' | 'error';
  token?: string;
  user?: User;
  message?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}
