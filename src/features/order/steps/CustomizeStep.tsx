import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../../lib/axios';
import { useOrderFlowStore } from '../../../stores/useOrderFlowStore';
import { DinnerMenuItemResponseDto, MenuItemResponseDto } from '../../../types/api';

// ============================================
// CustomizeStep 컴포넌트
// ============================================
// 역할: 4단계 - 각 Product별 메뉴 커스터마이징 + 공통 추가 메뉴 및 특별 요청사항
// API: GET /api/dinners/{dinnerId}/default-menu-items, PATCH /api/products/{productId}/menu-items/{menuItemId}
// ============================================

export const CustomizeStep: React.FC = () => {
  const {
    selectedDinners,
    globalAdditionalMenuItems,
    globalMemo,
    setInstanceMenuCustomizations,
    updateInstanceMenuItemQuantity,
    setGlobalMemo,
    addGlobalAdditionalMenuItem,
    removeGlobalAdditionalMenuItem,
    updateGlobalAdditionalMenuItemQuantity,
    nextStep,
    prevStep,
  } = useOrderFlowStore();

  // ----------------------------------------
  // 상태 관리
  // ----------------------------------------
  const [allMenuItems, setAllMenuItems] = useState<MenuItemResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuItemsByDinner, setMenuItemsByDinner] = useState<Record<string, DinnerMenuItemResponseDto[]>>({});

  // ----------------------------------------
  // Product 가격 계산 함수 (프론트엔드에서 실시간 계산)
  // 공통 추가 메뉴는 제외하고 각 Product의 메뉴 커스터마이징만 반영
  // ----------------------------------------
  const calculateProductPrice = useCallback((
    dinnerItem: typeof selectedDinners[0],
    instanceIndex: number
  ): number => {
    const instance = dinnerItem.instances[instanceIndex];
    if (!instance.product || !instance.style) return 0;

    // 기본 가격 (dinner + style)
    const basePrice = dinnerItem.dinner.basePrice + instance.style.extraPrice;

    // 메뉴 아이템 가격 계산 (각 Product의 메뉴 커스터마이징만)
    let menuItemsTotal = 0;
    
    // 기본 메뉴 아이템 가격 (기본 수량보다 많으면 추가 비용, 적으면 할인)
    instance.menuCustomizations.forEach(customization => {
      const menuItem = allMenuItems.find(m => m.id === customization.menuItemId);
      if (menuItem) {
        const quantityDiff = customization.currentQuantity - customization.defaultQuantity;
        // 양수든 음수든 차이만큼 가격 반영
        menuItemsTotal += menuItem.unitPrice * quantityDiff;
      }
    });

    // 공통 추가 메뉴는 각 Product 가격에 포함하지 않음 (별도로 관리)

    return basePrice + menuItemsTotal;
  }, [allMenuItems, selectedDinners]);

  // ----------------------------------------
  // API 호출: 모든 메뉴 아이템 로드 (추가 메뉴 검색용)
  // ----------------------------------------
  useEffect(() => {
    const fetchAllMenuItems = async () => {
      try {
        const response = await apiClient.get<MenuItemResponseDto[]>(
          '/menu-items/getAllMenuItems'
        );
        setAllMenuItems(response.data);
      } catch (err) {
        console.error('전체 메뉴 아이템 로딩 실패:', err);
      }
    };

    fetchAllMenuItems();
  }, []);

  // ----------------------------------------
  // 각 디너의 기본 메뉴 아이템 로드 (한 번만 실행)
  // ----------------------------------------
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        // 이미 로드된 메뉴 아이템이 있으면 스킵
        const dinnerIds = selectedDinners.map(d => d.dinner.id);
        const allLoaded = dinnerIds.every(id => menuItemsByDinner[id]);
        
        if (allLoaded && Object.keys(menuItemsByDinner).length > 0) {
          // 이미 로드되었고, menuCustomizations만 초기화
          selectedDinners.forEach(dinnerItem => {
            dinnerItem.instances.forEach((instance, instanceIndex) => {
              if (instance.menuCustomizations.length === 0 && instance.product) {
                const defaultMenuItems = menuItemsByDinner[dinnerItem.dinner.id] || [];
                const customizations = defaultMenuItems.map(item => ({
                  menuItemId: item.menuItemId,
                  menuItemName: item.menuItemName,
                  defaultQuantity: item.defaultQuantity,
                  currentQuantity: item.defaultQuantity,
                }));
                setInstanceMenuCustomizations(dinnerItem.id, instanceIndex, customizations);
              }
            });
          });
          return;
        }

        setIsLoading(true);
        const menuItemsMap: Record<string, DinnerMenuItemResponseDto[]> = { ...menuItemsByDinner };

        for (const dinnerItem of selectedDinners) {
          if (!menuItemsMap[dinnerItem.dinner.id]) {
            try {
              const response = await apiClient.get<DinnerMenuItemResponseDto[]>(
                `/dinners/${dinnerItem.dinner.id}/default-menu-items`
              );
              menuItemsMap[dinnerItem.dinner.id] = response.data;
            } catch (err) {
              console.error(`디너 ${dinnerItem.dinner.id} 메뉴 아이템 로딩 실패:`, err);
            }
          }
        }

        setMenuItemsByDinner(menuItemsMap);

        // 각 인스턴스의 menuCustomizations 초기화
        selectedDinners.forEach(dinnerItem => {
          dinnerItem.instances.forEach((instance, instanceIndex) => {
            if (instance.menuCustomizations.length === 0 && instance.product) {
              const defaultMenuItems = menuItemsMap[dinnerItem.dinner.id] || [];
              const customizations = defaultMenuItems.map(item => ({
                menuItemId: item.menuItemId,
                menuItemName: item.menuItemName,
                defaultQuantity: item.defaultQuantity,
                currentQuantity: item.defaultQuantity,
              }));
              setInstanceMenuCustomizations(dinnerItem.id, instanceIndex, customizations);
            }
          });
        });
      } catch (err) {
        console.error('메뉴 아이템 로딩 실패:', err);
        setError('메뉴 정보를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    if (selectedDinners.length > 0) {
      fetchMenuItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDinners.map(d => d.dinner.id).join(',')]); // dinner ID만 체크

  // ----------------------------------------
  // 이벤트 핸들러 (Store만 업데이트, API 호출 없음)
  // ----------------------------------------
  const handleMenuItemQuantityChange = (
    dinnerItemId: string,
    instanceIndex: number,
    menuItemId: string,
    quantity: number,
    e?: React.MouseEvent
  ) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Store만 업데이트 (즉시 API 호출 없음)
    updateInstanceMenuItemQuantity(dinnerItemId, instanceIndex, menuItemId, Math.max(0, quantity));
  };

  const handleAddGlobalMenuItem = (menuItem: MenuItemResponseDto) => {
    addGlobalAdditionalMenuItem(menuItem.id, menuItem.name);
  };

  const handleRemoveGlobalMenuItem = (menuItemId: string) => {
    removeGlobalAdditionalMenuItem(menuItemId);
  };

  const handleUpdateGlobalMenuItemQuantity = (menuItemId: string, quantity: number) => {
    updateGlobalAdditionalMenuItemQuantity(menuItemId, quantity);
  };

  // ----------------------------------------
  // 다음 단계로 이동 (Store 상태만 유지, API 호출 없음)
  // ★ 실제 API 반영은 CheckoutStep에서 결제 시 한 번에 처리
  // ----------------------------------------
  const handleNext = () => {
    // Store에 이미 저장된 상태 그대로 다음 단계로 이동
    // - menuCustomizations: 커스터마이징 정보
    // - globalAdditionalMenuItems: 추가 메뉴
    // - globalMemo: 특별 요청사항
    nextStep();
  };

  // 총 가격 계산 (각 Product 가격 + 공통 추가 메뉴 가격)
  const calculateTotalPrice = useCallback((): number => {
    // 각 Product 가격 합산
    let total = 0;
    selectedDinners.forEach(item => {
      item.instances.forEach((instance, instanceIndex) => {
        if (instance.product && instance.style) {
          total += calculateProductPrice(item, instanceIndex);
        }
      });
    });

    // 공통 추가 메뉴 가격 추가
    globalAdditionalMenuItems.forEach(additionalItem => {
      const menuItem = allMenuItems.find(m => m.id === additionalItem.menuItemId);
      if (menuItem) {
        total += menuItem.unitPrice * additionalItem.quantity;
      }
    });

    return total;
  }, [selectedDinners, globalAdditionalMenuItems, allMenuItems, calculateProductPrice]);

  const totalPrice = calculateTotalPrice();

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
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          주문을 <span className="text-green-600">커스터마이징</span> 하세요
        </h2>
        <p className="text-gray-500">각 디너의 메뉴 구성을 변경할 수 있습니다</p>
      </div>

      {/* 각 Product별 커스터마이징 */}
      <div className="space-y-6 mb-8">
        {selectedDinners.map((dinnerItem) => (
          <div key={dinnerItem.id} className="bg-white rounded-2xl border-2 border-gray-200 p-6">
            {/* 디너 헤더 */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {dinnerItem.dinner.dinnerName}
              </h3>
            </div>

            {/* 각 인스턴스별 커스터마이징 */}
            <div className="space-y-6">
              {dinnerItem.instances.map((instance, instanceIndex) => {
                if (!instance.product) return null;

                const customizations = instance.menuCustomizations;
                // 실시간 가격 계산
                const productPrice = calculateProductPrice(dinnerItem, instanceIndex);

                return (
                  <div key={instance.id} className="bg-gray-50 rounded-xl p-4">
                    <div className="mb-4 flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700">
                        {dinnerItem.dinner.dinnerName} - {instanceIndex + 1}번째 ({instance.style.styleName})
                      </span>
                      <span className="text-lg font-bold text-green-600">
                        ₩{productPrice.toLocaleString()}
                      </span>
                    </div>

                    {/* 메뉴 구성 변경 */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-gray-700 mb-2">메뉴 구성 변경</h4>
                      {customizations.length > 0 ? (
                        customizations.map((customization) => {
                          const menuItem = allMenuItems.find(m => m.id === customization.menuItemId);
                          const quantityDiff = customization.currentQuantity - customization.defaultQuantity;
                          const costChange = menuItem ? menuItem.unitPrice * quantityDiff : 0;

                          return (
                            <div key={customization.menuItemId} className="flex items-center justify-between bg-white p-3 rounded-lg">
                              <div className="flex-1">
                                <span className="text-sm text-gray-700">
                                  {customization.menuItemName}
                                  {menuItem?.unitType && ` (${menuItem.unitType})`}
                                </span>
                                {costChange !== 0 && (
                                  <p className={`text-xs mt-1 ${costChange > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {costChange > 0 ? '추가 비용' : '할인'}: {costChange > 0 ? '+' : ''}₩{Math.abs(costChange).toLocaleString()}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={(e) => handleMenuItemQuantityChange(
                                    dinnerItem.id,
                                    instanceIndex,
                                    customization.menuItemId,
                                    Math.max(0, customization.currentQuantity - 1),
                                    e
                                  )}
                                  className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100"
                                >
                                  <span className="text-gray-600">−</span>
                                </button>
                                <span className="w-12 text-center font-bold text-gray-900">
                                  {customization.currentQuantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleMenuItemQuantityChange(
                                    dinnerItem.id,
                                    instanceIndex,
                                    customization.menuItemId,
                                    customization.currentQuantity + 1,
                                    e
                                  )}
                                  className="w-8 h-8 rounded-full border-2 border-green-600 bg-green-600 text-white flex items-center justify-center hover:bg-green-700"
                                >
                                  <span className="text-white">+</span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-gray-500">기본 메뉴 구성</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 공통 추가 메뉴 */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">공통 추가 메뉴</h3>
        <div className="space-y-3 mb-4">
          {globalAdditionalMenuItems.length > 0 ? (
            globalAdditionalMenuItems.map((item) => {
              const menuItem = allMenuItems.find(m => m.id === item.menuItemId);
              const itemTotal = menuItem ? menuItem.unitPrice * item.quantity : 0;
              
              return (
                <div key={item.menuItemId} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex-1">
                    <span className="text-sm text-gray-700">
                      {item.menuItemName}
                      {menuItem?.unitType && ` (${menuItem.unitType})`}
                    </span>
                    {menuItem && (
                      <p className="text-xs text-gray-500 mt-1">
                        ₩{menuItem.unitPrice.toLocaleString()} × {item.quantity} = ₩{itemTotal.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleUpdateGlobalMenuItemQuantity(
                        item.menuItemId,
                        Math.max(1, item.quantity - 1)
                      )}
                      className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100"
                    >
                      <span className="text-gray-600">−</span>
                    </button>
                    <span className="w-12 text-center font-bold text-gray-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateGlobalMenuItemQuantity(
                        item.menuItemId,
                        item.quantity + 1
                      )}
                      className="w-8 h-8 rounded-full border-2 border-green-600 bg-green-600 text-white flex items-center justify-center hover:bg-green-700"
                    >
                      <span className="text-white">+</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveGlobalMenuItem(item.menuItemId)}
                      className="ml-2 text-red-500 hover:text-red-700 text-sm"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500">추가 메뉴가 없습니다</p>
          )}
        </div>
        {/* 추가 메뉴 검색 및 추가 */}
        <div className="mt-4">
          <select
            onChange={(e) => {
              const menuItem = allMenuItems.find(m => m.id === e.target.value);
              if (menuItem) {
                handleAddGlobalMenuItem(menuItem);
                e.target.value = '';
              }
            }}
            className="w-full p-2 border border-gray-300 rounded-lg"
            defaultValue=""
          >
            <option value="">추가 메뉴 선택...</option>
            {allMenuItems
              .filter(m => !globalAdditionalMenuItems.some(g => g.menuItemId === m.id))
              .map(menuItem => (
                <option key={menuItem.id} value={menuItem.id}>
                  {menuItem.name} (₩{menuItem.unitPrice?.toLocaleString() || 0})
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* 특별 요청사항 */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">특별 요청사항</h3>
        <textarea
          value={globalMemo}
          onChange={(e) => setGlobalMemo(e.target.value)}
          placeholder="예: 일회용품도 같이 배달해주세요"
          className="w-full p-3 border border-gray-300 rounded-lg resize-none"
          rows={3}
        />
      </div>

      {/* 총 합계 표시 */}
      <div className="bg-green-50 rounded-xl p-6 mb-6 text-center">
        <p className="text-sm text-gray-500 mb-2">총 주문 금액</p>
        <p className="text-3xl font-bold text-green-600">
          ₩{totalPrice.toLocaleString()}
        </p>
      </div>

      {/* 버튼 영역 */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={prevStep}
          className="flex-1 py-4 rounded-xl text-lg font-bold border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-all"
        >
          이전
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="flex-1 py-4 rounded-xl text-lg font-bold bg-green-600 text-white hover:bg-green-700 transition-all"
        >
          다음 단계로
        </button>
      </div>
    </div>
  );
};
