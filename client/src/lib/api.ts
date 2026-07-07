const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const getAuthToken = () => localStorage.getItem('token');
export const setAuthToken = (token: string) => localStorage.setItem('token', token);
export const removeAuthToken = () => localStorage.removeItem('token');

interface FetchOptions extends RequestInit {
  data?: any;
}

export async function apiFetch(endpoint: string, options: FetchOptions = {}) {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config: RequestInit = {
    ...options,
    headers,
  };

  if (options.data) {
    config.body = JSON.stringify(options.data);
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);
  
  if (response.status === 401) {
    // Optionally trigger a logout flow here if token is expired
    removeAuthToken();
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }

  return data;
}
