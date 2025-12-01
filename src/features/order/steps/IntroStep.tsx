import React from 'react';
import { useOrderFlowStore } from '../../../stores/useOrderFlowStore';

// ============================================
// IntroStep 컴포넌트
// ============================================
// 역할: 미스터 대박 소개 및 주문 시작 화면
// ============================================

export const IntroStep: React.FC = () => {
  const { nextStep } = useOrderFlowStore();

  return (
    <div className="max-w-4xl mx-auto text-center">
      {/* 히어로 섹션 */}
      <div className="mb-12">
        {/* 로고/이모지 */}
        <div className="text-8xl mb-6">🍽️</div>

        {/* 타이틀 */}
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
          Mr. <span className="text-green-600">DAEBAK</span>
        </h1>

        {/* 슬로건 */}
        <p className="text-xl sm:text-2xl text-gray-600 font-medium mb-8">
          "특별한 날에 집에서 편안히 보내면서
          <br />
          <span className="text-green-600">당신의 소중한 사람</span>을 감동시켜라"
        </p>
      </div>

      {/* 소개 카드 */}
      <div className="bg-white rounded-3xl shadow-xl p-8 mb-10 text-left">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          미스터 대박이란?
        </h2>

        <p className="text-gray-600 leading-relaxed mb-6">
          미스터 대박은 <span className="font-bold text-green-600">훌륭한 디너 만찬</span>을
          고객의 집으로 배달하는 특별한 서비스입니다. 웹사이트에서 배달시간, 장소를 선택하고
          메뉴로부터 디너를 주문하시면 정성스러운 만찬이 배달됩니다.
        </p>

        {/* 디너 종류 소개 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-pink-50 rounded-xl p-4 flex items-start gap-3">
            <span className="text-3xl">💝</span>
            <div>
              <h3 className="font-bold text-gray-800">발렌타인 디너</h3>
              <p className="text-sm text-gray-600">
                하트 모양과 큐피드가 장식된 접시에 와인과 스테이크
              </p>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
            <span className="text-3xl">🥖</span>
            <div>
              <h3 className="font-bold text-gray-800">프렌치 디너</h3>
              <p className="text-sm text-gray-600">
                커피 한잔, 와인 한잔, 샐러드, 스테이크
              </p>
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-4 flex items-start gap-3">
            <span className="text-3xl">🍳</span>
            <div>
              <h3 className="font-bold text-gray-800">잉글리시 디너</h3>
              <p className="text-sm text-gray-600">
                에그 스크램블, 베이컨, 빵, 스테이크
              </p>
            </div>
          </div>

          <div className="bg-purple-50 rounded-xl p-4 flex items-start gap-3">
            <span className="text-3xl">🍾</span>
            <div>
              <h3 className="font-bold text-gray-800">샴페인 축제 디너</h3>
              <p className="text-sm text-gray-600">
                2인용 - 샴페인, 바게트빵, 커피, 와인, 스테이크
              </p>
            </div>
          </div>
        </div>

        {/* 서빙 스타일 */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="font-bold text-gray-800 mb-3">서빙 스타일 선택 가능</h3>
          <div className="flex flex-wrap gap-3">
            <span className="bg-white px-4 py-2 rounded-full text-sm border border-gray-200">
              🥡 Simple - 플라스틱 용기
            </span>
            <span className="bg-white px-4 py-2 rounded-full text-sm border border-gray-200">
              🍽️ Grand - 도자기 접시, 나무 쟁반
            </span>
            <span className="bg-white px-4 py-2 rounded-full text-sm border border-gray-200">
              ✨ Deluxe - 꽃 장식, 린넨 냅킨, 유리잔
            </span>
          </div>
        </div>
      </div>

      {/* 주문 시작 버튼 */}
      <button
        onClick={nextStep}
        className="w-full sm:w-auto px-12 py-5 bg-green-600 text-white text-xl font-bold rounded-2xl hover:bg-green-700 transition-all transform hover:scale-105 shadow-lg"
      >
        🛒 주문하기
      </button>

      {/* 하단 안내 */}
      <p className="mt-6 text-gray-400 text-sm">
        로그인된 고객님만 주문이 가능합니다
      </p>
    </div>
  );
};
