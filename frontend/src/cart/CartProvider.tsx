import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { cartApi } from '../api/cart'
import { ordersApi } from '../api/orders'
import { useAuth } from '../auth/useAuth'
import type { Cart } from '../types/cart'
import { CartContext, type CartContextValue } from './CartContext'

/** Holds the customer's cart; the server's response to every change is the source of truth. */
export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const customerId = user?.role === 'CUSTOMER' ? user.id : null
  // Tagged with its owner so a previous user's cart is never shown after switching accounts.
  const [state, setState] = useState<{ ownerId: number; cart: Cart } | null>(null)
  const cart = state && state.ownerId === customerId ? state.cart : null

  const refresh = useCallback(async () => {
    if (customerId === null) return
    const loaded = await cartApi.get().catch(() => null)
    if (loaded) setState({ ownerId: customerId, cart: loaded })
  }, [customerId])

  useEffect(() => {
    if (customerId === null) return
    let cancelled = false
    cartApi.get().then(
      (loaded) => !cancelled && setState({ ownerId: customerId, cart: loaded }),
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [customerId])

  const value = useMemo<CartContextValue>(() => {
    const apply = (request: Promise<Cart>) =>
      request.then((updated) => {
        if (customerId !== null) setState({ ownerId: customerId, cart: updated })
        return updated
      })
    return {
      cart,
      addItem: (productId, quantity) => apply(cartApi.add(productId, quantity)),
      updateQuantity: (itemId, quantity) => apply(cartApi.update(itemId, quantity)),
      removeItem: (itemId) => apply(cartApi.remove(itemId)),
      clear: () => apply(cartApi.clear()),
      checkout: async () => {
        const order = await ordersApi.place()
        await refresh()
        return order
      },
      refresh,
    }
  }, [cart, customerId, refresh])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
