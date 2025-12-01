import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

// ============================================
// ProtectedRoute 컴포넌트
// ============================================
// 역할: 인증되지 않은 사용자의 페이지 접근을 차단
// 사용법: <ProtectedRoute><YourPage /></ProtectedRoute>
// ============================================

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** 리다이렉트할 경로 (기본값: /login) */
  redirectTo?: string;
}

/**
 * 인증이 필요한 페이지를 감싸는 컴포넌트
 * - 토큰이 없으면 로그인 페이지로 리다이렉트
 * - 로그인 후 원래 페이지로 돌아올 수 있도록 현재 위치 저장
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = '/login'
}) => {
  const location = useLocation();

  // Auth store에서 인증 상태 확인
  const { isAuthenticated, checkAuth } = useAuthStore();

  // 컴포넌트 마운트 시 인증 상태 동기화
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // localStorage와 store 모두 확인 (하이드레이션 이슈 대응)
  const token = localStorage.getItem('accessToken');
  const isAuth = isAuthenticated || !!token;

  // 인증되지 않은 경우 리다이렉트
  if (!isAuth) {
    // state.from: 로그인 후 돌아올 경로 저장
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 인증된 경우 자식 컴포넌트 렌더링
  return <>{children}</>;
};
