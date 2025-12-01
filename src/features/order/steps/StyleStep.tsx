import React, { useState, useEffect } from 'react';
import apiClient from '../../../lib/axios';
import { useOrderFlowStore } from '../../../stores/useOrderFlowStore';
import { ServingStyleResponseDto } from '../../../types/api';

// ============================================
// StyleStep 컴포넌트
// ============================================
// 역할: 3단계 - 서빙 스타일 선택
// API: GET /api/serving-styles/getAllServingStyles
// ============================================

// 스타일별 이모지 매핑
const getStyleEmoji = (name: string): string => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('simple')) return '🥡';
  if (lowerName.includes('grand')) return '🍽️';
  if (lowerName.includes('deluxe')) return '✨';
  return '🍴';
};

export const StyleStep: React.FC = () => {
  const { selectedDinner, selectedStyle, setStyle, nextStep, prevStep } =
    useOrderFlowStore();

  // ----------------------------------------
  // 상태 관리
  // ----------------------------------------
  const [styles, setStyles] = useState<ServingStyleResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 샴페인 디너는 Simple 스타일 선택 불가
  const isChampagneDinner = selectedDinner?.dinnerName
    ?.toLowerCase()
    .includes('champagne');

  // ----------------------------------------
  // API 호출: 서빙 스타일 목록 조회
  // ----------------------------------------
  useEffect(() => {
    const fetchStyles = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await apiClient.get<ServingStyleResponseDto[]>(
          '/serving-styles/getAllServingStyles'
        );
        const activeStyles = response.data.filter((s) => s.active);
        setStyles(activeStyles);
      } catch (err) {
        console.error('서빙 스타일 로딩 실패:', err);
        setError('서빙 스타일을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStyles();
  }, []);

  // ----------------------------------------
  // 이벤트 핸들러
  // ----------------------------------------
  const handleNext = () => {
    if (!selectedStyle) {
      alert('서빙 스타일을 선택해주세요.');
      return;
    }
    nextStep();
  };

  // ----------------------------------------
  // 렌더링: 로딩
  // ----------------------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">스타일 옵션을 불러오는 중...</p>
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
          <span className="text-green-600">서빙 스타일</span>을 선택하세요
        </h2>
        <p className="text-gray-500">분위기에 맞는 스타일을 골라주세요</p>
      </div>

      {/* 선택된 디너 표시 */}
      {selectedDinner && (
        <div className="bg-green-50 rounded-xl p-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">🍽️</span>
          <div>
            <p className="text-sm text-green-600">선택된 디너</p>
            <p className="font-bold">{selectedDinner.dinnerName}</p>
          </div>
        </div>
      )}

      {/* 스타일 목록 */}
      <div className="space-y-4 mb-8">
        {styles.map((style) => {
          const isDisabled =
            isChampagneDinner && style.styleName.toLowerCase() === 'simple';

          return (
            <button
              key={style.id}
              onClick={() => !isDisabled && setStyle(style)}
              disabled={isDisabled}
              className={`w-full text-left p-6 rounded-2xl border-2 transition-all ${
                isDisabled
                  ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                  : selectedStyle?.id === style.id
                  ? 'border-green-600 bg-green-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{getStyleEmoji(style.styleName)}</span>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {style.styleName}
                      {isDisabled && (
                        <span className="ml-2 text-sm text-red-500">(선택 불가)</span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">{style.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">
                    {style.extraPrice > 0
                      ? `+₩${style.extraPrice.toLocaleString()}`
                      : '무료'}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 스타일이 없는 경우 */}
      {styles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">선택 가능한 스타일이 없습니다.</p>
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
          disabled={!selectedStyle}
          className={`flex-1 py-4 rounded-xl text-lg font-bold transition-all ${
            selectedStyle
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
