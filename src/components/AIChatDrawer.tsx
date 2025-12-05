import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/useUIStore';
import { useOrderFlowStore } from '../stores/useOrderFlowStore';
import apiClient from '../lib/axios';
import {
  VoiceChatRequestDto,
  VoiceChatResponseDto,
  VoiceChatMessageDto,
  VoiceOrderItemDto,
  UiAction,
  OrderFlowState,
} from '../types/api';

// ============================================
// AIChatDrawer 컴포넌트
// ============================================
// 역할: LLM 채팅을 통한 주문 플로우 (GUI와 동일한 구조)
// - 백엔드에서 Product 생성 및 결제 처리
// - 프론트엔드는 UI 표시 및 리디렉션만 담당
// ============================================

export const AIChatDrawer: React.FC = () => {
  const navigate = useNavigate();
  const { isAIChatOpen, closeAIChat } = useUIStore();
  const { resetOrder } = useOrderFlowStore();

  // 채팅 상태
  const [messages, setMessages] = useState<VoiceChatMessageDto[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);

  // 주문 상태 (백엔드에서 관리, 프론트엔드는 표시용)
  const [currentOrder, setCurrentOrder] = useState<VoiceOrderItemDto[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [userAddresses, setUserAddresses] = useState<string[]>([]);
  const [flowState, setFlowState] = useState<OrderFlowState>(OrderFlowState.IDLE);
  const [totalPrice, setTotalPrice] = useState<number>(0);

  // 음성 녹음 관련
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 채팅 스크롤 최하단으로 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 리사이즈 핸들 마우스 이벤트 처리
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.max(400, Math.min(900, newWidth));
      setDrawerWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Drawer 열릴 때 초기화
  useEffect(() => {
    if (isAIChatOpen) {
      // 새로운 대화 시작
      if (messages.length === 0) {
        setMessages([
          {
            role: 'assistant',
            content: '안녕하세요! Mr.Daeback AI입니다. 🍽️\n\n프리미엄 디너 배달 서비스에 오신 것을 환영해요!\n메뉴를 주문하시려면 "발렌타인 디너 주세요" 또는 "메뉴 알려줘"라고 말씀해주세요.',
          },
        ]);
      }
    }
  }, [isAIChatOpen, messages.length]);

  // 음성 녹음 시작
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioMessage(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('음성 녹음 시작 실패:', error);
      alert('마이크 권한이 필요합니다.');
    }
  };

  // 음성 녹음 중지
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 오디오를 Base64로 변환
  const audioToBase64 = (audioBlob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  };

  // 현재 주문을 백엔드 형식으로 변환
  const buildCurrentOrderForRequest = (): VoiceOrderItemDto[] => {
    return currentOrder.map(item => ({
      dinnerId: item.dinnerId,
      dinnerName: item.dinnerName,
      servingStyleId: item.servingStyleId,
      servingStyleName: item.servingStyleName,
      quantity: item.quantity,
      basePrice: item.basePrice,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      productId: item.productId,  // ★ productId 포함 (커스터마이징 유지에 필수!)
    }));
  };

  // 오디오 메시지 전송
  const sendAudioMessage = async (audioBlob: Blob) => {
    try {
      setIsLoading(true);
      const audioBase64 = await audioToBase64(audioBlob);

      // 사용자 메시지 표시 (음성 녹음 중...)
      const userMsg: VoiceChatMessageDto = { role: 'user', content: '🎤 (음성 메시지)' };
      setMessages((prev) => [...prev, userMsg]);

      const request: VoiceChatRequestDto = {
        audioBase64,
        audioFormat: 'webm',
        conversationHistory: messages,
        currentOrder: currentOrder.length > 0 ? buildCurrentOrderForRequest() : undefined,
        selectedAddress,
      };

      await sendChatRequest(request);
    } catch (error) {
      console.error('오디오 전송 실패:', error);
      alert('음성 메시지 전송에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 텍스트 메시지 전송
  const sendTextMessage = async (overrideMessage?: string) => {
    const messageToSend = overrideMessage || inputMessage.trim();
    if (!messageToSend || isLoading) return;

    if (!overrideMessage) {
      setInputMessage('');
    }

    // 사용자 메시지를 대화에 추가
    const userMsg: VoiceChatMessageDto = { role: 'user', content: messageToSend };
    setMessages((prev) => [...prev, userMsg]);

    try {
      setIsLoading(true);

      const request: VoiceChatRequestDto = {
        message: messageToSend,
        conversationHistory: messages,
        currentOrder: currentOrder.length > 0 ? buildCurrentOrderForRequest() : undefined,
        selectedAddress,
      };

      await sendChatRequest(request);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      alert('메시지 전송에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 백엔드 API 호출
  const sendChatRequest = async (request: VoiceChatRequestDto) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('로그인이 필요합니다.');
      closeAIChat();
      navigate('/login');
      return;
    }

    try {
      const response = await apiClient.post<VoiceChatResponseDto>(
        '/voice-order/chat',
        request
      );

      const data = response.data;

      // AI 응답을 대화 히스토리에 추가
      const assistantMsg: VoiceChatMessageDto = {
        role: 'assistant',
        content: data.assistantMessage,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // 백엔드 응답으로 상태 업데이트
      setCurrentOrder(data.currentOrder || []);
      setTotalPrice(Number(data.totalPrice) || 0);
      setFlowState(data.flowState || OrderFlowState.IDLE);

      if (data.selectedAddress) {
        setSelectedAddress(data.selectedAddress);
      }

      if (data.userAddresses) {
        setUserAddresses(data.userAddresses);
      }

      // UI Action 처리
      handleUiAction(data);
    } catch (error: any) {
      console.error('API 호출 실패:', error);
      if (error.response?.status === 401) {
        alert('로그인이 필요합니다.');
        closeAIChat();
        navigate('/login');
      } else {
        const errorMessage = error.response?.data?.message || '메시지 전송에 실패했습니다.';

        // 에러 메시지를 대화에 추가
        const errorMsg: VoiceChatMessageDto = {
          role: 'assistant',
          content: `죄송해요, 문제가 발생했어요: ${errorMessage}`,
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    }
  };

  // UI Action 처리
  const handleUiAction = (data: VoiceChatResponseDto) => {
    switch (data.uiAction) {
      case UiAction.ORDER_COMPLETED:
        // 주문 완료 - 주문 내역 페이지로 리디렉션
        setTimeout(() => {
          resetOrder();
          setMessages([]);
          setCurrentOrder([]);
          setSelectedAddress(null);
          setTotalPrice(0);
          setFlowState(OrderFlowState.IDLE);
          closeAIChat();
          navigate('/orders', { replace: true });
        }, 2000);  // 2초 후 리디렉션 (사용자가 메시지를 읽을 시간)
        break;

      case UiAction.SHOW_CANCEL_CONFIRM:
        // 주문 취소 - 상태 초기화
        setCurrentOrder([]);
        setSelectedAddress(null);
        setTotalPrice(0);
        setFlowState(OrderFlowState.IDLE);
        break;

      case UiAction.SHOW_CONFIRM_MODAL:
      case UiAction.UPDATE_ORDER_LIST:
      case UiAction.REQUEST_ADDRESS:
      case UiAction.NONE:
      default:
        // 기본 처리 - 상태는 이미 업데이트됨
        break;
    }
  };

  // 컴포넌트 닫기 시 초기화
  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    closeAIChat();
  };

  // 플로우 상태 표시
  const getFlowStateLabel = (state: OrderFlowState): string => {
    switch (state) {
      case OrderFlowState.IDLE:
        return '';
      case OrderFlowState.SELECTING_ADDRESS:
        return '📍 주소 선택';
      case OrderFlowState.SELECTING_MENU:
        return '🍽️ 메뉴 선택';
      case OrderFlowState.SELECTING_STYLE:
        return '✨ 스타일 선택';
      case OrderFlowState.SELECTING_QUANTITY:
        return '🔢 수량 선택';
      case OrderFlowState.ASKING_MORE:
        return '➕ 추가 주문?';
      case OrderFlowState.CUSTOMIZING:
        return '🛠️ 커스터마이징';
      case OrderFlowState.READY_TO_CHECKOUT:
        return '💳 결제 준비';
      case OrderFlowState.CONFIRMING:
        return '✅ 결제 진행';
      default:
        return '';
    }
  };

  return (
    <>
      {/* 배경 어둡게 처리 */}
      {isAIChatOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={handleClose}
        />
      )}

      {/* 슬라이드 사이드바 */}
      <div
        className={`fixed top-0 right-0 h-full bg-white shadow-2xl z-50 transform ${
          isResizing ? '' : 'transition-transform duration-300 ease-in-out'
        } ${isAIChatOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ width: `${drawerWidth}px` }}
      >
        {/* 리사이즈 핸들 */}
        <div
          className="absolute left-0 top-0 h-full w-2 cursor-ew-resize z-10 hover:bg-green-200"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
          title="크기 조절"
        />

        <div className="flex flex-col h-full">
          {/* 헤더 */}
          <div className="p-4 bg-green-600 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg">Mr. DAEBAK AI</h2>
                {flowState !== OrderFlowState.IDLE && (
                  <span className="text-xs bg-green-500 px-2 py-0.5 rounded mt-1 inline-block">
                    {getFlowStateLabel(flowState)}
                  </span>
                )}
              </div>
              <button onClick={handleClose} className="text-2xl hover:text-gray-200">
                &times;
              </button>
            </div>
          </div>

          {/* 주문 요약 (장바구니가 있을 때만) */}
          {currentOrder.length > 0 && (
            <div className="p-3 bg-green-50 border-b border-green-100">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-green-800 text-sm">현재 주문</span>
                <span className="font-bold text-green-600">
                  ₩{totalPrice.toLocaleString()}
                </span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {currentOrder.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-gray-600">
                    <span>
                      {item.dinnerName}
                      {item.servingStyleName && ` (${item.servingStyleName})`}
                      {item.quantity > 0 && ` x${item.quantity}`}
                    </span>
                    <span>₩{item.totalPrice.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              {selectedAddress && (
                <div className="mt-2 pt-2 border-t border-green-200 text-xs text-gray-500">
                  📍 {selectedAddress}
                </div>
              )}
            </div>
          )}

          {/* 채팅 영역 */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* 빠른 액션 버튼 (상태에 따라) */}
          {flowState === OrderFlowState.ASKING_MORE && (
            <div className="px-4 py-2 bg-gray-100 border-t border-gray-200">
              <div className="flex gap-2">
                <button
                  onClick={() => sendTextMessage('더 없어요, 결제할게요')}
                  disabled={isLoading}
                  className="flex-1 py-2 px-3 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:bg-gray-300"
                >
                  결제하기
                </button>
                <button
                  onClick={() => sendTextMessage('메뉴 더 볼래요')}
                  disabled={isLoading}
                  className="flex-1 py-2 px-3 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 disabled:bg-gray-100"
                >
                  더 주문하기
                </button>
              </div>
            </div>
          )}

          {flowState === OrderFlowState.READY_TO_CHECKOUT && (
            <div className="px-4 py-2 bg-green-100 border-t border-green-200">
              <div className="flex gap-2">
                <button
                  onClick={() => sendTextMessage('결제 진행해주세요')}
                  disabled={isLoading}
                  className="flex-1 py-2 px-3 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:bg-gray-300"
                >
                  💳 결제 확정
                </button>
                <button
                  onClick={() => sendTextMessage('취소할게요')}
                  disabled={isLoading}
                  className="py-2 px-3 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 disabled:bg-gray-100"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {flowState === OrderFlowState.SELECTING_ADDRESS && userAddresses.length > 0 && (
            <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
              <p className="text-xs text-blue-800 mb-2">저장된 주소:</p>
              <div className="flex flex-wrap gap-2">
                {userAddresses.map((addr, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendTextMessage(`${idx + 1}번 주소로 해주세요`)}
                    disabled={isLoading}
                    className="py-1 px-2 bg-blue-100 text-blue-800 text-xs rounded hover:bg-blue-200 disabled:bg-gray-100"
                  >
                    {idx + 1}. {addr.length > 20 ? addr.substring(0, 20) + '...' : addr}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 입력 영역 */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading}
                className={`p-3 rounded-full shadow transition-colors ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
                title={isRecording ? '녹음 중지' : '음성 녹음'}
              >
                🎤
              </button>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendTextMessage()}
                placeholder="메시지 입력..."
                disabled={isLoading || isRecording}
                className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              />
              <button
                onClick={() => sendTextMessage()}
                disabled={isLoading || isRecording || !inputMessage.trim()}
                className="px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                전송
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
