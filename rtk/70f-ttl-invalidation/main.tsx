import {
  configureStore,
  createAsyncThunk,
  createEntityAdapter,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── Model ──────────────────────────────────────────────────
interface Product {
  id: number
  title: string
  price: number
  fetchedAt: number
}

const productsAdapter = createEntityAdapter<Product>()

interface ProductsExtra {
  inflight: Record<number, boolean>
}

interface StatsState {
  attempts: number
  hits: number
  miss: number
  net: number
}

// ── Thunk ──────────────────────────────────────────────────
let ttlMs = 5000
const setTtl = (v: number): void => {
  ttlMs = v
}

const fetchProduct = createAsyncThunk<
  Product,
  number,
  { state: RootState; rejectValue: string }
>(
  'products/fetch',
  async (id) => {
    await new Promise((r) => setTimeout(r, 700))
    const titles: Record<number, string> = {
      1: 'Книга "Clean Code"',
      2: 'Ноутбук',
      3: 'Клавиатура',
    }
    const prices: Record<number, number> = { 1: 40, 2: 1200, 3: 150 }
    return {
      id,
      title: titles[id] ?? `Product #${id}`,
      price: prices[id] ?? Math.round(Math.random() * 500),
      fetchedAt: Date.now(),
    }
  },
  {
    condition: (id, { getState }) => {
      const s = getState().products
      if (s.inflight[id]) return false
      const cached = s.entities[id]
      if (!cached) return true
      return Date.now() - cached.fetchedAt > ttlMs
    },
  },
)

// ── Slices ────────────────────────────────────────────────
const productsSlice = createSlice({
  name: 'products',
  initialState: productsAdapter.getInitialState<ProductsExtra>({ inflight: {} }),
  reducers: {
    invalidateOne: (state, action: PayloadAction<number>) => {
      const e = state.entities[action.payload]
      if (e) e.fetchedAt = 0
    },
    invalidateAll: (state) => {
      for (const id of state.ids) {
        const e = state.entities[id as number]
        if (e) e.fetchedAt = 0
      }
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchProduct.pending, (s, a) => {
      s.inflight[a.meta.arg] = true
    })
    b.addCase(fetchProduct.fulfilled, (s, a) => {
      delete s.inflight[a.meta.arg]
      productsAdapter.upsertOne(s, a.payload)
    })
    b.addCase(fetchProduct.rejected, (s, a) => {
      delete s.inflight[a.meta.arg]
    })
  },
})

const statsSlice = createSlice({
  name: 'stats',
  initialState: { attempts: 0, hits: 0, miss: 0, net: 0 } as StatsState,
  reducers: {
    attempt: (s) => {
      s.attempts++
    },
    hit: (s) => {
      s.hits++
    },
    miss: (s) => {
      s.miss++
    },
    net: (s) => {
      s.net++
    },
  },
})

const store = configureStore({
  reducer: {
    products: productsSlice.reducer,
    stats: statsSlice.reducer,
  },
})

type RootState = ReturnType<typeof store.getState>

// ── UI ────────────────────────────────────────────────────
const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — TTL cache и invalidation',
)
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const grid = document.getElementById('cache-grid')!
const sAttempts = document.getElementById('s-attempts')!
const sHits = document.getElementById('s-hits')!
const sMiss = document.getElementById('s-miss')!
const sNet = document.getElementById('s-net')!

function freshness(age: number): 'fresh' | 'stale' | 'expired' {
  if (age < ttlMs) return 'fresh'
  if (age < ttlMs * 3) return 'stale'
  return 'expired'
}

