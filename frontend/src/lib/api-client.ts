import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';

export const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:3000',
  withCredentials: true,
});

// İstek Arayıcısı: JWT Token'ı Authorization başlığına ekler
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

interface FailedRequest {
  resolve: (value: string | null) => void;
  reject: (reason: any) => void;
}

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: any, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Yanıt Arayıcısı: 401 hatası aldığında sessizce token yeniler ve bekleyen istekleri tekrarlar
apiClient.interceptors.response.use(
  (response) => {
    // NestJS ResponseInterceptor formatını aç
    return response.data.data !== undefined ? response.data.data : response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Sonsuz döngüden kaçınmak için sade axios instance'ı ile refresh çağrılır
        const response = await axios.post(
          'http://127.0.0.1:3000/auth/refresh',
          {},
          { withCredentials: true },
        );

        const data = response.data.data || response.data;
        const newAccessToken = data.accessToken;

        useAuthStore.getState().setAccessToken(newAccessToken);

        processQueue(null, newAccessToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    // Hata formatını standartlaştır
    const errData = error.response?.data?.error || {
      code: 'NETWORK_ERROR',
      message: error.message || 'Bir ağ hatası oluştu.',
    };
    return Promise.reject(errData);
  },
);
