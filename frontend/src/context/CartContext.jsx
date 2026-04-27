import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'boutique.cart';

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function CartProvider({ children }) {
  // Chaque ligne : { productId, name, price, quantity }
  const [items, setItems] = useState(() => loadCart());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  function addItem(product, qty = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [
        ...prev,
        { productId: product.id, name: product.name, price: product.price, quantity: qty }
      ];
    });
  }

  function removeItem(productId) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  function updateQuantity(productId, qty) {
    if (qty <= 0) return removeItem(productId);
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i))
    );
  }

  function clear() {
    setItems([]);
  }

  const { totalItems, totalPrice } = useMemo(() => {
    let totalItems = 0;
    let totalPrice = 0;
    for (const i of items) {
      totalItems += i.quantity;
      totalPrice += i.quantity * i.price;
    }
    return { totalItems, totalPrice: Math.round(totalPrice * 100) / 100 };
  }, [items]);

  const value = { items, addItem, removeItem, updateQuantity, clear, totalItems, totalPrice };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart doit être utilisé dans <CartProvider>');
  return ctx;
}
