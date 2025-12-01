import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import {
  UpdateUserProfileRequest,
  PaymentMethodDto,
  AddPaymentMethodRequest,
} from '../../types/api';

// ============================================
// MyPage 컴포넌트
// ============================================
// 역할: 회원정보 조회/수정 및 결제수단 관리
// API (예정):
//   - GET /api/users/me - 내 정보 조회
//   - PATCH /api/users/me - 내 정보 수정
//   - GET /api/users/me/payment-methods - 결제수단 목록
//   - POST /api/users/me/payment-methods - 결제수단 추가
//   - DELETE /api/users/me/payment-methods/{id} - 결제수단 삭제
// ============================================

// 카드 타입 감지 함수
const detectCardType = (cardNumber: string): PaymentMethodDto['cardType'] => {
  const num = cardNumber.replace(/\s/g, '');
  if (/^4/.test(num)) return 'VISA';
  if (/^5[1-5]/.test(num)) return 'MASTERCARD';
  if (/^3[47]/.test(num)) return 'AMEX';
  return 'OTHER';
};

// 카드 번호 포맷팅 함수
const formatCardNumber = (value: string): string => {
  const num = value.replace(/\D/g, '').slice(0, 16);
  return num.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
};

// 만료일 포맷팅 함수
const formatExpiryDate = (value: string): string => {
  const num = value.replace(/\D/g, '').slice(0, 4);
  if (num.length >= 2) {
    return num.slice(0, 2) + '/' + num.slice(2);
  }
  return num;
};

