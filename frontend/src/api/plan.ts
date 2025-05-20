import api from './axios';
import { API_ROUTES } from './config';
import { PatchPlanParams, PatchPlanWithDetails } from '../types/api';

interface PlanQueryParams {
  window?: number;
  container_id?: string[];
  max_items?: number;
}

// Генерация плана исправления уязвимостей
export const generatePlan = async (params: PatchPlanParams): Promise<PatchPlanWithDetails> => {
  try {
    console.log('Generating plan with params:', params);
    const response = await api.get(API_ROUTES.PLAN, { params });
    return response.data;
  } catch (error) {
    console.error('Error generating plan:', error);
    // Возвращаем объект со всеми необходимыми полями из PatchPlanWithDetails
    return {
      id: '',
      container_id: '',
      vulnerability_id: '',
      scenario: 'hot-patch',
      start_time: new Date().toISOString(),
      duration: 0,
      priority: 0,
      status: 'error',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      container_name: '',
      container_image: '',
      vulnerability_cve: '',
      vulnerability_severity: '',
      vulnerability_score: 0
    };
  }
};

interface PlanStatusParams {
  status?: string;
  skip?: number;
  limit?: number;
}

// Получение статуса плана
export const getPlanStatus = async (): Promise<PatchPlanWithDetails[]> => {
  try {
    console.log('Fetching plan status...');
    const response = await api.get(API_ROUTES.PLAN_STATUS);
    console.log('Plan status response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching plan status:', error);
    return [];
  }
};

// Запуск выполнения плана
export const executePlan = async (planId: string): Promise<{ success: boolean }> => {
  try {
    const response = await api.post(API_ROUTES.PLAN_EXECUTE(planId));
    return response.data;
  } catch (error) {
    console.error(`Error executing plan ${planId}:`, error);
    return { success: false };
  }
}; 
