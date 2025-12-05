import React, { useState, useEffect } from 'react';
import apiClient from '../../../lib/axios';
import { useOrderFlowStore } from '../../../stores/useOrderFlowStore';
import { ServingStyleResponseDto, CreateProductRequest, ProductResponseDto } from '../../../types/api';

// ============================================
// StyleStep 컴포넌트
// ============================================
// 역할: 3단계 - 각 디너 인스턴스별 서빙 스타일 선택 및 Product 생성
// API: GET /api/serving-styles/getAllServingStyles, POST /api/products/createProduct
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
  const { 
    selectedDinners,
    selectedAddress,
    setInstanceStyle,
    setInstanceProduct,
    nextStep, 
    prevStep 
  } = useOrderFlowStore();

  // ----------------------------------------
  // 상태 관리
  // ----------------------------------------
  const [styles, setStyles] = useState<ServingStyleResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingProducts, setCreatingProducts] = useState<Set<string>>(new Set());

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

  // 인스턴스는 setInstanceStyle에서 자동으로 생성됨

  // ----------------------------------------
  // 이벤트 핸들러
  // ----------------------------------------
  const handleStyleSelect = async (
    dinnerItemId: string,
    instanceIndex: number,
    style: ServingStyleResponseDto
  ) => {
    const dinnerItem = selectedDinners.find(d => d.id === dinnerItemId);
    if (!dinnerItem) return;

    // 스타일 설정
    setInstanceStyle(dinnerItemId, instanceIndex, style);

    // Product 생성
    const instanceKey = `${dinnerItemId}-${instanceIndex}`;
    setCreatingProducts(prev => new Set(prev).add(instanceKey));

    try {
      const request: CreateProductRequest = {
        dinnerId: dinnerItem.dinner.id,
        servingStyleId: style.id,
        quantity: 1,  // 각 인스턴스는 quantity=1
        address: selectedAddress,
        memo: '',
      };

      const response = await apiClient.post<ProductResponseDto>(
        '/products/createProduct',
        request
      );

      // Product 설정
      setInstanceProduct(dinnerItemId, instanceIndex, response.data);
    } catch (err: any) {
      console.error('Product 생성 실패:', err);
      const errorMessage = err.response?.data?.message || '상품 생성에 실패했습니다.';
      alert(errorMessage);
      // 스타일 초기화
      setInstanceStyle(dinnerItemId, instanceIndex, null as any);
    } finally {
      setCreatingProducts(prev => {
        const next = new Set(prev);
        next.delete(instanceKey);
        return next;
      });
    }
  };

  const handleNext = () => {
    // 모든 인스턴스의 스타일이 선택되었는지 확인
    const allStylesSelected = selectedDinners.every(item => {
      return item.instances.length === item.quantity &&
        item.instances.every(instance => instance.style && instance.product);
    });

    if (!allStylesSelected) {
      alert('모든 디너의 스타일을 선택해주세요.');
      return;
    }

    if (!selectedAddress) {
      alert('배달 주소를 선택해주세요.');
      return;
    }

    nextStep();
  };

  // 샴페인 축제 디너인지 확인
  const isChampagneDinner = (dinnerName: string) => {
    return dinnerName.toLowerCase().includes('champagne');
  };

  // 스타일이 선택 가능한지 확인
  const isStyleAvailable = (dinnerName: string, styleName: string) => {
    if (isChampagneDinner(dinnerName)) {
      const lowerStyle = styleName.toLowerCase();
      return lowerStyle.includes('grand') || lowerStyle.includes('deluxe');
    }
    return true;
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
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          각 디너의 <span className="text-green-600">서빙 스타일</span>을 선택하세요
        </h2>
        <p className="text-gray-500">각 디너마다 원하는 스타일을 선택해주세요</p>
      </div>

      {/* 각 디너별 인스턴스 스타일 선택 */}
      <div className="space-y-8 mb-8">
        {selectedDinners.map((dinnerItem) => (
          <div key={dinnerItem.id} className="bg-white rounded-2xl border-2 border-gray-200 p-6">
            {/* 디너 헤더 */}
            <div className="mb-6 pb-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {dinnerItem.dinner.dinnerName}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {dinnerItem.quantity}개 주문
              </p>
            </div>

            {/* 각 인스턴스별 스타일 선택 */}
            <div className="space-y-6">
              {Array.from({ length: dinnerItem.quantity }).map((_, index) => {
                const instance = dinnerItem.instances[index];
                const instanceKey = `${dinnerItem.id}-${index}`;
                const isCreating = creatingProducts.has(instanceKey);
                const selectedStyle = instance?.style;

                return (
                  <div key={index} className="bg-gray-50 rounded-xl p-4">
                    <div className="mb-3">
                      <span className="text-sm font-semibold text-gray-700">
                        {dinnerItem.dinner.dinnerName} - {index + 1}번째
                      </span>
                    </div>

                    {/* 스타일 선택 버튼들 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {styles
                        .filter(style => isStyleAvailable(dinnerItem.dinner.dinnerName, style.styleName))
                        .map((style) => {
                          const isSelected = selectedStyle?.id === style.id;
                          const isDisabled = isCreating;

                          return (
                            <button
                              key={style.id}
                              onClick={() => !isDisabled && handleStyleSelect(dinnerItem.id, index, style)}
                              disabled={isDisabled}
                              className={`p-4 rounded-xl border-2 transition-all text-left ${
                                isDisabled
                                  ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                                  : isSelected
                                  ? 'border-green-600 bg-green-50 shadow-md'
                                  : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-sm'
                              }`}
                            >
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">{getStyleEmoji(style.styleName)}</span>
                                <div className="flex-1">
                                  <h4 className="font-bold text-gray-900 text-sm">
                                    {style.styleName}
                                  </h4>
                                  <p className="text-xs text-gray-500 line-clamp-1">
                                    {style.description}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-green-600">
                                  {style.extraPrice > 0
                                    ? `+₩${style.extraPrice.toLocaleString()}`
                                    : '무료'}
                                </p>
                              </div>
                              {isSelected && (
                                <div className="mt-2 text-center">
                                  <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">
                                    선택됨
                                  </span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                    </div>

                    {/* 생성 중 표시 */}
                    {isCreating && (
                      <div className="mt-3 text-center">
                        <span className="text-sm text-gray-500">상품 생성 중...</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 진행 상황 표시 */}
      {selectedDinners.length > 0 && (
        <div className="bg-green-50 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">스타일 선택 진행률</span>
            <span className="text-sm font-bold text-green-600">
              {selectedDinners.reduce((acc, item) => {
                const selected = item.instances.filter(i => i.style && i.product).length;
                return acc + selected;
              }, 0)} / {selectedDinners.reduce((acc, item) => acc + item.quantity, 0)}
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
          disabled={creatingProducts.size > 0 || !selectedDinners.every(item => 
            item.instances.length === item.quantity &&
            item.instances.every(instance => instance.style && instance.product)
          )}
          className={`flex-1 py-4 rounded-xl text-lg font-bold transition-all ${
            creatingProducts.size === 0 && selectedDinners.every(item => 
              item.instances.length === item.quantity &&
              item.instances.every(instance => instance.style && instance.product)
            )
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
