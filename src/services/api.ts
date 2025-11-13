// 🔐 Service untuk komunikasi dengan backend API - Enhanced Security

import type { Event, AuthResponse, RegisterData, LoginData } from '../types';

// Auto-detect environment: use relative path for Vercel, localhost for development
const API_BASE_URL = import.meta.env.PROD 
  ? '/api'  // Production: use Vercel serverless functions
  : 'http://localhost:5000/api';  // Development: use local backend

// 🔐 Helper function untuk handle response dengan token refresh
async function handleResponse<T>(response: Response, retryWithRefresh = true): Promise<T> {
  // Check if token expired
  if (response.status === 401 && retryWithRefresh) {
    const errorData = await response.json().catch(() => ({}));
    
    // Jika token expired, coba refresh
    if (errorData.expired) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Signal untuk retry
        throw new Error('TOKEN_REFRESHED');
      } else {
        // Refresh gagal, logout user
        logout();
        throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
      }
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Terjadi kesalahan' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

// 🔐 Refresh Access Token
async function refreshAccessToken(): Promise<boolean> {
  try {
    const refreshToken = refreshTokenStorage.get();
    if (!refreshToken) return false;

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    tokenStorage.set(data.token);
    userStorage.set(data.user);
    
    console.log('✅ Token refreshed successfully');
    return true;
  } catch (error) {
    console.error('❌ Token refresh failed:', error);
    return false;
  }
}

// 🔐 Logout helper
function logout() {
  tokenStorage.remove();
  refreshTokenStorage.remove();
  userStorage.remove();
  window.location.href = '/';
}

// Auth API
export const authAPI = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<AuthResponse>(response, false);
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await handleResponse<AuthResponse>(response, false);
    
    // Store refresh token jika ada
    if (result.refreshToken) {
      refreshTokenStorage.set(result.refreshToken);
    }
    
    return result;
  },

  logout: () => {
    logout();
  },
};

// Events API
export const eventsAPI = {
  getAll: async (): Promise<Event[]> => {
    const response = await fetch(`${API_BASE_URL}/events`);
    return handleResponse<Event[]>(response, false);
  },

  getById: async (id: number): Promise<Event> => {
    const response = await fetch(`${API_BASE_URL}/events/${id}`);
    return handleResponse<Event>(response, false);
  },
};

// 🔐 Local Storage helpers untuk token (access token)
export const tokenStorage = {
  get: (): string | null => localStorage.getItem('token'),
  set: (token: string): void => localStorage.setItem('token', token),
  remove: (): void => localStorage.removeItem('token'),
};

// 🔐 Local Storage helpers untuk refresh token
export const refreshTokenStorage = {
  get: (): string | null => localStorage.getItem('refreshToken'),
  set: (token: string): void => localStorage.setItem('refreshToken', token),
  remove: (): void => localStorage.removeItem('refreshToken'),
};

// Local Storage helpers untuk user data
export const userStorage = {
  get: (): string | null => localStorage.getItem('user'),
  set: (user: any): void => localStorage.setItem('user', JSON.stringify(user)),
  remove: (): void => localStorage.removeItem('user'),
};
