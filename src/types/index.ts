// TypeScript interfaces untuk aplikasi EventKampus

export interface Event {
  id: number;
  nama_event: string;
  deskripsi: string;
  poster_url: string | null;
  tanggal_mulai: string;
  tanggal_selesai: string;
  lokasi: string;
  nama_organisasi: string;
}

export interface User {
  id: number;
  email: string;
  nama_lengkap: string;
  role: 'PESERTA' | 'ORGANISASI';
}

export interface AuthResponse {
  message: string;
  token: string;
  refreshToken?: string; // 🔐 Optional refresh token
  user: User;
}

export interface RegisterData {
  email: string;
  password: string;
  nama_lengkap: string;
  role: 'PESERTA' | 'ORGANISASI';
}

export interface LoginData {
  email: string;
  password: string;
}
