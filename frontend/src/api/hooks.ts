import api from './axios';
import { Hook } from '../types/api';

interface HookQueryParams {
  type?: string;
  enabled?: boolean;
  skip?: number;
  limit?: number;
}

// Получение списка хуков
export const getHooks = async (params: HookQueryParams = {}): Promise<Hook[]> => {
  const response = await api.get('/hooks', { params });
  return response.data;
};

// Получение информации о конкретном хуке
export const getHookById = async (id: number): Promise<Hook> => {
  const response = await api.get(`/hooks/${id}`);
  return response.data;
};

// Создание нового хука
export const createHook = async (data: Omit<Hook, 'id' | 'created_at' | 'updated_at'>): Promise<Hook> => {
  const response = await api.post('/hooks', data);
  return response.data;
};

// Обновление хука
export const updateHook = async (id: number, data: Partial<Omit<Hook, 'id' | 'created_at' | 'updated_at'>>): Promise<Hook> => {
  const response = await api.put(`/hooks/${id}`, data);
  return response.data;
};

// Удаление хука
export const deleteHook = async (id: number): Promise<{ status: string; message: string }> => {
  const response = await api.delete(`/hooks/${id}`);
  return response.data;
}; 
