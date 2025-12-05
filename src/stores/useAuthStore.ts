import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserResponseDto } from '../types/api';
import apiClient from '../lib/axios';

// ============================================
// useAuthStore
// ============================================
// 역할: 인증 상태 관리 (로그인/로그아웃)
// 저장소: localStorage (persist middleware)
// ============================================

// 저장될 상태 타입 (액션 제외)
interface PersistedAuthState {
  isAuthenticated: boolean;
  user: UserResponseDto | null;
  accessToken: string | null;
  isTokenValidated: boolean; // 토큰 검증 완료 여부
}

// 전체 상태 타입 (상태 + 액션)
interface AuthState extends PersistedAuthState {
  login: (token: string, user: UserResponseDto) => void;
  logout: () => void;
  checkAuth: () => boolean;
  updateUser: (user: UserResponseDto) => void;
  validateToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ----------------------------------------
      // 초기 상태
      // ----------------------------------------
      isAuthenticated: false,
      user: null,
      accessToken: null,
      isTokenValidated: false,

      // ----------------------------------------
      // 로그인: 토큰과 사용자 정보 저장
      // ----------------------------------------
      login: (token, user) => {
        // localStorage에도 토큰 저장 (axios interceptor용)
        localStorage.setItem('accessToken', token);

        set({
          isAuthenticated: true,
          user,
          accessToken: token,
          isTokenValidated: true, // 로그인 시 검증 완료로 표시
        });
      },

      // ----------------------------------------
      // 로그아웃: 모든 인증 정보 삭제
      // ----------------------------------------
      logout: () => {
        // localStorage에서 토큰 제거
        localStorage.removeItem('accessToken');

        set({
          isAuthenticated: false,
          user: null,
          accessToken: null,
          isTokenValidated: false,
        });
      },

      // ----------------------------------------
      // 인증 상태 확인 (앱 초기화 시 사용)
      // ----------------------------------------
      checkAuth: () => {
        const token = localStorage.getItem('accessToken');
        const state = get();

        // localStorage에 토큰이 있지만 store에 없는 경우 동기화
        if (token && !state.isAuthenticated) {
          set({ isAuthenticated: true, accessToken: token });
          return true;
        }

        // 토큰이 없으면 로그아웃 상태로
        if (!token && state.isAuthenticated) {
          set({ isAuthenticated: false, user: null, accessToken: null });
          return false;
        }

        return !!token;
      },

      // ----------------------------------------
      // 사용자 정보 업데이트 (회원정보 수정 후)
      // ----------------------------------------
      updateUser: (updatedUser) => {
        set({ user: updatedUser });
      },

      // ----------------------------------------
      // 토큰 유효성 검증 (서버에 실제로 요청하여 확인)
      // ----------------------------------------
      validateToken: async () => {
        const state = get();
        
        // 이미 검증이 완료되었으면 다시 검증하지 않음
        if (state.isTokenValidated) {
          return state.isAuthenticated;
        }

        const token = localStorage.getItem('accessToken');
        
        // 토큰이 없으면 유효하지 않음
        if (!token) {
          if (state.isAuthenticated) {
            set({ isAuthenticated: false, user: null, accessToken: null, isTokenValidated: true });
          } else {
            set({ isTokenValidated: true });
          }
          return false;
        }

        try {
          // 간단한 인증이 필요한 API 호출로 토큰 유효성 검증
          // /users/cards는 인증이 필요한 간단한 엔드포인트
          await apiClient.get('/users/cards');
          // 성공하면 토큰이 유효함
          set({ isTokenValidated: true, isAuthenticated: true });
          return true;
        } catch (error: any) {
          // 401 에러면 토큰이 유효하지 않음
          if (error.response?.status === 401) {
            // 로그아웃 처리 (단, ProtectedRoute에서 호출된 경우가 아닐 때만)
            // ProtectedRoute는 에러를 처리하므로 여기서는 검증 실패만 표시
            set({ isTokenValidated: true, isAuthenticated: false });
            // localStorage는 유지 (컴포넌트에서 처리)
            return false;
          }
          // 다른 에러는 토큰 문제가 아닐 수 있으므로 true 반환
          set({ isTokenValidated: true, isAuthenticated: true });
          return true;
        }
      },
    }),
    {
      name: 'mr-daebak-auth', // localStorage 키
      // 저장할 상태만 선택 (액션은 제외, PersistedAuthState 타입만 저장)
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        accessToken: state.accessToken,
        isTokenValidated: false, // 검증 상태는 저장하지 않음 (매번 새로 검증)
      } as PersistedAuthState),
    }
  )
);
