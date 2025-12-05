import React, { useState, useRef, useEffect } from 'react';
import { useUIStore } from '../stores/useUIStore';
import apiClient from '../lib/axios';
import {
  VoiceChatRequestDto,
  VoiceChatResponseDto,
  VoiceOrderItemDto,
  VoiceChatMessageDto,
  UiAction,
  CreateCartRequest,
} from '../types/api';

export const AIChatDrawer: React.FC = () => {
  const { isAIChatOpen, closeAIChat } = useUIStore();
  
  // 상태 관리
  const [messages, setMessages] = useState<VoiceChatMessageDto[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [currentOrder, setCurrentOrder] = useState<VoiceOrderItemDto[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [nextState, setNextState] = useState<string | undefined>(undefined);  // OrderFlowState
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(600); // 기본 너비를 600px로 설정
  const [isResizing, setIsResizing] = useState(false);
  
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
      
      // 화면 오른쪽에서의 거리 계산
      const newWidth = window.innerWidth - e.clientX;
      // 최소 너비 400px, 최대 너비 1200px
      const clampedWidth = Math.max(400, Math.min(1200, newWidth));
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
        
        // 스트림 정리
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

  // 오디오 메시지 전송
  const sendAudioMessage = async (audioBlob: Blob) => {
    try {
      setIsLoading(true);
      const audioBase64 = await audioToBase64(audioBlob);
      
      const request: VoiceChatRequestDto = {
        audioBase64,
        audioFormat: 'webm',
        conversationHistory: messages,
        currentOrder: currentOrder.length > 0 ? currentOrder : undefined,
        selectedAddress: selectedAddress,
      };
      
      await sendChatMessage(request);
    } catch (error) {
      console.error('오디오 전송 실패:', error);
      alert('음성 메시지 전송에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 텍스트 메시지 전송
  const sendTextMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // 사용자 메시지를 대화 히스토리에 추가
    const userMsg: VoiceChatMessageDto = { role: 'user', content: userMessage };
    setMessages((prev) => [...prev, userMsg]);
    
    try {
      setIsLoading(true);
      
      const request: VoiceChatRequestDto = {
        message: userMessage,
        conversationHistory: messages,
        currentOrder: currentOrder.length > 0 ? currentOrder : undefined,
        selectedAddress: selectedAddress,
      };
      
      await sendChatMessage(request);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      alert('메시지 전송에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 백엔드 API 호출
  const sendChatMessage = async (request: VoiceChatRequestDto) => {
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
      
      // 상태 업데이트
      if (data.currentOrder) {
        setCurrentOrder(data.currentOrder);
      }
      if (data.totalPrice !== undefined) {
        setTotalPrice(data.totalPrice);
      }
      if (data.selectedAddress) {
        setSelectedAddress(data.selectedAddress);
      }
      if (data.nextState) {
        setNextState(data.nextState);
      }
      
      // UI Action 처리
      handleUiAction(data.uiAction, data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        alert('로그인이 필요합니다.');
        closeAIChat();
      } else {
        const errorMessage = error.response?.data?.message || '메시지 전송에 실패했습니다.';
        alert(errorMessage);
      }
    }
  };

  // UI Action 처리
  const handleUiAction = (uiAction: UiAction, data: VoiceChatResponseDto) => {
    switch (uiAction) {
      case UiAction.SHOW_CONFIRM_MODAL:
        setShowConfirmModal(true);
        break;
      case UiAction.SHOW_CANCEL_CONFIRM:
        // 주문 취소 확인 (필요시 구현)
        break;
      case UiAction.UPDATE_ORDER_LIST:
        // 주문 목록 업데이트는 이미 currentOrder로 처리됨
        break;
      case UiAction.ORDER_COMPLETED:
        // 주문 완료 처리
        if (data.orderNumber) {
          alert(
            `주문이 완료되었습니다!\n\n` +
            `주문 번호: ${data.orderNumber}\n` +
            `총 금액: ₩${data.totalPrice.toLocaleString()}\n\n` +
            `주문 내역 페이지로 이동합니다.`
          );
          
          // 주문 내역 페이지로 이동
          setTimeout(() => {
            window.location.href = '/orders';
          }, 1000);
        }
        // 상태 초기화
        setCurrentOrder([]);
        setTotalPrice(0);
        setSelectedAddress(null);
        setNextState(undefined);
        closeAIChat();
        break;
      default:
        break;
    }
  };

  // 주문 확인 및 장바구니에 추가
  const handleConfirmOrder = async () => {
    // 완성된 아이템만 필터링 (수량이 0보다 큰 아이템)
    const completedItems = currentOrder.filter((item) => item.quantity > 0 && item.servingStyleId);
    
    if (completedItems.length === 0) {
      alert('완성된 주문이 없습니다. 모든 메뉴의 수량을 선택해주세요.');
      return;
    }

    if (!selectedAddress) {
      alert('배달 주소를 선택해주세요.');
      return;
    }

    try {
      setIsLoading(true);

      // 1. 각 OrderItem을 Product로 변환 (일반 주문 플로우와 동일)
      const createdProducts = [];
      
      for (const item of completedItems) {
        if (!item.dinnerId || !item.servingStyleId || item.quantity <= 0) {
          continue; // 필수 정보가 없는 아이템은 건너뛰기
        }

        try {
          let productId: string;
          
          // productId가 이미 있으면 Product를 생성하지 않고, 메뉴 구성 변경/추가 메뉴 추가만 처리
          if (item.productId) {
            productId = item.productId;
            
            // TODO: 메뉴 구성 변경 처리 (일반 플로우의 CustomizeStep과 동일)
            // 현재는 추가 메뉴 아이템만 처리
            
            // 추가 메뉴 아이템이 있으면 추가
            if (item.additionalMenuItems && item.additionalMenuItems.length > 0) {
              for (const additionalItem of item.additionalMenuItems) {
                if (additionalItem.quantity > 0 && additionalItem.menuItemId) {
                  try {
                    await apiClient.post(`/products/${productId}/menu-items`, {
                      menuItemId: additionalItem.menuItemId,
                      quantity: additionalItem.quantity,
                    });
                  } catch (error: any) {
                    console.error(
                      `추가 메뉴 아이템 추가 실패 (${additionalItem.menuItemName}):`,
                      error
                    );
                    // 추가 메뉴 아이템 추가 실패해도 계속 진행 (경고만)
                  }
                }
              }
            }
          } else {
            // productId가 없으면 Product 생성 (기존 로직)
            const productResponse = await apiClient.post('/products/createProduct', {
              dinnerId: item.dinnerId,
              servingStyleId: item.servingStyleId,
              quantity: item.quantity,
              address: selectedAddress,
              memo: '',
            });
            
            productId = productResponse.data.id;
            
            // 추가 메뉴 아이템이 있으면 추가
            if (item.additionalMenuItems && item.additionalMenuItems.length > 0) {
              for (const additionalItem of item.additionalMenuItems) {
                if (additionalItem.quantity > 0 && additionalItem.menuItemId) {
                  try {
                    await apiClient.post(`/products/${productId}/menu-items`, {
                      menuItemId: additionalItem.menuItemId,
                      quantity: additionalItem.quantity,
                    });
                  } catch (error: any) {
                    console.error(
                      `추가 메뉴 아이템 추가 실패 (${additionalItem.menuItemName}):`,
                      error
                    );
                    // 추가 메뉴 아이템 추가 실패해도 계속 진행 (경고만)
                  }
                }
              }
            }
          }
          
          createdProducts.push({
            productId: productId,
            quantity: item.quantity,
          });
        } catch (error: any) {
          console.error(`Product 처리 실패 (${item.dinnerName}):`, error);
          throw new Error(`${item.dinnerName} 상품 처리에 실패했습니다.`);
        }
      }

      if (createdProducts.length === 0) {
        throw new Error('생성된 상품이 없습니다.');
      }

      // 2. Cart 생성 (Product들이 모두 준비됨)
      const cartResponse = await apiClient.post('/carts/createCart', {
        items: createdProducts,
        deliveryAddress: selectedAddress,
        deliveryMethod: 'Delivery',
        memo: '',
      });

      // 3. Checkout 처리
      const orderResponse = await apiClient.post(`/carts/${cartResponse.data.id}/checkout`);

      // 4. 성공 처리
      const order = orderResponse.data;
      alert(
        `주문이 완료되었습니다!\n\n` +
          `주문 번호: ${order.orderNumber}\n` +
          `주문 개수: ${completedItems.length}개\n` +
          `총 금액: ₩${order.grandTotal.toLocaleString()}\n` +
          `배달 주소: ${selectedAddress}`
      );

      // 5. 초기화 및 닫기
      handleCancelOrder();
      closeAIChat();
      
      // 페이지 새로고침 또는 주문 내역 페이지로 이동 가능
      window.location.reload();
    } catch (error: any) {
      console.error('주문 확인 실패:', error);
      const errorMessage = error.response?.data?.message || error.message || '주문 확인에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 수량 변경 핸들러
  const handleQuantityChange = async (itemIndex: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const item = currentOrder[itemIndex];
    if (!item || !item.dinnerId || !item.servingStyleId) return;

    try {
      setIsLoading(true);
      
      // 백엔드에 수량 변경 요청
      const request: VoiceChatRequestDto = {
        message: `${item.dinnerName} ${newQuantity}개로 변경해줘`,
        conversationHistory: messages,
        currentOrder: currentOrder,
        selectedAddress: selectedAddress,
      };
      
      const response = await apiClient.post<VoiceChatResponseDto>(
        '/voice-order/chat',
        request
      );
      
      const data = response.data;
      
      // 상태 업데이트
      if (data.currentOrder) {
        setCurrentOrder(data.currentOrder);
      }
      if (data.totalPrice !== undefined) {
        setTotalPrice(data.totalPrice);
      }
      
      // AI 응답을 대화 히스토리에 추가
      const assistantMsg: VoiceChatMessageDto = {
        role: 'assistant',
        content: data.assistantMessage,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      console.error('수량 변경 실패:', error);
      alert('수량 변경에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 주문 취소
  const handleCancelOrder = () => {
    setCurrentOrder([]);
    setTotalPrice(0);
    setSelectedAddress(null);
    setMessages([]);
    setShowConfirmModal(false);
  };

  // 컴포넌트 닫기 시 초기화
  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    setCurrentOrder([]);
    setTotalPrice(0);
    setSelectedAddress(null);
    setMessages([]);
    setShowConfirmModal(false);
    closeAIChat();
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
        } ${
          isAIChatOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: `${drawerWidth}px` }}
      >
        {/* 리사이즈 핸들 (투명하지만 드래그 가능) */}
        <div
          className="absolute left-0 top-0 h-full w-2 cursor-ew-resize z-10"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
          title="크기 조절"
        />
        <div className="flex flex-col h-full">
          {/* 헤더 */}
          <div className="p-4 bg-green-600 text-white flex justify-between items-center">
            <h2 className="font-bold text-lg">Mr. DAEBAK AI</h2>
            <button onClick={handleClose} className="text-2xl hover:text-gray-200">
              &times;
            </button>
          </div>


          {/* 채팅 영역 */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-10">
                <p className="text-lg mb-2">무엇을 도와드릴까요? 🎤</p>
                <p className="text-sm">"발렌타인 디너 하나 담아줘"</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === 'user'
                          ? 'bg-green-600 text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white text-gray-800 border border-gray-200 rounded-lg px-4 py-2">
                      <p className="text-sm">생각 중...</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

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
                onClick={sendTextMessage}
                disabled={isLoading || isRecording || !inputMessage.trim()}
                className="px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                전송
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 주문 확인 모달 */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">주문 확인</h3>
            <div className="space-y-2 mb-4">
              {currentOrder.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>
                    {item.dinnerName}
                    {item.servingStyleName && ` (${item.servingStyleName})`}
                    {item.quantity > 0 && ` x${item.quantity}`}
                  </span>
                  <span className="font-semibold">₩{item.totalPrice.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 mb-4">
              <div className="flex justify-between font-bold">
                <span>총 금액</span>
                <span>₩{totalPrice.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleConfirmOrder}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
              >
                {isLoading ? '처리 중...' : '주문하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};