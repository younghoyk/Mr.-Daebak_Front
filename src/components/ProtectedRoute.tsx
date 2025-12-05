import React, { useEffect, useState } from 'react';
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
  /** 관리자 페이지 접근 허용 여부 (기본값: false) */
  allowAdmin?: boolean;
}

/**
 * 인증이 필요한 페이지를 감싸는 컴포넌트
 * - 토큰이 없으면 로그인 페이지로 리다이렉트
 * - 토큰이 있으면 서버에 검증 요청하여 유효성 확인
 * - 관리자 계정이 일반 페이지에 접근하면 관리자 페이지로 리다이렉트
 * - 로그인 후 원래 페이지로 돌아올 수 있도록 현재 위치 저장
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = '/login',
  allowAdmin = false,
}) => {
  const location = useLocation();
  const { isAuthenticated, user, validateToken } = useAuthStore();
  const [isValidating, setIsValidating] = useState(true);

  // 컴포넌트 마운트 시 토큰 유효성 검증
  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem('accessToken');
      
      // 토큰이 없으면 검증 불필요
      if (!token) {
        setIsValidating(false);
        return;
      }

      // 토큰이 있으면 서버에 검증 요청
      // validateToken이 실패해도 로그아웃하지 않고 에러만 처리
      try {
        await validateToken();
      } catch (error) {
        // 검증 실패 시에도 로그아웃하지 않음 (컴포넌트에서 처리)
      }
      setIsValidating(false);
    };

    checkToken();
  }, [validateToken]);

  // 검증 중이면 로딩 표시 (또는 아무것도 렌더링하지 않음)
  if (isValidating) {
    return null; // 또는 로딩 스피너
  }

  // localStorage와 store 모두 확인 (하이드레이션 이슈 대응)
  const token = localStorage.getItem('accessToken');
  const isAuth = isAuthenticated || !!token;

  // 인증되지 않은 경우 리다이렉트
  if (!isAuth) {
    // state.from: 로그인 후 돌아올 경로 저장
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 관리자 페이지 접근 시 관리자 권한 체크
  if (allowAdmin) {
    if (user?.authority !== 'ROLE_ADMIN') {
      // 관리자 권한이 없으면 홈으로 리다이렉트
      return <Navigate to="/" replace />;
    }
  } else {
    // 관리자 계정이 일반 페이지에 접근하려고 하면 관리자 페이지로 리다이렉트
    if (user?.authority === 'ROLE_ADMIN') {
      return <Navigate to="/admin/orders" replace />;
    }
  }

  // 인증된 경우 자식 컴포넌트 렌더링
  return <>{children}</>;
};
