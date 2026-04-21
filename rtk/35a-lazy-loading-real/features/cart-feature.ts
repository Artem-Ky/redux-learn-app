/* ════════════════════════════════════════════════════════════════════
   cart-feature.ts — lazy feature с createEntityAdapter

   Показывает: feature может тащить в chunk свои RTK-зависимости
   (createEntityAdapter, createSelector) — они НЕ попадут в main.
   ════════════════════════════════════════════════════════════════════ */

import {
  createSlice,
  createEntityAdapter,
  nanoid,
  type PayloadAction,
} from '@reduxjs/toolkit'
import type { Store } from 'redux'
import type { ConsolePanel } from '../../shared/console-panel'

interface CartItem {
  id: string
  name: string
  qty: number
}

const cartAdapter = createEntityAdapter<CartItem>()

const cartSlice = createSlice({
  name: 'cart',
  initialState: cartAdapter.getInitialState(),
  reducers: {
    add: {
      prepare: (name: string) => ({ payload: { id: nanoid(), name, qty: 1 } }),
      reducer: (state, action: PayloadAction<CartItem>) => {
        cartAdapter.addOne(state, action.payload)
      },
    },
    increment: (state, action: PayloadAction<string>) => {
      const item = state.entities[action.payload]
      if (item) item.qty += 1
    },
    remove: (state, action: PayloadAction<string>) => {
      cartAdapter.removeOne(state, action.payload)
    },
  },
})

const PRODUCTS = ['Яблоки', 'Хлеб', 'Молоко', 'Кофе', 'Шоколад', 'Сыр']

export function register(
  rootReducer: Parameters<typeof cartSlice.injectInto>[0],
  store: Store,
  host: HTMLElement,
  con: ConsolePanel,
): void {
  const injected = cartSlice.injectInto(rootReducer)
  store.dispatch({ type: '@@INIT_INJECTED/cart' })
  con.success('cart slice injected (включая createEntityAdapter)')

  host.innerHTML = `
    <div class="feature-ui">
      <div class="feature-ui__title">Cart · entity adapter</div>
      <div class="feature-ui__list" data-list></div>
      <div class="feature-ui__btns">
        <button class="btn btn--tiny" data-act="add">+ add random</button>
      </div>
    </div>
  `
  const listEl = host.querySelector<HTMLElement>('[data-list]')!

  const update = (): void => {
    const state = store.getState() as { cart?: ReturnType<typeof cartAdapter.getInitialState> }
    const entities = state.cart?.entities ?? {}
    const ids = state.cart?.ids ?? []
    if (ids.length === 0) {
      listEl.innerHTML = '<span class="feature-ui__empty">пусто — нажмите "add random"</span>'
      return
    }
    listEl.innerHTML = ids
      .map((id) => {
        const item = entities[id as string]!
        return `
          <div class="cart-row">
            <span class="cart-row__name">${item.name}</span>
            <span class="cart-row__qty">×${item.qty}</span>
            <button class="btn btn--tiny" data-inc="${item.id}">+</button>
            <button class="btn btn--tiny btn--secondary" data-rm="${item.id}">×</button>
          </div>
        `
      })
      .join('')
    listEl.querySelectorAll<HTMLButtonElement>('[data-inc]').forEach((b) => {
      b.onclick = () => {
        const a = injected.actions.increment(b.dataset.inc!)
        store.dispatch(a)
        con.action(a, 'cart')
      }
    })
    listEl.querySelectorAll<HTMLButtonElement>('[data-rm]').forEach((b) => {
      b.onclick = () => {
        const a = injected.actions.remove(b.dataset.rm!)
        store.dispatch(a)
        con.action(a, 'cart')
      }
    })
  }
  store.subscribe(update)
  update()

  host.querySelector('[data-act="add"]')!.addEventListener('click', () => {
    const name = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)]
    const a = injected.actions.add(name)
    store.dispatch(a)
    con.action(a, 'cart')
  })
}
