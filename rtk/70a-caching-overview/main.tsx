import {
  configureStore,
  createAsyncThunk,
  createEntityAdapter,
  createSelector,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── Product domain (Layer 3: normalized) ──────────────────────
interface Product {
  id: number
  title: string
  price: number
  fetchedAt: number
}

const productsAdapter = createEntityAdapter<Product>()
const TTL_MS = 15_000

// ── Unrelated slice — клики для Layer 1 демо ────────────────
const uiSlice = createSlice({
  name: 'ui',
  initialState: { clicks: 0 },
  reducers: {
    clicked: (s) => {
      s.clicks++
    },
  },
})

// ── Stats slice — метрики для всех слоёв ─────────────────────
interface StatsState {
  recomputes: number
  fetches: number
  cacheHits: number
  skipped: number
}

const statsSlice = createSlice({
  name: 'stats',
  initialState: { recomputes: 0, fetches: 0, cacheHits: 0, skipped: 0 } as StatsState,
  reducers: {
    recomputeBumped: (s) => {
      s.recomputes++
    },
    fetchBumped: (s) => {
      s.fetches++
    },
    hitBumped: (s) => {
      s.cacheHits++
    },
    skipBumped: (s) => {
      s.skipped++
    },
    statsReset: () => ({ recomputes: 0, fetches: 0, cacheHits: 0, skipped: 0 }),
  },
})

// ── Products state + thunk со всеми слоями 3/4/5 ────────────
interface RootStateLocal {
  products: ReturnType<typeof productsAdapter.getInitialState>
  ui: { clicks: number }
  stats: StatsState
}

const fetchProduct = createAsyncThunk<
  Product,
  number,
  { state: RootStateLocal }
>(
  'products/fetch',
  async (id) => {
    // имитация сети
    await new Promise((r) => setTimeout(r, 500))
    return {
      id,
      title: `Product #${id}`,
      price: Math.round(100 + Math.random() * 900),
      fetchedAt: Date.now(),
    }
  },
  {
    condition: (id, { getState }) => {
      // LAYER 5: TTL cache
      const cached = getState().products.entities[id]
      if (cached && Date.now() - cached.fetchedAt < TTL_MS) return false
      // LAYER 4: если уже pending — skip
      // (упрощённо: в реальном проекте — отдельный flag inflight)
      return true
    },
  },
)

const productsSlice = createSlice({
  name: 'products',
  initialState: productsAdapter.getInitialState(),
  reducers: {
    invalidate: productsAdapter.removeAll,
  },
  extraReducers: (b) => {
    b.addCase(fetchProduct.fulfilled, (s, a) => {
      productsAdapter.upsertOne(s, a.payload)
    })
  },
})

// ── Store ────────────────────────────────────────────────────
const store = configureStore({
  reducer: {
    products: productsSlice.reducer,
    ui: uiSlice.reducer,
    stats: statsSlice.reducer,
  },
})

type RootState = ReturnType<typeof store.getState>

// ── LAYER 2: memoized selector ───────────────────────────────
const selectProductsTotalPrice = createSelector(
  [(s: RootState) => s.products.entities, (s: RootState) => s.products.ids],
  (entities, ids) => {
    store.dispatch(statsSlice.actions.recomputeBumped())
    return ids.reduce((acc, id) => acc + (entities[id]?.price ?? 0), 0)
  },
)

// ── UI wiring ────────────────────────────────────────────────
const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — 5 слоёв кэша работают вместе',
)
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const stClicks = document.getElementById('st-clicks')!
const stRecomputes = document.getElementById('st-recomputes')!
const stFetches = document.getElementById('st-fetches')!
const stHits = document.getElementById('st-hits')!
const stSkips = document.getElementById('st-skips')!

// Трекер «реальных fetch» — считаем только fulfilled (condition блокирует pending)
let realFetches = 0
const origDispatch = store.dispatch
;(store as { dispatch: typeof store.dispatch }).dispatch = ((a: unknown) => {
  const res = origDispatch(a as Parameters<typeof store.dispatch>[0])
  if (typeof a !== 'function') {
    const action = a as { type?: string }
    if (action.type === fetchProduct.fulfilled.type) {
      realFetches++
      store.dispatch(statsSlice.actions.fetchBumped())
    }
  }
  return res
}) as typeof store.dispatch

function render(): void {
  const s = store.getState()
  stClicks.textContent = String(s.ui.clicks)
  stRecomputes.textContent = String(s.stats.recomputes)
  stFetches.textContent = String(s.stats.fetches)
  stHits.textContent = String(s.stats.cacheHits)
  stSkips.textContent = String(s.stats.skipped)
}
render()
store.subscribe(render)

document.getElementById('btn-view')!.addEventListener('click', () => {
  store.dispatch(uiSlice.actions.clicked())
  // Layer 1 demo: читаем selector зависящий от products — должен НЕ пересчитаться
  const priceBefore = store.getState().stats.recomputes
  selectProductsTotalPrice(store.getState())
  const priceAfter = store.getState().stats.recomputes
  if (priceAfter === priceBefore) {
    con.success(
      'Layer 1 + 2: ui.clicks изменился, а state.products — нет. Ссылки на products.entities/ids те же → createSelector НЕ пересчитал (cache hit).',
    )
  } else {
    con.warn('Ожидали cache hit в селекторе, но он пересчитался.')
  }
})

document.getElementById('btn-compute')!.addEventListener('click', () => {
  const before = store.getState().stats.recomputes
  const total = selectProductsTotalPrice(store.getState())
  const after = store.getState().stats.recomputes
  con.info(
    `Layer 2: selectProductsTotalPrice = $${total}. Recomputes: ${before} → ${after}. Второй подряд вызов на том же state — 0 пересчётов.`,
  )
})

document.getElementById('btn-fetch')!.addEventListener('click', async () => {
  const stateBefore = store.getState()
  const cached = stateBefore.products.entities[1]
  const isFresh = cached && Date.now() - cached.fetchedAt < TTL_MS

  const result = await store.dispatch(fetchProduct(1))

  if (fetchProduct.rejected.match(result) && result.meta.condition) {
    store.dispatch(statsSlice.actions.skipBumped())
    if (isFresh) {
      store.dispatch(statsSlice.actions.hitBumped())
      con.success(
        `Layer 5 (TTL): товар свежий — condition вернул false, в сеть НЕ пошли. cache hit.`,
      )
    } else {
      con.warn(
        `Layer 4: condition skip без свежего кэша (обычно inflight guard).`,
      )
    }
  } else if (fetchProduct.fulfilled.match(result)) {
    con.log(
      `Layer 3/4: fulfilled. adapter.upsertOne положил в O(1) таблицу {ids, entities}. realFetches=${realFetches}.`,
    )
  }
})

document.getElementById('btn-reset')!.addEventListener('click', () => {
  store.dispatch(productsSlice.actions.invalidate())
  store.dispatch(statsSlice.actions.statsReset())
  realFetches = 0
  con.warn('Сброс: продукты очищены, TTL-кэш недействителен, счётчики 0.')
})

con.log('① Unrelated click — проверяем Layer 1 (structural sharing) + Layer 2 (memo selector hit).')
con.log('② Compute — Layer 2: первый вызов вычислит, второй вернёт из кэша reselect.')
con.log('③ Fetch #1 — первый раз real fetch; второй/третий внутри TTL=15s — cache hit через condition (Layer 4/5).')
con.info('Посмотрите в DevTools slice state: products.entities растёт, ui.clicks изолирован.')
