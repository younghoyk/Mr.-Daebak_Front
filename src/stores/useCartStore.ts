import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 장바구니에 담길 아이템 구조 (백엔드 Product 정보 + 화면 표시용 정보)
export interface CartItem {
  productId: string; // ★핵심: 백엔드 /api/products/createProduct 응답의 id
  productName: string;
  quantity: number;
  totalPrice: number;
  styleName: string; // 화면 표시용
}

interface CartState {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
}

export const useCartStore = create(
  persist<CartState>(
    (set) => ({
      items: [],
      addToCart: (item) => set((state) => ({ items: [...state.items, item] })),
      removeFromCart: (id) => set((state) => ({ 
        items: state.items.filter((i) => i.productId !== id) 
      })),
      clearCart: () => set({ items: [] }),
    }),
    { name: 'mr-daebak-cart' } // 새로고침해도 유지됨
  )
);