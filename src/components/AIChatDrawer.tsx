import React from 'react';
import { useUIStore } from '../stores/useUIStore';

export const AIChatDrawer: React.FC = () => {
  const { isAIChatOpen, closeAIChat } = useUIStore();

  return (
    <>
      {/* 1. 배경 어둡게 처리 (선택사항) */}
      {isAIChatOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeAIChat}
        />
      )}

      {/* 2. 슬라이드 사이드바 */}
      <div className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
        isAIChatOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* 헤더 */}
          <div className="p-4 bg-green-600 text-white flex justify-between items-center">
            <h2 className="font-bold text-lg">AI 음성 주문 🤖</h2>
            <button onClick={closeAIChat} className="text-2xl">&times;</button>
          </div>

          {/* 채팅 영역 (스크롤) */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
            <div className="text-center text-gray-500 mt-10">
              <p>무엇을 도와드릴까요?</p>
              <p className="text-sm">"발렌타인 디너 하나 담아줘"</p>
            </div>
          </div>

          {/* 입력 영역 (마이크 + 텍스트) */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <button className="p-3 bg-red-500 text-white rounded-full shadow hover:bg-red-600">
                🎤 {/* 마이크 아이콘 */}
              </button>
              <input 
                type="text" 
                placeholder="메시지 입력..." 
                className="flex-1 border rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button className="px-4 bg-green-600 text-white rounded-lg">전송</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};