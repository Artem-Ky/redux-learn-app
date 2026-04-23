import {
  configureStore,
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── 1. extraArgument — ApiClient ──────────────────────────────
interface Product { id: number; title: string; price: number; fetchedAt: number }

const apiClient = {
  kind: 'mock-apiClient' as const,
  async getProduct(id: number): Promise<Product> {
    // setTimeout + Promise — симуляция сети
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id,
          title: `Product #${id}`,
          price: Math.round(100 + Math.random() * 900),
          fetchedAt: Date.now(),
        })
      }, 600)
    })
  },
}

// ── 2. Типы state (вручную, чтобы не было циклической зависимости с store) ──
interface ProductsState { byId: Record<number, Product>; lastCacheHit: boolean }
interface AnalyticsState { events: { kind: string; id: number; at: number }[] }
interface RootState { products: ProductsState; analytics: AnalyticsState }

// ── 3. Thunk, использующий всё thunkAPI ──────────────────────
// Объявляем ДО slices — extraReducers ниже читает fetchProduct.fulfilled
// во время вызова createSlice, иначе TDZ (Cannot access before initialization).
const CACHE_MS = 10_000

const fetchProduct = createAsyncThunk<
  Product,
  number,
  { state: RootState; extra: typeof apiClient }
>(
  'products/fetch',
  async (id, { getState, extra, dispatch, requestId, signal }) => {
    // 1. getState — cache check. Актуальное состояние.
    const root = getState()
    const cached = root.products.byId[id]
    if (cached && Date.now() - cached.fetchedAt < CACHE_MS) {
      dispatch(productsSlice.actions.cacheHit(true))
      console.log(`[${requestId}] CACHE HIT for #${id}`)
      return cached
    }

    // 2. dispatch — side-action в другой slice
    dispatch(analyticsSlice.actions.productViewed({ id }))
    dispatch(productsSlice.actions.cacheHit(false))

    // 3. extra — внешний apiClient (типизирован)
    console.log(`[${requestId}] fetch ${extra.kind} /products/${id}`)

    // 4. signal — аборт (здесь просто демонстрируем)
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    return await extra.getProduct(id)
  },
)

// ── 4. Slices ────────────────────────────────────────────────
const productsSlice = createSlice({
  name: 'products',
  initialState: { byId: {}, lastCacheHit: false } as ProductsState,
  reducers: {
    invalidate: (s) => { s.byId = {}; s.lastCacheHit = false },
    cacheHit:   (s, a: PayloadAction<boolean>) => { s.lastCacheHit = a.payload },
  },
  extraReducers: (b) => {
    b.addCase(fetchProduct.fulfilled, (s, a) => {
      s.byId[a.payload.id] = a.payload
    })
  },
})

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: { events: [] } as AnalyticsState,
  reducers: {
    productViewed: (s, a: PayloadAction<{ id: number }>) => {
      s.events.push({ kind: 'product-view', id: a.payload.id, at: Date.now() })
    },
  },
})

// ── 5. Store с extraArgument ─────────────────────────────────
const store = configureStore({
  reducer: {
    products:  productsSlice.reducer,
    analytics: analyticsSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      thunk: { extraArgument: apiClient },
    }),
})

type AppDispatch = typeof store.dispatch

// ── 6. UI ────────────────────────────────────────────────────
const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог thunkAPI')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

con.info('extra (extraArgument) =', { kind: apiClient.kind })

const stateOut  = document.getElementById('state-out')!
const cacheInd  = document.getElementById('cache-ind')!

function render(): void {
  const s = store.getState()
  stateOut.textContent = JSON.stringify(s, null, 2)

  if (s.products.lastCacheHit) {
    cacheInd.textContent = 'CACHE HIT'
    cacheInd.className = 'cache-ind hit'
  } else if (Object.keys(s.products.byId).length > 0) {
    cacheInd.textContent = 'CACHE MISS (fetched)'
    cacheInd.className = 'cache-ind miss'
  } else {
    cacheInd.textContent = 'empty'
    cacheInd.className = 'cache-ind'
  }
}
render()
store.subscribe(render)

// Перехват dispatch для action-лога
const origDispatch = store.dispatch
;(store as { dispatch: AppDispatch }).dispatch = ((a: unknown) => {
  const res = origDispatch(a as Parameters<AppDispatch>[0])
  if (typeof a !== 'function') {
    const action = a as { type?: string; payload?: unknown }
    if (action.type) con.action({ type: action.type, payload: action.payload })
  }
  return res
}) as AppDispatch

document.getElementById('fetch-1')!.addEventListener('click', () => {
  con.log('>>> dispatch(fetchProduct(1))')
  store.dispatch(fetchProduct(1))
})
document.getElementById('fetch-2')!.addEventListener('click', () => {
  con.log('>>> dispatch(fetchProduct(2))')
  store.dispatch(fetchProduct(2))
})
document.getElementById('fetch-1-again')!.addEventListener('click', () => {
  con.log('>>> dispatch(fetchProduct(1)) — ожидаем CACHE HIT')
  store.dispatch(fetchProduct(1))
})
document.getElementById('invalidate')!.addEventListener('click', () => {
  const a = productsSlice.actions.invalidate()
  store.dispatch(a)
  con.warn('Кэш сброшен.')
})

con.log('Нажмите "Fetch product #1" — увидите fetch + analytics/productViewed side-action.')
con.log('Затем "Fetch product #1 (кэш)" — pending/fulfilled будут, но fetch НЕ будет (getState увидел свежий cached).')
con.info('extraArgument передан через middleware({thunk:{extraArgument: apiClient}}).')
con.success('Тип thunkAPI.extra типизирован как typeof apiClient — через ThunkApiConfig { extra: ... }.')