function renderGrid(): void {
  const state = store.getState()
  const ids = state.products.ids as number[]
  if (ids.length === 0) {
    grid.innerHTML =
      '<div style="color: var(--text-muted); font-size: .82rem; grid-column: 1 / -1;">Кэш пуст. Нажмите «Fetch #N».</div>'
    return
  }
  const now = Date.now()
  const parts: string[] = []
  for (const id of ids) {
    const p = state.products.entities[id]!
    const age = now - p.fetchedAt
    const remaining = Math.max(0, ttlMs - age)
    const percent = p.fetchedAt === 0 ? 0 : Math.max(0, Math.min(100, (remaining / ttlMs) * 100))
    const fresh = freshness(age)
    const color =
      fresh === 'fresh' ? 'var(--success)' : fresh === 'stale' ? 'var(--warning)' : 'var(--accent-red)'
    const label = p.fetchedAt === 0 ? 'invalidated' : `${fresh} · ${(age / 1000).toFixed(1)}s`
    parts.push(`
      <div class="cache-entry">
        <div class="cache-entry__id">#${p.id}</div>
        <div class="cache-entry__field">title: ${p.title}</div>
        <div class="cache-entry__field">price: ${p.price}</div>
        <div class="cache-entry__field">fetchedAt: ${p.fetchedAt === 0 ? '0' : new Date(p.fetchedAt).toLocaleTimeString()}</div>
        <div class="cache-entry__ttl cache-entry__ttl--${fresh}">${label}</div>
        <div class="cache-entry__bar"><div class="cache-entry__bar-fill" style="width:${percent}%; background:${color};"></div></div>
      </div>
    `)
  }
  grid.innerHTML = parts.join('')
}

function renderStats(): void {
  const s = store.getState().stats
  sAttempts.textContent = String(s.attempts)
  sHits.textContent = String(s.hits)
  sMiss.textContent = String(s.miss)
  sNet.textContent = String(s.net)
}

renderGrid()
renderStats()
store.subscribe(() => {
  renderGrid()
  renderStats()
})
setInterval(renderGrid, 250)

// ── Controls ──────────────────────────────────────────────
const ttlInput = document.getElementById('ttl-ms') as HTMLInputElement
ttlInput.addEventListener('change', () => {
  const v = Math.max(500, Number(ttlInput.value) || 5000)
  setTtl(v)
  con.info(`TTL изменён на ${v}ms`)
})

async function tryFetch(id: number): Promise<void> {
  store.dispatch(statsSlice.actions.attempt())
  const cachedBefore = store.getState().products.entities[id]
  const cachedAge = cachedBefore ? Date.now() - cachedBefore.fetchedAt : Infinity
  const wasFresh = cachedBefore && cachedAge < ttlMs && cachedBefore.fetchedAt !== 0
  const result = await store.dispatch(fetchProduct(id))
  if (fetchProduct.rejected.match(result) && result.meta.condition) {
    if (wasFresh) {
      store.dispatch(statsSlice.actions.hit())
      con.success(`#${id} — cache HIT (fresh, age=${(cachedAge / 1000).toFixed(1)}s < TTL)`)
    } else {
      store.dispatch(statsSlice.actions.hit())
      con.info(`#${id} — skipped (уже в полёте, dedup)`)
    }
  } else if (fetchProduct.fulfilled.match(result)) {
    store.dispatch(statsSlice.actions.miss())
    store.dispatch(statsSlice.actions.net())
    con.warn(`#${id} — cache MISS → сеть → сохранено (fetchedAt=${new Date(result.payload.fetchedAt).toLocaleTimeString()})`)
  }
}

document.getElementById('btn-fetch-1')!.addEventListener('click', () => {
  void tryFetch(1)
})
document.getElementById('btn-fetch-2')!.addEventListener('click', () => {
  void tryFetch(2)
})
document.getElementById('btn-fetch-3')!.addEventListener('click', () => {
  void tryFetch(3)
})
document.getElementById('btn-fetch-all')!.addEventListener('click', () => {
  con.log('Parallel fetch #1, #2, #3...')
  void Promise.all([tryFetch(1), tryFetch(2), tryFetch(3)])
})

document.getElementById('btn-invalidate-1')!.addEventListener('click', () => {
  store.dispatch(productsSlice.actions.invalidateOne(1))
  con.warn('#1 invalidated (fetchedAt=0). Следующий Fetch #1 → сеть.')
})
document.getElementById('btn-invalidate-all')!.addEventListener('click', () => {
  store.dispatch(productsSlice.actions.invalidateAll())
  con.warn('Все записи invalidated. Кэш показан как expired.')
})

con.log('Нажмите «Fetch #1» два раза подряд — первый сходит в сеть, второй будет HIT (fresh).')
con.log('Подождите больше TTL (5s) — следующий Fetch снова MISS. Цвет полоски подскажет: зелёный → жёлтый → красный.')
con.info('Уменьши TTL в поле сверху до 1000ms — кэш будет протухать за секунду.')
