import axios from 'axios';

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const API_URL = RAW_API_URL.endsWith('/api') ? RAW_API_URL : `${RAW_API_URL}/api`;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1];
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Helper to set token cookie
export function setTokenCookie(token: string, expiresDays = 7) {
  if (typeof window !== 'undefined') {
    const date = new Date();
    date.setTime(date.getTime() + expiresDays * 24 * 60 * 60 * 1000);
    document.cookie = `token=${token}; path=/; expires=${date.toUTCString()}; SameSite=Lax; Secure`;
  }
}

// Helper to clear token cookie
export function clearTokenCookie() {
  if (typeof window !== 'undefined') {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  }
}
