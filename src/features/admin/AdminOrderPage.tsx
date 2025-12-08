import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../lib/axios';
import { useAuthStore } from '../../stores/useAuthStore';
import {
  OrderResponseDto,
  OrderStatus,
  DeliveryStatus,
  ApproveOrderRequest,
  UpdateDeliveryStatusRequest,
  MenuItemResponseDto,
} from '../../types/api';

// ============================================
// 재고 표시 단위 변환 설정 (12종류)
// ============================================
// DB stock 값 → 표시 단위로 변환
// 예: 스테이크 stock=5 (인분) → 표시: 1000g (5 × 200)
interface StockDisplayConfig {
  name: string;
  unitType: string;
  displayUnit: string;
  ratio: number; // stock × ratio = 표시값
}

const STOCK_DISPLAY_CONFIGS: StockDisplayConfig[] = [
  { name: '스테이크', unitType: '인분', displayUnit: 'g', ratio: 200 },
  { name: '샐러드', unitType: '인분', displayUnit: 'g', ratio: 200 },
  { name: '베이컨', unitType: '인분', displayUnit: 'g', ratio: 100 },
  { name: '에그 스크램블', unitType: '인분', displayUnit: '개', ratio: 1 },
  { name: '와인', unitType: '잔', displayUnit: '잔', ratio: 1 },
  { name: '와인', unitType: '병', displayUnit: '병', ratio: 1 },
  { name: '샴페인', unitType: '잔', displayUnit: '잔', ratio: 1 },
  { name: '샴페인', unitType: '병', displayUnit: '병', ratio: 1 },
  { name: '커피', unitType: '잔', displayUnit: '잔', ratio: 1 },
  { name: '커피', unitType: '포트', displayUnit: '포트', ratio: 1 },
  { name: '빵', unitType: '개', displayUnit: '개', ratio: 1 },
  { name: '바게트빵', unitType: '개', displayUnit: '개', ratio: 1 },
];

// 메뉴 아이템의 표시 설정 찾기
const getDisplayConfig = (menuItem: MenuItemResponseDto): StockDisplayConfig | null => {
  return STOCK_DISPLAY_CONFIGS.find(
    config => config.name === menuItem.name && config.unitType === menuItem.unitType
  ) || null;
};

// stock을 표시 단위로 변환
const stockToDisplay = (menuItem: MenuItemResponseDto): number => {
  const config = getDisplayConfig(menuItem);
  if (!config) return menuItem.stock;
  return menuItem.stock * config.ratio;
};

// 표시 단위를 stock으로 변환
const displayToStock = (menuItem: MenuItemResponseDto, displayValue: number): number => {
  const config = getDisplayConfig(menuItem);
  if (!config) return displayValue;
  return Math.round(displayValue / config.ratio);
};

// 표시 단위 문자열 가져오기
const getDisplayUnit = (menuItem: MenuItemResponseDto): string => {
  const config = getDisplayConfig(menuItem);
  return config?.displayUnit || menuItem.unitType;
};

// 메뉴 아이템 표시 라벨 생성
const getMenuItemLabel = (menuItem: MenuItemResponseDto): string => {
  const config = getDisplayConfig(menuItem);
  if (config) {
    // 특별한 단위 변환이 있는 경우
    if (config.name === '스테이크') return '고기';
    if (config.name === '샐러드') return '채소';
    if (config.name === '에그 스크램블') return '계란';
  }
  return menuItem.name;
};

// ============================================
// AdminOrderPage 컴포넌트
// ============================================
// 역할: 관리자 주문 관리 페이지
// API:
//   - GET /api/orders/admin/all - 모든 주문 조회
//   - GET /api/orders/admin/search - 주문 검색
//   - POST /api/orders/admin/{orderId}/approve - 주문 승인/거절
//   - PATCH /api/orders/admin/{orderId}/delivery-status - 배송 상태 변경
// ============================================

