// ============================================
// src/types/api.ts
// API 응답/요청 타입 정의 (OpenAPI 스펙 기반)
// ============================================

// ============================================
// 사용자 관련 타입
// ============================================

export interface UserResponseDto {
  id: string;
  email: string;
  username: string;
  displayName: string;
  phoneNumber: string;
  address: string;
  authority: string;
  loyaltyLevel: string;
  visitCount: number;
  totalSpent: string;
}

export interface RegisterDto {
  email: string;
  username: string;
  password: string;
  displayName: string;
  phoneNumber: string;
  address: string;
}

// ============================================
// 사용자 주소 관련 타입 (백엔드 API 추가 예정)
// ============================================

export interface UserAddressDto {
  id: string;
  address: string;
  nickname?: string;
  isDefault: boolean;
}

export interface AddUserAddressRequest {
  address: string;
  nickname?: string;
  isDefault?: boolean;
}

// ============================================
// 회원정보 수정 관련 타입 (백엔드 API 추가 예정)
// ============================================

export interface UpdateUserProfileRequest {
  displayName?: string;
  phoneNumber?: string;
  address?: string;
  email?: string;
}

// ============================================
// 결제수단 관련 타입 (백엔드 API 추가 예정)
// ============================================

export interface UserCardResponseDto {
  id: string;
  cardBrand: string;
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cardHolderName: string;
  cvv: string;
  isDefault: boolean;
}

export interface AddCardRequest {
  cardBrand: string;
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cardHolderName: string;
  cvv: string;
  isDefault?: boolean;
}

// 하위 호환성을 위한 별칭
export type PaymentMethodDto = UserCardResponseDto;
export type AddPaymentMethodRequest = AddCardRequest;

// ============================================
// 인증 관련 타입
// ============================================

export interface LoginDto {
  username: string;
  password: string;
}

export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: UserResponseDto;
}

export interface RefreshTokenRequestDto {
  refreshToken: string;
}

// ============================================
// 디너 관련 타입
// ============================================

export interface DinnerResponseDto {
  id: string;
  dinnerName: string;
  description: string;
  basePrice: number;
  active: boolean;
  imageUrl?: string; // 프론트엔드 확장 필드
}

export interface CreateDinnerRequest {
  dinnerName: string;
  description?: string;
  basePrice: number;
  isActive?: boolean;
}

export interface DinnerMenuItemResponseDto {
  menuItemId: string;
  menuItemName: string;
  defaultQuantity: number;
}

export interface CreateDinnerMenuItemRequest {
  dinnerId: string;
  menuItemId: string;
  defaultQuantity: number;
}

// ============================================
// 서빙 스타일 관련 타입
// ============================================

export interface ServingStyleResponseDto {
  id: string;
  styleName: string;
  description: string;
  extraPrice: number;
  active: boolean;
}

export interface CreateServingStyleRequest {
  styleName: string;
  description?: string;
  extraPrice: number;
  isActive?: boolean;
}

// ============================================
// 메뉴 아이템 관련 타입
// ============================================

