import React, { createContext, useState, useEffect, useContext } from "react";
import { Product } from "../types.ts";
import { useAuth } from "./AuthContext.tsx";

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity: number) => { success: boolean; message: string };
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  checkout: (notes?: string) => Promise<{ success: boolean; error?: string }>;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { user, token } = useAuth();

  // Load cart items on start
  useEffect(() => {
    const storageKey = user ? `inovamarket_cart_${user.id}` : "inovamarket_cart_guest";
    const savedCart = localStorage.getItem(storageKey);
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    } else {
      setCartItems([]);
    }
  }, [user]);

  // Save cart items to local storage on changes
  useEffect(() => {
    const storageKey = user ? `inovamarket_cart_${user.id}` : "inovamarket_cart_guest";
    localStorage.setItem(storageKey, JSON.stringify(cartItems));
  }, [cartItems, user]);

  const addToCart = (product: Product, quantity: number) => {
    if (product.stock <= 0) {
      return { success: false, message: "Produto sem estoque disponível." };
    }

    let successMessage = "Produto adicionado ao carrinho com sucesso!";
    if (!user) {
      successMessage = "Adicionado! Faça login ou cadastre-se para finalizar sua compra.";
    }

    setCartItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex((item) => item.product.id === product.id);

      if (existingItemIndex > -1) {
        const currentQty = prevItems[existingItemIndex].quantity;
        const targetQty = currentQty + quantity;
        
        if (targetQty > product.stock) {
          successMessage = `Quantidade limitada ao estoque disponível de ${product.stock} unidades.`;
          const updated = [...prevItems];
          updated[existingItemIndex].quantity = product.stock;
          return updated;
        }

        const updated = [...prevItems];
        updated[existingItemIndex].quantity = targetQty;
        return updated;
      } else {
        const finalQty = Math.min(quantity, product.stock);
        return [...prevItems, { product, quantity: finalQty }];
      }
    });

    return { success: true, message: successMessage };
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const validQty = Math.max(1, Math.min(quantity, item.product.stock));
          return { ...item, quantity: validQty };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCartItems([]);
    const storageKey = user ? `inovamarket_cart_${user.id}` : "inovamarket_cart_guest";
    localStorage.removeItem(storageKey);
  };

  const checkout = async (notes?: string) => {
    if (!user || !token) {
      return { success: false, error: "Você precisa fazer login para finalizar a compra." };
    }

    if (cartItems.length === 0) {
      return { success: false, error: "O seu carrinho está vazio." };
    }

    try {
      const itemsPayload = cartItems.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ items: itemsPayload, notes }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || "Erro ao realizar checkout." };
      }

      clearCart();
      return { success: true };
    } catch (err) {
      return { success: false, error: "Não foi possível conectar com o servidor." };
    }
  };

  const cartTotal = cartItems.reduce(
    (acc, item) => acc + parseFloat(item.product.salePrice) * item.quantity,
    0
  );

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        checkout,
        cartTotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