const getStatusBadgeColor = (status: OrderStatus | DeliveryStatus): string => {
  switch (status) {
    case 'PENDING_APPROVAL':
      return 'bg-yellow-100 text-yellow-800';
    case 'APPROVED':
      return 'bg-green-100 text-green-800';
    case 'REJECTED':
      return 'bg-red-100 text-red-800';
    case 'PLACED':
    case 'READY':
      return 'bg-blue-100 text-blue-800';
    case 'COOKING':
      return 'bg-orange-100 text-orange-800';
    case 'SHIPPING':
      return 'bg-purple-100 text-purple-800';
    case 'DELIVERED':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const AdminOrderPage: React.FC = () => {
  const { user, isAuthenticated, validateToken } = useAuthStore();
  const [orders, setOrders] = useState<OrderResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchOrderNumber, setSearchOrderNumber] = useState('');
  const [searchUsername, setSearchUsername] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderResponseDto | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 재고 관리 상태
  const [menuItems, setMenuItems] = useState<MenuItemResponseDto[]>([]);
  const [stockInputs, setStockInputs] = useState<Record<string, string>>({});
  const [stockLoading, setStockLoading] = useState(false);
  const [showStockSection, setShowStockSection] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // 최신 주문 50개 조회 (백엔드에서 시간순으로 정렬되어 반환됨)
      const response = await apiClient.get<OrderResponseDto[]>('/orders/admin/all');
      setOrders(response.data || []);
    } catch (err: any) {
      console.error('주문 목록 로딩 실패:', err);
      if (err.response?.status === 401) {
        setError('인증이 필요합니다. 다시 로그인해주세요.');
      } else if (err.response?.status === 403) {
        setError('관리자 권한이 필요합니다.');
      } else {
        const errorMessage = err.response?.data?.message || err.message || '알 수 없는 오류';
        setError(`주문 목록을 불러오는데 실패했습니다: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 재고 목록 조회
  const fetchMenuItems = useCallback(async () => {
    try {
      setStockLoading(true);
      const response = await apiClient.get<MenuItemResponseDto[]>('/menu-items/getAllMenuItems');
      setMenuItems(response.data || []);
      // 입력 필드 초기화
      const inputs: Record<string, string> = {};
      response.data.forEach(item => {
        inputs[item.id] = '';
      });
      setStockInputs(inputs);
    } catch (err: any) {
      console.error('메뉴 아이템 로딩 실패:', err);
    } finally {
      setStockLoading(false);
    }
  }, []);

  // 재고 수정
  const handleUpdateStock = async (menuItem: MenuItemResponseDto) => {
    const inputValue = stockInputs[menuItem.id];
    if (!inputValue || inputValue.trim() === '') {
      alert('입고할 수량을 입력해주세요.');
      return;
    }

    const displayValue = parseFloat(inputValue);
    if (isNaN(displayValue) || displayValue < 0) {
      alert('올바른 숫자를 입력해주세요.');
      return;
    }

    // 표시 단위를 DB stock 단위로 변환
    const stockValue = displayToStock(menuItem, displayValue);

    try {
      setStockLoading(true);
      await apiClient.patch(`/admin/menu-items/${menuItem.id}/stock`, { stock: stockValue });
      alert(`${getMenuItemLabel(menuItem)} 재고가 ${displayValue}${getDisplayUnit(menuItem)}(으)로 수정되었습니다.`);
      // 입력 필드 초기화
      setStockInputs(prev => ({ ...prev, [menuItem.id]: '' }));
      // 재고 목록 새로고침
      await fetchMenuItems();
    } catch (err: any) {
      console.error('재고 수정 실패:', err);
      const errorMessage = err.response?.data?.message || '재고 수정에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setStockLoading(false);
    }
  };

  useEffect(() => {
    // 관리자 권한 확인
    if (user?.authority !== 'ROLE_ADMIN') {
      setError('관리자 권한이 필요합니다.');
      setIsLoading(false);
      return;
    }

    // 토큰 검증 후 주문 목록 로드
    const initialize = async () => {
      try {
        if (!isAuthenticated) {
          await validateToken();
        }
        await fetchOrders();
        await fetchMenuItems();
      } catch (err) {
        setError('인증에 실패했습니다. 다시 로그인해주세요.');
        setIsLoading(false);
      }
    };

    initialize();
  }, [user, isAuthenticated, validateToken, fetchOrders, fetchMenuItems]);

  const handleSearch = async () => {
    // 검색어가 없으면 기본 목록으로 복귀
    if (!searchOrderNumber.trim() && !searchUsername.trim()) {
      fetchOrders();
      setSearchOrderNumber('');
      setSearchUsername('');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const params: { orderNumber?: string; username?: string } = {};
      if (searchOrderNumber.trim()) {
        params.orderNumber = searchOrderNumber.trim();
      }
      if (searchUsername.trim()) {
        params.username = searchUsername.trim();
      }

      const response = await apiClient.get<OrderResponseDto[]>('/orders/admin/search', { params });
      setOrders(response.data);
    } catch (err: any) {
      console.error('주문 검색 실패:', err);
      setError('주문 검색에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (orderId: string) => {
    try {
      setIsProcessing(true);
      const request: ApproveOrderRequest = {
        approved: true,
      };
      await apiClient.post(`/orders/admin/${orderId}/approve`, request);
      alert('주문이 승인되었습니다.');
      setShowApprovalModal(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (err: any) {
      console.error('주문 승인 실패:', err);
      const errorMessage = err.response?.data?.message || '주문 승인에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('거절 사유를 입력해주세요.');
      return;
    }

    if (!selectedOrder) return;

    try {
      setIsProcessing(true);
      const request: ApproveOrderRequest = {
        approved: false,
        rejectionReason: rejectionReason,
      };
      await apiClient.post(`/orders/admin/${selectedOrder.id}/approve`, request);
      alert('주문이 거절되었습니다.');
      setShowRejectionModal(false);
      setSelectedOrder(null);
      setRejectionReason('');
      fetchOrders();
    } catch (err: any) {
      console.error('주문 거절 실패:', err);
      const errorMessage = err.response?.data?.message || '주문 거절에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateDeliveryStatus = async (orderId: string, deliveryStatus: DeliveryStatus) => {
    try {
      setIsProcessing(true);
      const request: UpdateDeliveryStatusRequest = { deliveryStatus };
      await apiClient.patch(`/orders/admin/${orderId}/delivery-status`, request);
      alert('배송 상태가 변경되었습니다.');
      fetchOrders();
    } catch (err: any) {
      console.error('배송 상태 변경 실패:', err);
      
      // 401 에러 처리
      if (err.response?.status === 401) {
        alert(
          '인증이 만료되었습니다.\n' +
          '다시 로그인한 후 시도해주세요.'
        );
        // 로그아웃 처리
        localStorage.removeItem('accessToken');
        localStorage.removeItem('mr-daebak-auth');
        window.location.href = '/login';
        return;
      }
      
      const errorMessage = err.response?.data?.message || '배송 상태 변경에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">주문 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchOrders}
          className="text-green-600 hover:underline"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // 모든 주문을 시간순으로 정렬 (최신순)
  const sortedOrders = [...orders].sort((a, b) => 
    new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime()
  );

  const pendingOrders = sortedOrders.filter((o) => o.orderStatus === 'PENDING_APPROVAL');
  // PLACED와 APPROVED를 통합하여 "진행 중 주문"으로 표시
  const activeOrders = sortedOrders.filter((o) => 
    o.orderStatus === 'PLACED' || o.orderStatus === 'APPROVED'
  );
  const rejectedOrders = sortedOrders.filter((o) => o.orderStatus === 'REJECTED');

  return (
    <div className="max-w-6xl mx-auto p-4 pt-10 pb-20">
      <h1 className="text-2xl font-bold mb-6">관리자 주문 관리</h1>

      {/* 재고 관리 섹션 */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <button
          onClick={() => setShowStockSection(!showStockSection)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">📦</span>
            <h2 className="text-lg font-bold text-gray-900">재고 관리</h2>
          </div>
          <span className="text-gray-400 text-xl">
            {showStockSection ? '▲' : '▼'}
          </span>
        </button>

        {showStockSection && (
          <div className="p-4 border-t">
            {stockLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {menuItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">재고 정보가 없습니다.</p>
                ) : (
                  <div className="grid gap-3">
                    {/* 헤더 */}
                    <div className="grid grid-cols-4 gap-3 px-3 py-2 bg-gray-100 rounded-lg font-medium text-sm text-gray-600">
                      <div>품목</div>
                      <div className="text-center">현재 재고</div>
                      <div className="text-center">새 재고 입력</div>
                      <div className="text-center">적용</div>
                    </div>

                    {/* 재고 목록 */}
                    {menuItems.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-4 gap-3 items-center px-3 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="font-medium text-gray-900">
                          {getMenuItemLabel(item)}
                        </div>
                        <div className="text-center">
                          <span className="text-lg font-bold text-green-600">
                            {stockToDisplay(item).toLocaleString()}
                          </span>
                          <span className="text-sm text-gray-500 ml-1">
                            {getDisplayUnit(item)}
                          </span>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            value={stockInputs[item.id] || ''}
                            onChange={(e) => setStockInputs(prev => ({
                              ...prev,
                              [item.id]: e.target.value
                            }))}
                            placeholder="0"
                            min="0"
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                          <span className="text-sm text-gray-500">
                            {getDisplayUnit(item)}
                          </span>
                        </div>
                        <div className="text-center">
                          <button
                            onClick={() => handleUpdateStock(item)}
                            disabled={stockLoading || !stockInputs[item.id]}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg font-medium hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            적용
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 새로고침 버튼 */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={fetchMenuItems}
                    disabled={stockLoading}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
                  >
                    🔄 새로고침
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 전체 주문 통계 */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-500">전체 주문</p>
            <p className="text-2xl font-bold text-gray-900">{sortedOrders.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">승인 대기</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingOrders.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">진행 중</p>
            <p className="text-2xl font-bold text-green-600">{activeOrders.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">거절됨</p>
            <p className="text-2xl font-bold text-red-600">{rejectedOrders.length}</p>
          </div>
        </div>
      </div>

      {/* 검색 */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={searchOrderNumber}
              onChange={(e) => setSearchOrderNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="주문 번호로 검색..."
              className="flex-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <input
              type="text"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="사용자 아이디로 검색..."
              className="flex-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSearch}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-all"
            >
              검색
            </button>
            {(searchOrderNumber.trim() || searchUsername.trim()) && (
              <button
                onClick={() => {
                  setSearchOrderNumber('');
                  setSearchUsername('');
                  fetchOrders();
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-all"
              >
                초기화
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 승인 대기 주문 */}
      {pendingOrders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-yellow-600 mb-4">
            승인 대기 ({pendingOrders.length})
          </h2>
          <div className="space-y-4">
            {pendingOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-sm border-2 border-yellow-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      주문 번호: {order.orderNumber}
                    </h3>
                    <p className="text-sm text-gray-500">
                      주문일시: {formatDate(order.orderedAt)}
                    </p>
                    {order.username && (
                      <p className="text-sm text-gray-500">
                        사용자: {order.username}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      총 금액: ₩{order.grandTotal.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowApprovalModal(true);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowRejectionModal(true);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all"
                    >
                      거절
                    </button>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-700 mb-2">주문 상품</h4>
                  <div className="space-y-2">
                    {/* 디너 상품 */}
                    {order.items
                      .filter(item => !item.productType || item.productType === 'DINNER_PRODUCT')
                      .map((item, index) => (
                        <div key={index} className="text-sm text-gray-600">
                          {item.productName} × {item.quantity}개
                        </div>
                      ))}
                    {/* 추가 메뉴 */}
                    {order.items.filter(item => item.productType === 'ADDITIONAL_MENU_PRODUCT').length > 0 && (
                      <div className="mt-2 pt-2 border-t border-dashed border-gray-300">
                        <p className="text-xs font-semibold text-blue-700 mb-1">추가 메뉴:</p>
                        {order.items
                          .filter(item => item.productType === 'ADDITIONAL_MENU_PRODUCT')
                          .map((item, index) => (
                            <div key={index} className="text-sm text-blue-600">
                              {item.productName.replace('추가 메뉴: ', '')} × {item.quantity}개
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 진행 중 주문 (PLACED + APPROVED) */}
      {activeOrders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-green-600 mb-4">
            진행 중 주문 ({activeOrders.length})
          </h2>
          <div className="space-y-4">
            {activeOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      주문 번호: {order.orderNumber}
                    </h3>
                    <p className="text-sm text-gray-500">
                      주문일시: {formatDate(order.orderedAt)}
                    </p>
                    {order.username && (
                      <p className="text-sm text-gray-500">
                        사용자: {order.username}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                          order.orderStatus
                        )}`}
                      >
                        {order.orderStatus}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                          order.deliveryStatus
                        )}`}
                      >
                        {order.deliveryStatus}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {order.deliveryStatus === 'READY' && (
                      <button
                        onClick={() => handleUpdateDeliveryStatus(order.id, 'COOKING')}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-all disabled:opacity-50"
                      >
                        조리 시작
                      </button>
                    )}
                    {order.deliveryStatus === 'COOKING' && (
                      <button
                        onClick={() => handleUpdateDeliveryStatus(order.id, 'SHIPPING')}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-all disabled:opacity-50"
                      >
                        배달 시작
                      </button>
                    )}
                    {order.deliveryStatus === 'SHIPPING' && (
                      <button
                        onClick={() => handleUpdateDeliveryStatus(order.id, 'DELIVERED')}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all disabled:opacity-50"
                      >
                        배달 완료
                      </button>
                    )}
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-700 mb-2">주문 상품</h4>
                  <div className="space-y-2">
                    {/* 디너 상품 */}
                    {order.items
                      .filter(item => !item.productType || item.productType === 'DINNER_PRODUCT')
                      .map((item, index) => (
                        <div key={index} className="text-sm text-gray-600">
                          {item.productName} × {item.quantity}개 - ₩{item.lineTotal.toLocaleString()}
                        </div>
                      ))}
                    {/* 추가 메뉴 */}
                    {order.items.filter(item => item.productType === 'ADDITIONAL_MENU_PRODUCT').length > 0 && (
                      <div className="mt-2 pt-2 border-t border-dashed border-gray-300">
                        <p className="text-xs font-semibold text-blue-700 mb-1">추가 메뉴:</p>
                        {order.items
                          .filter(item => item.productType === 'ADDITIONAL_MENU_PRODUCT')
                          .map((item, index) => (
                            <div key={index} className="text-sm text-blue-600">
                              {item.productName.replace('추가 메뉴: ', '')} × {item.quantity}개 - ₩{item.lineTotal.toLocaleString()}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  <p className="text-right mt-4 font-bold text-lg">
                    총 금액: ₩{order.grandTotal.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 거절된 주문 */}
      {rejectedOrders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-red-600 mb-4">
            거절된 주문 ({rejectedOrders.length})
          </h2>
          <div className="space-y-4">
            {rejectedOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-sm border-2 border-red-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      주문 번호: {order.orderNumber}
                    </h3>
                    <p className="text-sm text-gray-500">
                      주문일시: {formatDate(order.orderedAt)}
                    </p>
                    {order.username && (
                      <p className="text-sm text-gray-500">
                        사용자: {order.username}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                          order.orderStatus
                        )}`}
                      >
                        {order.orderStatus}
                      </span>
                    </div>
                    {order.rejectionReason && (
                      <p className="text-sm text-red-600 mt-2">
                        거절 사유: {order.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-700 mb-2">주문 상품</h4>
                  <div className="space-y-2">
                    {/* 디너 상품 */}
                    {order.items
                      .filter(item => !item.productType || item.productType === 'DINNER_PRODUCT')
                      .map((item, index) => (
                        <div key={index} className="text-sm text-gray-600">
                          {item.productName} × {item.quantity}개 - ₩{item.lineTotal.toLocaleString()}
                        </div>
                      ))}
                    {/* 추가 메뉴 */}
                    {order.items.filter(item => item.productType === 'ADDITIONAL_MENU_PRODUCT').length > 0 && (
                      <div className="mt-2 pt-2 border-t border-dashed border-gray-300">
                        <p className="text-xs font-semibold text-blue-700 mb-1">추가 메뉴:</p>
                        {order.items
                          .filter(item => item.productType === 'ADDITIONAL_MENU_PRODUCT')
                          .map((item, index) => (
                            <div key={index} className="text-sm text-blue-600">
                              {item.productName.replace('추가 메뉴: ', '')} × {item.quantity}개 - ₩{item.lineTotal.toLocaleString()}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  <p className="text-right mt-4 font-bold text-lg">
                    총 금액: ₩{order.grandTotal.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 승인 모달 */}
      {showApprovalModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">주문 승인</h3>
            <p className="text-gray-600 mb-6">
              주문 번호 <strong>{selectedOrder.orderNumber}</strong>를 승인하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedOrder(null);
                }}
                className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-all"
              >
                취소
              </button>
              <button
                onClick={() => handleApprove(selectedOrder.id)}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition-all disabled:opacity-50"
              >
                {isProcessing ? '처리 중...' : '승인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 거절 모달 */}
      {showRejectionModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">주문 거절</h3>
            <p className="text-gray-600 mb-4">
              주문 번호 <strong>{selectedOrder.orderNumber}</strong>를 거절하시겠습니까?
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="거절 사유를 입력해주세요..."
              className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
              rows={4}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setSelectedOrder(null);
                  setRejectionReason('');
                }}
                className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-all"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {isProcessing ? '처리 중...' : '거절'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

