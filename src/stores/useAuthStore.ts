import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserResponseDto } from '../types/api';

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
}

// 전체 상태 타입 (상태 + 액션)
interface AuthState extends PersistedAuthState {
  login: (token: string, user: UserResponseDto) => void;
  logout: () => void;
  checkAuth: () => boolean;
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
    }),
    {
      name: 'mr-daebak-auth', // localStorage 키
      // 저장할 상태만 선택 (액션은 제외, PersistedAuthState 타입만 저장)
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        accessToken: state.accessToken,
      } as PersistedAuthState),
    }
  )
);
