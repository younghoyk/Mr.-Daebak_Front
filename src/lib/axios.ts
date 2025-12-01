import axios from 'axios';

// ============================================
// axios API 클라이언트 설정
// ============================================
// 역할: 백엔드 API 통신을 위한 axios 인스턴스
// baseURL: /api (Vite proxy를 통해 localhost:8080으로 연결)
// ============================================

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// 요청 인터셉터: JWT 토큰 자동 주입
// ============================================
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================
// 응답 인터셉터: 401 에러 처리
// ============================================
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 인증 실패 시 토큰 및 인증 정보 제거
      localStorage.removeItem('accessToken');
      localStorage.removeItem('mr-daebak-auth'); // Zustand persist 데이터도 제거

      // 로그인 페이지로 리다이렉트
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
