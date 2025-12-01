import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../lib/axios';
import { useCartStore } from '../../stores/useCartStore';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, clearCart, removeFromCart } = useCartStore();
  const [address, setAddress] = useState('');
  
  // 총 가격 (화면 표시용)
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    if (!address) return alert('배달 주소를 입력해주세요.');

    try {
      // 1. [Cart 생성] Product ID들을 묶어서 장바구니 생성
      const cartPayload = {
        items: items.map(item => ({
          productId: item.productId, // ★ 여기서 ID 사용됨
          quantity: item.quantity
        })),
        deliveryAddress: address,
        deliveryMethod: "Delivery", 
        memo: "안전 배달 부탁드려요",
        // expiresAt 등은 백엔드에서 처리하거나 필요시 추가
      };

      const cartRes = await apiClient.post('/carts/createCart', cartPayload);
      const newCartId = cartRes.data.id;

      // 2. [Checkout] 생성된 장바구니 결제 처리
      await apiClient.post(`/carts/${newCartId}/checkout`);

      // 3. 성공 처리
      alert(`주문이 완료되었습니다!\n주문금액: ${totalAmount.toLocaleString()}원`);
      clearCart(); // 장바구니 비우기
      navigate('/'); // 메인으로

    } catch (error) {
      console.error(error);
      alert('결제 처리에 실패했습니다.');
    }
  };

  if (items.length === 0) {
    return <div className="p-8 text-center text-gray-500">장바구니가 비어있습니다.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pt-10 pb-20">
      <h1 className="text-2xl font-bold mb-6">장바구니</h1>

      {/* 상품 목록 */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        {items.map((item) => (
          <div key={item.productId} className="flex justify-between items-center py-3 border-b last:border-0">
            <div>
              <h3 className="font-bold">{item.productName}</h3>
              <p className="text-sm text-gray-500">{item.styleName} · {item.quantity}개</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold">{item.totalPrice.toLocaleString()}원</span>
              <button 
                onClick={() => removeFromCart(item.productId)}
                className="text-red-500 text-sm underline"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 배달 주소 */}
      <div className="mb-6">
        <label className="block font-bold mb-2">배달 받으실 주소</label>
        <input 
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="주소를 상세히 입력해주세요"
          className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
        />
      </div>

      {/* 결제 버튼 */}
      <button 
        onClick={handleCheckout}
        className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition"
      >
        {totalAmount.toLocaleString()}원 결제하기
      </button>
    </div>
  );
};