import api from './axios';
import { API_ROUTES } from './config';
import { Vulnerability, VulnerabilityWithContainer } from '../types/api';

interface VulnerabilityQueryParams {
  container_id?: string;
  severity?: string;
  cve_id?: string;
  min_cvss?: number;
  skip?: number;
  limit?: number;
}

// Получение списка всех уязвимостей
export const getVulnerabilities = async (params?: VulnerabilityQueryParams): Promise<VulnerabilityWithContainer[]> => {
  try {
    console.log('Fetching vulnerabilities from API...');
    const response = await api.get(API_ROUTES.VULNERABILITIES, { params });
    console.log('Vulnerabilities response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching vulnerabilities:', error);
    return [];
  }
};

// Получение уязвимости по ID
export const getVulnerabilityById = async (id: string): Promise<VulnerabilityWithContainer> => {
  try {
    const response = await api.get(API_ROUTES.VULNERABILITY_BY_ID(id));
    return response.data;
  } catch (error) {
    console.error(`Error fetching vulnerability ${id}:`, error);
    throw error;
  }
};

// Получение уязвимостей для конкретного контейнера
export const getVulnerabilitiesByContainer = async (containerId: string): Promise<Vulnerability[]> => {
  try {
    const response = await api.get(API_ROUTES.VULNERABILITIES, { 
      params: { container_id: containerId } 
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching vulnerabilities for container ${containerId}:`, error);
    return [];
  }
}; 
