import React, { useState, useEffect } from 'react';
import apiClient from '../../../lib/axios';
import { useOrderFlowStore } from '../../../stores/useOrderFlowStore';
import { DinnerResponseDto } from '../../../types/api';

// ============================================
// DinnerStep 컴포넌트
// ============================================
// 역할: 2단계 - 디너 종류 선택 (복수 선택 + 수량)
// API: GET /api/dinners/getAllDinners
// ============================================

// 디너별 이모지 매핑
const getDinnerEmoji = (name: string): string => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('valentine')) return '💝';
  if (lowerName.includes('french')) return '🥖';
  if (lowerName.includes('english')) return '🍳';
  if (lowerName.includes('champagne')) return '🍾';
  return '🍽️';
};

export const DinnerStep: React.FC = () => {
  const { 
    selectedDinners,
    addDinner,
    removeDinner,
    updateDinnerQuantity,
    nextStep, 
    prevStep 
  } = useOrderFlowStore();

  // ----------------------------------------
  // 상태 관리
  // ----------------------------------------
  const [dinners, setDinners] = useState<DinnerResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // ----------------------------------------
  // API 호출: 디너 목록 조회
  // ----------------------------------------
  useEffect(() => {
    const fetchDinners = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await apiClient.get<DinnerResponseDto[]>('/dinners/getAllDinners');
        const activeDinners = response.data.filter((d) => d.active);
        setDinners(activeDinners);
      } catch (err) {
        console.error('디너 목록 로딩 실패:', err);
        setError('디너 목록을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDinners();
  }, []);

  // ----------------------------------------
  // 이벤트 핸들러
  // ----------------------------------------
  const handleQuantityChange = (dinnerId: string, quantity: number) => {
    if (quantity <= 0) {
      const newQuantities = { ...quantities };
      delete newQuantities[dinnerId];
      setQuantities(newQuantities);
      // Store에서도 제거
      const item = selectedDinners.find(d => d.dinner.id === dinnerId);
      if (item) {
        removeDinner(item.id);
      }
    } else {
      setQuantities({ ...quantities, [dinnerId]: quantity });
      // Store에 추가/업데이트
      const dinner = dinners.find(d => d.id === dinnerId);
      if (dinner) {
        const item = selectedDinners.find(d => d.dinner.id === dinnerId);
        if (item) {
          updateDinnerQuantity(item.id, quantity);
        } else {
          addDinner(dinner, quantity);
        }
      }
    }
  };

  const handleIncrement = (dinnerId: string) => {
    const current = quantities[dinnerId] || 0;
    handleQuantityChange(dinnerId, current + 1);
  };

  const handleDecrement = (dinnerId: string) => {
    const current = quantities[dinnerId] || 0;
    handleQuantityChange(dinnerId, Math.max(0, current - 1));
  };

  const handleNext = () => {
    if (selectedDinners.length === 0) {
      alert('최소 1개 이상의 디너를 선택해주세요.');
      return;
    }
    // 모든 디너의 수량이 1 이상인지 확인
    const hasInvalidQuantity = selectedDinners.some(item => item.quantity < 1);
    if (hasInvalidQuantity) {
      alert('모든 디너의 수량을 1개 이상으로 설정해주세요.');
      return;
    }
    nextStep();
  };

  // 총 가격 계산
  const getTotalPrice = () => {
    return selectedDinners.reduce((total, item) => {
      return total + (item.dinner.basePrice * item.quantity);
    }, 0);
  };

  // ----------------------------------------
  // 렌더링: 로딩
  // ----------------------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">메뉴를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // 렌더링: 에러
  // ----------------------------------------
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-green-600 hover:underline"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // ----------------------------------------
  // 렌더링: 메인
  // ----------------------------------------
  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          어떤 <span className="text-green-600">디너</span>를 원하시나요?
        </h2>
        <p className="text-gray-500">여러 디너를 선택하고 수량을 설정할 수 있습니다</p>
      </div>

      {/* 디너 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {dinners.map((dinner) => {
          const quantity = quantities[dinner.id] || 0;
          const isSelected = quantity > 0;

          return (
            <div
              key={dinner.id}
              className={`text-left p-6 rounded-2xl border-2 transition-all ${
                isSelected
                  ? 'border-green-600 bg-green-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-md'
              }`}
            >
              {/* 이모지 및 제목 */}
              <div className="flex items-start gap-4 mb-4">
                <div className="text-5xl">{getDinnerEmoji(dinner.dinnerName)}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {dinner.dinnerName}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                    {dinner.description}
                  </p>
                  <p className="text-lg font-bold text-green-600">
                    ₩{dinner.basePrice.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* 수량 선택 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">수량</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleDecrement(dinner.id)}
                    className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    disabled={quantity === 0}
                  >
                    <span className="text-gray-600">−</span>
                  </button>
                  <span className="w-12 text-center font-bold text-gray-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleIncrement(dinner.id)}
                    className="w-8 h-8 rounded-full border-2 border-green-600 bg-green-600 text-white flex items-center justify-center hover:bg-green-700 transition-colors"
                  >
                    <span className="text-white">+</span>
                  </button>
                </div>
              </div>

              {/* 선택된 경우 총 가격 표시 */}
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">소계</span>
                    <span className="text-lg font-bold text-green-600">
                      ₩{(dinner.basePrice * quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 디너가 없는 경우 */}
      {dinners.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">등록된 디너가 없습니다.</p>
        </div>
      )}

      {/* 선택된 디너 요약 및 총 가격 */}
      {selectedDinners.length > 0 && (
        <div className="bg-green-50 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">선택된 디너</h3>
          <div className="space-y-2 mb-4">
            {selectedDinners.map((item) => (
              <div key={item.id} className="flex justify-between items-center">
                <span className="text-gray-700">
                  {item.dinner.dinnerName} × {item.quantity}
                </span>
                <span className="font-semibold text-gray-900">
                  ₩{(item.dinner.basePrice * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-green-200 flex justify-between items-center">
            <span className="text-lg font-bold text-gray-900">총 가격</span>
            <span className="text-2xl font-bold text-green-600">
              ₩{getTotalPrice().toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* 버튼 영역 */}
      <div className="flex gap-4">
        <button
          onClick={prevStep}
          className="flex-1 py-4 rounded-xl text-lg font-bold border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-all"
        >
          이전
        </button>
        <button
          onClick={handleNext}
          disabled={selectedDinners.length === 0}
          className={`flex-1 py-4 rounded-xl text-lg font-bold transition-all ${
            selectedDinners.length > 0
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          다음 단계로
        </button>
      </div>
    </div>
  );
};