export const MyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // ----------------------------------------
  // 상태 관리: 회원정보
  // ----------------------------------------
  const [profileForm, setProfileForm] = useState<UpdateUserProfileRequest>({
    displayName: '',
    phoneNumber: '',
    address: '',
    email: '',
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // ----------------------------------------
  // 상태 관리: 결제수단
  // ----------------------------------------
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodDto[]>([]);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState<AddPaymentMethodRequest>({
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: '',
    isDefault: false,
  });
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // ----------------------------------------
  // 초기 데이터 로드
  // ----------------------------------------
  useEffect(() => {
    if (user) {
      setProfileForm({
        displayName: user.displayName || '',
        phoneNumber: user.phoneNumber || '',
        address: user.address || '',
        email: user.email || '',
      });
    }

    // TODO: 결제수단 목록 API 호출
    // const fetchPaymentMethods = async () => {
    //   const response = await apiClient.get<PaymentMethodDto[]>('/users/me/payment-methods');
    //   setPaymentMethods(response.data);
    // };
    // fetchPaymentMethods();
  }, [user]);

  // ----------------------------------------
  // 핸들러: 회원정보 수정
  // ----------------------------------------
  const handleProfileChange = (field: keyof UpdateUserProfileRequest, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      // TODO: 백엔드 API 추가 후 활성화
      // await apiClient.patch('/users/me', profileForm);
      console.log('프로필 저장 예정:', profileForm);

      // 임시: 성공 메시지
      alert('회원정보가 저장되었습니다. (백엔드 API 연동 후 실제 저장됩니다)');
      setIsEditingProfile(false);
    } catch (err) {
      console.error('프로필 저장 실패:', err);
      alert('저장에 실패했습니다.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    // 원래 값으로 복원
    if (user) {
      setProfileForm({
        displayName: user.displayName || '',
        phoneNumber: user.phoneNumber || '',
        address: user.address || '',
        email: user.email || '',
      });
    }
    setIsEditingProfile(false);
  };

  // ----------------------------------------
  // 핸들러: 결제수단 관리
  // ----------------------------------------
  const handlePaymentFormChange = (field: keyof AddPaymentMethodRequest, value: string | boolean) => {
    if (field === 'cardNumber' && typeof value === 'string') {
      value = formatCardNumber(value);
    }
    if (field === 'expiryDate' && typeof value === 'string') {
      value = formatExpiryDate(value);
    }
    if (field === 'cvv' && typeof value === 'string') {
      value = value.replace(/\D/g, '').slice(0, 4);
    }
    setPaymentForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddPaymentMethod = async () => {
    // 유효성 검사
    if (paymentForm.cardNumber.replace(/\s/g, '').length < 15) {
      alert('올바른 카드번호를 입력해주세요.');
      return;
    }
    if (!paymentForm.cardHolder.trim()) {
      alert('카드 소유자명을 입력해주세요.');
      return;
    }
    if (paymentForm.expiryDate.length < 5) {
      alert('올바른 만료일을 입력해주세요.');
      return;
    }
    if (paymentForm.cvv.length < 3) {
      alert('올바른 CVV를 입력해주세요.');
      return;
    }

    setIsSavingPayment(true);
    try {
      // TODO: 백엔드 API 추가 후 활성화
      // const response = await apiClient.post<PaymentMethodDto>('/users/me/payment-methods', paymentForm);
      // setPaymentMethods((prev) => [...prev, response.data]);

      // 임시: 로컬에 추가
      const newMethod: PaymentMethodDto = {
        id: Date.now().toString(),
        cardNumber: '**** **** **** ' + paymentForm.cardNumber.slice(-4),
        cardHolder: paymentForm.cardHolder,
        expiryDate: paymentForm.expiryDate,
        cardType: detectCardType(paymentForm.cardNumber),
        isDefault: paymentMethods.length === 0 || paymentForm.isDefault || false,
        createdAt: new Date().toISOString(),
      };
      setPaymentMethods((prev) => [...prev, newMethod]);

      // 폼 초기화
      setPaymentForm({
        cardNumber: '',
        cardHolder: '',
        expiryDate: '',
        cvv: '',
        isDefault: false,
      });
      setIsAddingPayment(false);
      alert('결제수단이 추가되었습니다. (백엔드 API 연동 후 실제 저장됩니다)');
    } catch (err) {
      console.error('결제수단 추가 실패:', err);
      alert('결제수단 추가에 실패했습니다.');
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleDeletePaymentMethod = async (methodId: string) => {
    if (!window.confirm('이 결제수단을 삭제하시겠습니까?')) return;

    try {
      // TODO: 백엔드 API 추가 후 활성화
      // await apiClient.delete(`/users/me/payment-methods/${methodId}`);
      setPaymentMethods((prev) => prev.filter((m) => m.id !== methodId));
      alert('결제수단이 삭제되었습니다.');
    } catch (err) {
      console.error('결제수단 삭제 실패:', err);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleSetDefaultPayment = async (methodId: string) => {
    try {
      // TODO: 백엔드 API 추가 후 활성화
      // await apiClient.patch(`/users/me/payment-methods/${methodId}/default`);
      setPaymentMethods((prev) =>
        prev.map((m) => ({ ...m, isDefault: m.id === methodId }))
      );
    } catch (err) {
      console.error('기본 결제수단 설정 실패:', err);
    }
  };

  // ----------------------------------------
  // 카드 타입별 아이콘
  // ----------------------------------------
  const getCardIcon = (cardType: PaymentMethodDto['cardType']) => {
    switch (cardType) {
      case 'VISA':
        return '💳';
      case 'MASTERCARD':
        return '💳';
      case 'AMEX':
        return '💳';
      default:
        return '💳';
    }
  };

  // ----------------------------------------
  // 렌더링
  // ----------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-2"
          >
            ← 뒤로가기
          </button>
          <h1 className="text-3xl font-bold text-gray-900">마이페이지</h1>
          <p className="text-gray-500 mt-2">회원정보 및 결제수단을 관리하세요</p>
        </div>

        {/* ============================================ */}
        {/* 섹션 1: 회원정보 */}
        {/* ============================================ */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>👤</span> 회원정보
            </h2>
            {!isEditingProfile ? (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="text-green-600 hover:text-green-700 font-medium"
              >
                수정
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-500 hover:text-gray-700 font-medium"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  className="text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                >
                  {isSavingProfile ? '저장 중...' : '저장'}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* 아이디 (수정 불가) */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                아이디
              </label>
              <p className="text-gray-900 font-medium">{user?.username}</p>
            </div>

            {/* 이름 */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                이름
              </label>
              {isEditingProfile ? (
                <input
                  type="text"
                  value={profileForm.displayName}
                  onChange={(e) => handleProfileChange('displayName', e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900 font-medium">{user?.displayName || '-'}</p>
              )}
            </div>

            {/* 이메일 */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                이메일
              </label>
              {isEditingProfile ? (
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => handleProfileChange('email', e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900 font-medium">{user?.email || '-'}</p>
              )}
            </div>

            {/* 전화번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                전화번호
              </label>
              {isEditingProfile ? (
                <input
                  type="tel"
                  value={profileForm.phoneNumber}
                  onChange={(e) => handleProfileChange('phoneNumber', e.target.value)}
                  placeholder="010-1234-5678"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900 font-medium">{user?.phoneNumber || '-'}</p>
              )}
            </div>

            {/* 주소 */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                주소
              </label>
              {isEditingProfile ? (
                <input
                  type="text"
                  value={profileForm.address}
                  onChange={(e) => handleProfileChange('address', e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900 font-medium">{user?.address || '-'}</p>
              )}
            </div>

            {/* 추가 정보 (읽기 전용) */}
            <div className="pt-4 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    등급
                  </label>
                  <p className="text-gray-900 font-medium">
                    {user?.loyaltyLevel || 'BRONZE'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    방문 횟수
                  </label>
                  <p className="text-gray-900 font-medium">
                    {user?.visitCount || 0}회
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* 섹션 2: 결제수단 관리 */}
        {/* ============================================ */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>💳</span> 결제수단
            </h2>
            {!isAddingPayment && (
              <button
                onClick={() => setIsAddingPayment(true)}
                className="text-green-600 hover:text-green-700 font-medium"
              >
                + 추가
              </button>
            )}
          </div>

          {/* 결제수단 목록 */}
          {paymentMethods.length > 0 ? (
            <div className="space-y-3 mb-4">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`p-4 rounded-xl border-2 ${
                    method.isDefault
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getCardIcon(method.cardType)}</span>
                      <div>
                        <p className="font-medium text-gray-900">
                          {method.cardNumber}
                          {method.isDefault && (
                            <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                              기본
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          {method.cardHolder} · 만료 {method.expiryDate}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!method.isDefault && (
                        <button
                          onClick={() => handleSetDefaultPayment(method.id)}
                          className="text-sm text-gray-500 hover:text-green-600"
                        >
                          기본 설정
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePaymentMethod(method.id)}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !isAddingPayment && (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-2">등록된 결제수단이 없습니다.</p>
                <button
                  onClick={() => setIsAddingPayment(true)}
                  className="text-green-600 hover:underline"
                >
                  결제수단 추가하기
                </button>
              </div>
            )
          )}

          {/* 결제수단 추가 폼 */}
          {isAddingPayment && (
            <div className="border-t border-gray-100 pt-4 mt-4">
              <h3 className="font-medium text-gray-900 mb-4">새 결제수단 추가</h3>
              <div className="space-y-4">
                {/* 카드 번호 */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    카드 번호
                  </label>
                  <input
                    type="text"
                    value={paymentForm.cardNumber}
                    onChange={(e) => handlePaymentFormChange('cardNumber', e.target.value)}
                    placeholder="1234 5678 9012 3456"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* 카드 소유자명 */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    카드 소유자명
                  </label>
                  <input
                    type="text"
                    value={paymentForm.cardHolder}
                    onChange={(e) => handlePaymentFormChange('cardHolder', e.target.value)}
                    placeholder="홍길동"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* 만료일 & CVV */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      만료일
                    </label>
                    <input
                      type="text"
                      value={paymentForm.expiryDate}
                      onChange={(e) => handlePaymentFormChange('expiryDate', e.target.value)}
                      placeholder="MM/YY"
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      CVV
                    </label>
                    <input
                      type="password"
                      value={paymentForm.cvv}
                      onChange={(e) => handlePaymentFormChange('cvv', e.target.value)}
                      placeholder="123"
                      maxLength={4}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* 기본 결제수단 설정 */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentForm.isDefault}
                    onChange={(e) => handlePaymentFormChange('isDefault', e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-600">기본 결제수단으로 설정</span>
                </label>

                {/* 버튼 */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setIsAddingPayment(false);
                      setPaymentForm({
                        cardNumber: '',
                        cardHolder: '',
                        expiryDate: '',
                        cvv: '',
                        isDefault: false,
                      });
                    }}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-all"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleAddPaymentMethod}
                    disabled={isSavingPayment}
                    className="flex-1 py-3 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition-all disabled:opacity-50"
                  >
                    {isSavingPayment ? '추가 중...' : '추가하기'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