export interface MenuItemResponseDto {
  id: string;
  name: string;
  stock: number;
  unitPrice: number;
  unitType: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMenuItemRequest {
  name: string;
  stock: number;
}

export interface UpdateMenuItemStockRequest {
  stock: number;
}

// ============================================
// 상품(Product) 관련 타입
// ============================================

export interface ProductMenuItemResponseDto {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CreateProductRequest {
  dinnerId: string;
  servingStyleId: string;
  quantity: number;
  memo?: string;
  productName?: string;
  address: string;
}

export interface CreateAdditionalMenuProductRequest {
  menuItemId: string;
  quantity: number;
  memo?: string;
  address: string;
}

export interface ProductResponseDto {
  id: string;
  productName: string;
  dinnerId?: string | null;  // ADDITIONAL_MENU_PRODUCT인 경우 null
  dinnerName?: string | null;
  servingStyleId?: string | null;  // ADDITIONAL_MENU_PRODUCT인 경우 null
  servingStyleName?: string | null;
  totalPrice: number;
  quantity: number;
  memo: string;
  address?: string;
  productMenuItems: ProductMenuItemResponseDto[];
}

// ============================================
// 장바구니(Cart) 관련 타입
// ============================================

export interface CartItemRequest {
  productId: string;
  quantity: number;
}

export interface CreateCartRequest {
  items: CartItemRequest[];
  deliveryAddress?: string;
  deliveryMethod?: 'Pickup' | 'Delivery';
  memo?: string;
  expiresAt?: string;
}

export interface CartItemResponseDto {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CartResponseDto {
  id: string;
  userId: string;
  items: CartItemResponseDto[];
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  grandTotal: number;
  deliveryAddress: string;
  deliveryMethod: 'Pickup' | 'Delivery';
  memo: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// 주문(Order) 관련 타입
// ============================================

export type OrderStatus = 'PLACED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED' | 'REFUNDED';
export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
export type DeliveryStatus = 'READY' | 'COOKING' | 'SHIPPING' | 'DELIVERED' | 'PICKUP_READY' | 'PICKED_UP';
export type DeliveryMethod = 'Pickup' | 'Delivery';

export type ProductType = 'DINNER_PRODUCT' | 'ADDITIONAL_MENU_PRODUCT';

export interface OrderItemResponseDto {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  optionSummary: string;
  productType?: ProductType; // Product 타입 (DINNER_PRODUCT, ADDITIONAL_MENU_PRODUCT)
  menuItems?: ProductMenuItemResponseDto[]; // Product의 메뉴 아이템 목록
}

export interface OrderResponseDto {
  id: string;
  orderNumber: string;
  userId?: string; // 사용자 ID (검색용)
  username?: string; // 사용자명 (검색용)
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  grandTotal: number;
  currency: string;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string;
  deliveryMemo: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  paymentTransactionId: string;
  memo: string;
  rejectionReason?: string; // 관리자 거절 사유
  orderedAt: string;
  updatedAt: string;
  items: OrderItemResponseDto[];
}

export interface ApproveOrderRequest {
  approved: boolean;
  rejectionReason?: string;
}

export interface UpdateDeliveryStatusRequest {
  deliveryStatus: DeliveryStatus;
}

// ============================================
// 음성 주문(Voice Order) 관련 타입
// ============================================

export enum UiAction {
  NONE = 'NONE',
  SHOW_CONFIRM_MODAL = 'SHOW_CONFIRM_MODAL',
  SHOW_CANCEL_CONFIRM = 'SHOW_CANCEL_CONFIRM',
  UPDATE_ORDER_LIST = 'UPDATE_ORDER_LIST',
  ORDER_COMPLETED = 'ORDER_COMPLETED',
}

export interface VoiceAdditionalMenuItemDto {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
}

export interface VoiceOrderItemDto {
  dinnerId: string;
  dinnerName: string;
  servingStyleId: string | null;
  servingStyleName: string | null;
  productId?: string | null;  // 생성된 Product ID (스타일 선택 후 생성됨)
  quantity: number;
  basePrice: number;
  unitPrice: number;
  totalPrice: number;
  additionalMenuItems?: VoiceAdditionalMenuItemDto[];
}

export interface VoiceChatMessageDto {
  role: 'user' | 'assistant';
  content: string;
}

export interface VoiceChatRequestDto {
  message?: string;
  audioBase64?: string;
  audioFormat?: string;
  conversationHistory?: VoiceChatMessageDto[];
  currentOrder?: VoiceOrderItemDto[];
  selectedAddress?: string | null;  // 선택된 배달 주소
}

export interface VoiceChatResponseDto {
  userMessage: string;
  assistantMessage: string;
  nextState?: string;  // OrderFlowState (CUSTOMIZING, SELECTING_QUANTITY 등)
  uiAction: UiAction;
  currentOrder: VoiceOrderItemDto[];
  totalPrice: number;
  selectedAddress: string | null;
  userAddresses?: string[];  // 사용자 주소 목록
  orderId?: string;          // 주문 완료 시 주문 ID
  orderNumber?: string;      // 주문 완료 시 주문 번호
}
