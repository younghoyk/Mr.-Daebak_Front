import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      
      const isExcludedRequest = 
        requestUrl.includes('/carts/createCart') ||
        (requestUrl.includes('/carts/') && requestUrl.includes('/checkout')) ||
        requestUrl.includes('/orders/admin/') ||
        requestUrl.includes('/users/') ||
        requestUrl.includes('/voice-order/') ||
        (requestUrl.includes('/orders') && !requestUrl.includes('/orders/admin/')) ||
        requestUrl.includes('/products/');
      
      if (!isExcludedRequest) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('mr-daebak-auth');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
