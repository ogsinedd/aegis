// Конфигурация API и маршрутов

// Все URL будут относительными и пойдут через прокси Vite
export const API_BASE_URL = '/v1';

// Определение маршрутов API для правильного формирования URL
export const API_ROUTES = {
  // Контейнеры
  CONTAINERS: '/containers',
  CONTAINER_BY_ID: (id: string) => `/containers/${id}`,
  CONTAINER_SCAN: (id: string) => `/containers/${id}/scan`,
  
  // Уязвимости
  VULNERABILITIES: '/vulnerabilities',
  VULNERABILITY_BY_ID: (id: string) => `/vulnerabilities/${id}`,
  
  // План патчинга
  PLAN: '/plan',
  PLAN_STATUS: '/plan/status',
  PLAN_EXECUTE: (id: string) => `/plan/${id}/execute`,
  
  // Хуки
  HOOKS: '/hooks',
  HOOK_BY_ID: (id: string) => `/hooks/${id}`,
};

export default API_ROUTES; 
