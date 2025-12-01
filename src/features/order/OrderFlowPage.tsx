import React from 'react';
import { useOrderFlowStore } from '../../stores/useOrderFlowStore';

// ============================================
// 단계별 컴포넌트 Import
// ============================================
// 각 단계는 독립적인 컴포넌트로 분리되어 유지보수 용이
import { StepIndicator } from './components/StepIndicator';
import { IntroStep } from './steps/IntroStep';
import { AddressStep } from './steps/AddressStep';
import { DinnerStep } from './steps/DinnerStep';
import { StyleStep } from './steps/StyleStep';
import { CustomizeStep } from './steps/CustomizeStep';
import { CheckoutStep } from './steps/CheckoutStep';

// ============================================
// OrderFlowPage 컴포넌트
// ============================================
// 역할: 주문 플로우의 메인 컨테이너
// 단계: intro → address → dinner → style → customize → checkout
//
// 구조:
// - StepIndicator: 현재 진행 단계 표시 (intro에서는 숨김)
// - 각 Step 컴포넌트: 단계별 UI와 로직 처리
//
// 컴포넌트 분리 기준:
// - /components: 재사용 가능한 UI 컴포넌트 (StepIndicator)
// - /steps: 각 주문 단계별 컴포넌트
// ============================================

export const OrderFlowPage: React.FC = () => {
  const { currentStep } = useOrderFlowStore();

  // ----------------------------------------
  // 단계별 컴포넌트 렌더링
  // ----------------------------------------
  const renderStep = () => {
    switch (currentStep) {
      case 'intro':
        return <IntroStep />;
      case 'address':
        return <AddressStep />;
      case 'dinner':
        return <DinnerStep />;
      case 'style':
        return <StyleStep />;
      case 'customize':
        return <CustomizeStep />;
      case 'checkout':
        return <CheckoutStep />;
      default:
        return <IntroStep />;
    }
  };

  // ----------------------------------------
  // 렌더링
  // ----------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 단계 인디케이터 (intro에서는 자동 숨김) */}
        <StepIndicator currentStep={currentStep} />

        {/* 단계별 컨텐츠 */}
        <div className="transition-all duration-300">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};
