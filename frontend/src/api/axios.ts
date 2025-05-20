import axios from 'axios';

// Определение базового URL для проксирования через Vite
const BASE_URL = '/v1';

// Список URL, которым НЕ нужно добавлять слеш в конце
const NO_TRAILING_SLASH_URLS = [
  '/plan/status',
  '/containers/scan',
  // Добавьте сюда другие проблемные URL по мере обнаружения
];

// Базовая конфигурация axios
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Увеличиваем таймаут до 10 секунд
  timeout: 10000,
  
  // Важно включить withCredentials: false для CORS запросов
  withCredentials: false,
});

// Интерцепторы для обработки ошибок
api.interceptors.response.use(
  (response) => {
    console.log('Success Response:', response.config.url, response.status);
    return response;
  },
  (error) => {
    // Обработка HTTP ошибок
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
      console.error('Request:', error.config.url, error.config.method);
    } else if (error.request) {
      console.error('No response received:', error.request);
      // Добавляем информацию о таймауте для отладки
      if (error.code === 'ECONNABORTED') {
        console.error('Request timeout. Consider increasing the timeout value.');
      }
    } else {
      console.error('Request error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Интерцептор запросов для логирования и добавления слеша
api.interceptors.request.use(config => {
  // Добавляем слеш в конце URL, если его нет и это не исключение
  if (config.url && 
      !config.url.endsWith('/') && 
      !config.url.includes('?') &&
      !NO_TRAILING_SLASH_URLS.some(url => config.url && config.url.includes(url))) {
    config.url = `${config.url}/`;
  }
  
  // Логируем запросы в консоль для отладки
  console.log(`API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, 
    config.params || config.data || '');
  
  return config;
});

export default api; 
