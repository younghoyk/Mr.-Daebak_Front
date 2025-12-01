import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../lib/axios';
import { useOrderFlowStore } from '../../../stores/useOrderFlowStore';
import { useCartStore } from '../../../stores/useCartStore';

// ============================================
// CheckoutStep 컴포넌트
// ============================================
// 역할: 5단계 - 주문 확인 및 결제 처리
// API:
//   - POST /api/products/createProduct - 상품 생성
//   - POST /api/carts/createCart - 장바구니 생성
//   - POST /api/carts/{cartId}/checkout - 결제 처리
// ============================================

export const CheckoutStep: React.FC = () => {
  const navigate = useNavigate();

  // ----------------------------------------
  // Store에서 상태 가져오기
  // ----------------------------------------
  const {
    selectedAddress,
    selectedDinner,
    selectedStyle,
    quantity,
    memo,
    getTotalPrice,
    resetOrder,
    prevStep,
  } = useOrderFlowStore();

  const { clearCart } = useCartStore();

  // ----------------------------------------
  // 로컬 상태
  // ----------------------------------------
  const [isProcessing, setIsProcessing] = useState(false);

  // ----------------------------------------
  // 결제 처리 핸들러
  // ----------------------------------------
  const handleCheckout = async () => {
    if (!selectedDinner || !selectedStyle) return;

    setIsProcessing(true);

    try {
      // Step 1: Product 생성
      const productResponse = await apiClient.post('/products/createProduct', {
        dinnerId: selectedDinner.id,
        servingStyleId: selectedStyle.id,
        quantity,
        memo,
        productName: `${selectedDinner.dinnerName} (${selectedStyle.styleName})`,
      });

      const product = productResponse.data;

      // Step 2: Cart 생성
      const cartResponse = await apiClient.post('/carts/createCart', {
        items: [{ productId: product.id, quantity: 1 }],
        deliveryAddress: selectedAddress,
        deliveryMethod: 'Delivery',
        memo,
      });

      // Step 3: Checkout
      await apiClient.post(`/carts/${cartResponse.data.id}/checkout`);

      // Step 4: 성공 처리
      alert(
        `주문이 완료되었습니다!\n\n` +
          `주문 내용: ${selectedDinner.dinnerName} (${selectedStyle.styleName})\n` +
          `수량: ${quantity}개\n` +
          `총 금액: ₩${getTotalPrice().toLocaleString()}\n` +
          `배달 주소: ${selectedAddress}`
      );

      // Step 5: 초기화 및 메인으로 이동
      resetOrder();
      clearCart();
      navigate('/');
    } catch (err) {
      console.error('결제 실패:', err);
      alert('결제 처리에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ----------------------------------------
  // 렌더링
  // ----------------------------------------
  return (
    <div className="max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          주문 <span className="text-green-600">확인</span>
        </h2>
        <p className="text-gray-500">주문 내용을 확인해주세요</p>
      </div>

      {/* 주문 요약 카드 */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 space-y-6">
        {/* ---------------------------------------- */}
        {/* 배달 주소 */}
        {/* ---------------------------------------- */}
        <div className="flex items-start gap-4">
          <span className="text-2xl">📍</span>
          <div>
            <p className="text-sm text-gray-500">배달 주소</p>
            <p className="font-bold">{selectedAddress}</p>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* ---------------------------------------- */}
        {/* 디너 정보 */}
        {/* ---------------------------------------- */}
        <div className="flex items-start gap-4">
          <span className="text-2xl">🍽️</span>
          <div className="flex-1">
            <p className="text-sm text-gray-500">주문 메뉴</p>
            <p className="font-bold">{selectedDinner?.dinnerName}</p>
            <p className="text-sm text-gray-500">{selectedStyle?.styleName} 스타일</p>
            <p className="text-sm text-gray-500">수량: {quantity}개</p>
          </div>
        </div>

        {/* ---------------------------------------- */}
        {/* 요청사항 (있는 경우만) */}
        {/* ---------------------------------------- */}
        {memo && (
          <>
            <hr className="border-gray-100" />
            <div className="flex items-start gap-4">
              <span className="text-2xl">📝</span>
              <div>
                <p className="text-sm text-gray-500">요청사항</p>
                <p className="font-medium">{memo}</p>
              </div>
            </div>
          </>
        )}

        <hr className="border-gray-100" />

        {/* ---------------------------------------- */}
        {/* 결제 금액 */}
        {/* ---------------------------------------- */}
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold">총 결제 금액</p>
          <p className="text-2xl font-bold text-green-600">
            ₩{getTotalPrice().toLocaleString()}
          </p>
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="flex gap-4">
        <button
          onClick={prevStep}
          disabled={isProcessing}
          className="flex-1 py-4 rounded-xl text-lg font-bold border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          이전
        </button>
        <button
          onClick={handleCheckout}
          disabled={isProcessing}
          className="flex-1 py-4 rounded-xl text-lg font-bold bg-green-600 text-white hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? '처리 중...' : `₩${getTotalPrice().toLocaleString()} 결제하기`}
        </button>
      </div>
    </div>
  );
};
