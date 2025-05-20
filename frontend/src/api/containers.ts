import api from './axios';
import { API_ROUTES } from './config';
import { ContainerWithVulns } from '../types/api';

// Получение списка контейнеров
export const getContainers = async (): Promise<ContainerWithVulns[]> => {
  try {
    console.log('Fetching containers from API...');
    const response = await api.get(API_ROUTES.CONTAINERS);
    console.log('Containers response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching containers:', error);
    throw error;
  }
};

// Получение данных о контейнере по ID
export const getContainerById = async (id: string): Promise<ContainerWithVulns> => {
  try {
    const response = await api.get(API_ROUTES.CONTAINER_BY_ID(id));
    return response.data;
  } catch (error) {
    console.error(`Error fetching container ${id}:`, error);
    throw error;
  }
};

// Сканирование контейнера на уязвимости
export const scanContainer = async (id: string): Promise<{ scan_id: string, status: string }> => {
  try {
    const response = await api.post(API_ROUTES.CONTAINER_SCAN(id));
    return response.data;
  } catch (error) {
    console.error(`Error scanning container ${id}:`, error);
    throw error;
  }
};
