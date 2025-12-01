import React, { useState, useEffect } from 'react';
import apiClient from '../../../lib/axios';
import { useOrderFlowStore } from '../../../stores/useOrderFlowStore';
import { DinnerMenuItemResponseDto } from '../../../types/api';

// ============================================
// CustomizeStep 컴포넌트
// ============================================
// 역할: 3단계 - 주문 커스터마이징 (수량, 메뉴 구성, 특별 요청)
// 순서: 디너선택 → [현재] 주문옵션 → 서빙스타일 → 결제
// API: GET /api/dinners/{dinnerId}/default-menu-items
// ============================================

export const CustomizeStep: React.FC = () => {
  const {
    selectedDinner,
    quantity,
    memo,
    menuCustomizations,
    setQuantity,
    setMemo,
    setMenuCustomizations,
    updateMenuItemQuantity,
    nextStep,
    prevStep,
  } = useOrderFlowStore();

  // ----------------------------------------
  // 상태 관리
  // ----------------------------------------
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ----------------------------------------
  // API 호출: 디너의 기본 메뉴 아이템 로드
  // ----------------------------------------
  useEffect(() => {
    const fetchMenuItems = async () => {
      if (!selectedDinner) return;

      try {
        setIsLoading(true);
        setError(null);
        const response = await apiClient.get<DinnerMenuItemResponseDto[]>(
          `/dinners/${selectedDinner.id}/default-menu-items`
        );

        const customizations = response.data.map((item) => ({
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          defaultQuantity: item.defaultQuantity,
          currentQuantity: item.defaultQuantity,
        }));

        setMenuCustomizations(customizations);
      } catch (err) {
        console.error('메뉴 아이템 로딩 실패:', err);
        setError('메뉴 정보를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenuItems();
  }, [selectedDinner, setMenuCustomizations]);

  // ----------------------------------------
  // 렌더링: 로딩
  // ----------------------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">메뉴 정보를 불러오는 중...</p>
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
    <div className="max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          주문을 <span className="text-green-600">커스터마이징</span> 하세요
        </h2>
        <p className="text-gray-500">수량, 메뉴 구성을 변경할 수 있습니다</p>
      </div>

      {/* 선택 요약 (서빙스타일 선택 전이므로 디너 정보만 표시) */}
      <div className="bg-green-50 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍽️</span>
          <div>
            <p className="font-bold">{selectedDinner?.dinnerName}</p>
            <p className="text-sm text-gray-500">
              기본 가격: ₩{selectedDinner?.basePrice.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* 수량 조절 */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h3 className="font-bold text-gray-700 mb-4">주문 수량</h3>
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => setQuantity(quantity - 1)}
            disabled={quantity <= 1}
            className="w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 text-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            -
          </button>
          <span className="text-3xl font-bold w-16 text-center">{quantity}</span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 text-xl font-bold"
          >
            +
          </button>
        </div>
      </div>

      {/* 메뉴 아이템 커스터마이징 */}
      {menuCustomizations.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="font-bold text-gray-700 mb-4">메뉴 구성 변경</h3>
          <p className="text-sm text-gray-500 mb-4">
            각 항목의 수량을 조절할 수 있습니다 (추가 비용 발생 가능)
          </p>
          <div className="space-y-4">
            {menuCustomizations.map((item) => (
              <div
                key={item.menuItemId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div>
                  <p className="font-medium">{item.menuItemName}</p>
                  <p className="text-xs text-gray-500">
                    기본: {item.defaultQuantity}개
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      updateMenuItemQuantity(item.menuItemId, item.currentQuantity - 1)
                    }
                    disabled={item.currentQuantity <= 0}
                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-bold">
                    {item.currentQuantity}
                  </span>
                  <button
                    onClick={() =>
                      updateMenuItemQuantity(item.menuItemId, item.currentQuantity + 1)
                    }
                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 특별 요청사항 */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h3 className="font-bold text-gray-700 mb-4">특별 요청사항</h3>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="예: 샴페인을 2병으로 변경해주세요, 커피는 빼주세요"
          className="w-full p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          rows={3}
        />
      </div>

      {/* 버튼 영역 */}
      <div className="flex gap-4">
        <button
          onClick={prevStep}
          className="flex-1 py-4 rounded-xl text-lg font-bold border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-all"
        >
          이전
        </button>
        <button
          onClick={nextStep}
          className="flex-1 py-4 rounded-xl text-lg font-bold bg-green-600 text-white hover:bg-green-700 transition-all"
        >
          다음 단계로
        </button>
      </div>
    </div>
  );
};
