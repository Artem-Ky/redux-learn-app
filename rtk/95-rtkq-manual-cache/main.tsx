import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { Provider } from 'react-redux'
import { StrictMode, useEffect, useRef, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Product { id: number; title: string; price: number }

const SERVER_PRODUCTS: Product[] = [
  { id: 1, title: 'Pixel 8', price: 699 },
  { id: 2, title: 'iPhone 15', price: 999 },
  { id: 3, title: 'Galaxy S24', price: 899 },
  { id: 4, title: 'OnePlus 12', price: 799 },
]

let fetchCalls = 0

async function mockFetch(input: RequestInfo | URL): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as Request).url
  fetchCalls += 1
  window.dispatchEvent(new CustomEvent('http-tick'))
  await new Promise(r => setTimeout(r, 500))

  if (/\/products$/.test(url)) {
    return new Response(JSON.stringify(SERVER_PRODUCTS), { status: 200 })
  }
  const m = /\/products\/(\d+)$/.exec(url)
  if (m) {
    const id = Number(m[1])
    const p = SERVER_PRODUCTS.find(x => x.id === id)
    if (!p) return new Response('{}', { status: 404 })
    return new Response(JSON.stringify(p), { status: 200 })
  }
  return new Response('{}', { status: 404 })
}

const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://mock.local/', fetchFn: mockFetch as typeof fetch }),
  tagTypes: ['Product'],
  endpoints: (build) => ({
    getProducts: build.query<Product[], void>({
      query: () => 'products',
      providesTags: [{ type: 'Product', id: 'LIST' }],
    }),
    getProduct: build.query<Product, number>({
      query: (id) => `products/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Product', id }],
    }),
  }),
})

const { useGetProductsQuery, useGetProductQuery, usePrefetch } = api

const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (gdm) => gdm().concat(api.middleware),
})

const con = new ConsolePanel(document.getElementById('console-container')!,
  'Manual cache — все 5 api.util утилит с визуальным feedback')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── shared visual events ─────────────────────────────────────────────
type FlashKind = 'price' | 'spawn' | 'refetch' | 'undo' | 'nuke'
function emitFlash(productId: number, kind: FlashKind): void {
  window.dispatchEvent(new CustomEvent('flash', { detail: { productId, kind } }))
}
function useFlash(id: number): FlashKind | null {
  const [kind, setKind] = useState<FlashKind | null>(null)
  useEffect(() => {
    const handler = (e: Event): void => {
      const detail = (e as CustomEvent<{ productId: number; kind: FlashKind }>).detail
      if (detail.productId === id || detail.productId === -1) {
        setKind(detail.kind)
        const dur = detail.kind === 'spawn' ? 600 : detail.kind === 'nuke' ? 500 : detail.kind === 'undo' ? 800 : detail.kind === 'refetch' ? 1400 : 1000
        setTimeout(() => setKind(null), dur)
      }
    }
    window.addEventListener('flash', handler)
    return () => window.removeEventListener('flash', handler)
  }, [id])
  return kind
}

// ── reactive HTTP counter ───────────────────────────────────────────
function HttpCounter(): ReactElement {
  const [, force] = useState(0)
  const [bump, setBump] = useState(false)
  useEffect(() => {
    const h = (): void => {
      force(n => n + 1)
      setBump(true)
      setTimeout(() => setBump(false), 400)
    }
    window.addEventListener('http-tick', h)
    return () => window.removeEventListener('http-tick', h)
  }, [])
  return (
    <span className={`stat-num ${bump ? 'bump' : ''}`}>{fetchCalls}</span>
  )
}

// ── live cache table ────────────────────────────────────────────────
interface CacheRow {
  key: string
  status: string
  age: number
  isNew: boolean
}
function CacheTable(): ReactElement {
  const [rows, setRows] = useState<CacheRow[]>([])
  const seenRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const update = (): void => {
      const apiState = store.getState().api as {
        queries?: Record<string, { status?: string; fulfilledTimeStamp?: number } | undefined>
      }
      const queries = apiState.queries ?? {}
      const now = Date.now()
      const newRows: CacheRow[] = Object.entries(queries).map(([key, v]) => {
        const isNew = !seenRef.current.has(key)
        seenRef.current.add(key)
        return {
          key,
          status: v?.status ?? '—',
          age: v?.fulfilledTimeStamp ? Math.round((now - v.fulfilledTimeStamp) / 1000) : 0,
          isNew,
        }
      })
      // detect deleted (e.g., after resetApiState)
      for (const k of seenRef.current) {
        if (!queries[k]) seenRef.current.delete(k)
      }
      setRows(newRows)
    }
    update()
    const unsub = store.subscribe(update)
    const i = setInterval(update, 500) // refresh ages
    return () => { unsub(); clearInterval(i) }
  }, [])

  return (
    <div className="cache-table">
      <h5>state.api.queries — live snapshot</h5>
      <div className="cache-row" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
        <span>cacheKey</span>
        <span>status</span>
        <span>возраст</span>
      </div>
      {rows.length === 0
        ? <div style={{ color: 'var(--text-muted)', padding: 6, fontStyle: 'italic' }}>— пусто —</div>
        : rows.map(r => (
          <div key={r.key} className={`cache-row ${r.isNew ? 'flash' : ''}`}>
            <span className="cache-row__key">{r.key}</span>
            <span className={`cache-row__status ${r.status}`}>{r.status}</span>
            <span className="cache-row__age">{r.age}s</span>
          </div>
        ))
      }
    </div>
  )
}

// ── ProductCard с flash-анимациями ──────────────────────────────────
function ProductCard({ p, source }: { p: Product; source?: string }): ReactElement {
  const flashKind = useFlash(p.id)
  const flashGlobal = useFlash(-1)
  const cls = ['product', flashKind ? `flash-${flashKind}` : '', flashGlobal ? `flash-${flashGlobal}` : ''].filter(Boolean).join(' ')
  return (
    <div className={cls}>
      <div className="product__id">#{p.id}{source && ` · ${source}`}</div>
      <div className="product__title">{p.title}</div>
      <div className="product__price">${p.price}</div>
    </div>
  )
}

// ── Prefetched targets — отдельная live-зона ────────────────────────
function PrefetchTarget({ id }: { id: number }): ReactElement {
  const q = useGetProductQuery(id, { skip: false })
  // skip:false означает "подписаться на entry если она есть"
  // но prefetch не создавал подписки — entry будет HIT
  if (q.isUninitialized) return <div className="product" style={{ opacity: 0.3 }}>
    <div className="product__id">#{id}</div>
    <div className="product__title" style={{ color: 'var(--text-muted)' }}>не запрошен</div>
  </div>
  if (q.isLoading) return <div className="product" style={{ borderColor: 'var(--accent)' }}>
    <div className="product__id">#{id}</div>
    <div className="product__title">загрузка...</div>
  </div>
  if (!q.data) return <div className="product" style={{ opacity: 0.3 }}>
    <div className="product__id">#{id}</div>
    <div className="product__title">нет данных</div>
  </div>
  return <ProductCard p={q.data} source={'prefetched'} />
}

// ── основной список ─────────────────────────────────────────────────
function ProductList(): ReactElement {
  const q = useGetProductsQuery()
  const flashGlobal = useFlash(-2) // refetch для всего списка
  if (q.isLoading) return <div style={{ color: 'var(--text-muted)', padding: 10 }}>загрузка…</div>
  if (!q.data || q.data.length === 0) {
    return <div className={`reset-banner`} style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 4 }}>
      — список пуст (resetApiState стёр кеш) —
    </div>
  }
  return (
    <div className={`products ${q.isFetching && !q.isLoading ? 'is-refetching' : ''}`}>
      {q.data.map(p => <ProductCard key={p.id} p={p} />)}
    </div>
  )
}

// ── upsert target ──────────────────────────────────────────────────
function UpsertTarget(): ReactElement {
  const q = useGetProductQuery(99)
  if (q.isUninitialized || (!q.data && !q.isLoading)) {
    return <div className="product" style={{ opacity: 0.3, display: 'inline-block' }}>
      <div className="product__id">#99</div>
      <div className="product__title" style={{ color: 'var(--text-muted)' }}>entry не существует</div>
    </div>
  }
  if (q.isLoading) return <div className="product" style={{ display: 'inline-block' }}>
    <div className="product__title">загрузка…</div>
  </div>
  if (!q.data) return <></>
  return <div style={{ display: 'inline-block' }}><ProductCard p={q.data} source="upsert" /></div>
}

// ── App ────────────────────────────────────────────────────────────
function Products(): ReactElement {
  const q = useGetProductsQuery()
  const prefetchProduct = usePrefetch('getProduct')

  const onUpdatePrices = (): void => {
    const r = store.dispatch(
      api.util.updateQueryData('getProducts', undefined, (draft) => {
        for (const p of draft) p.price = Math.round(p.price * 0.9)
      })
    )
    // flash для всех видимых товаров
    if (q.data) for (const p of q.data) emitFlash(p.id, 'price')
    con.success(`-10% updateQueryData · ${r.patches.length} patches. Жми "↶ undo" чтобы откатить.`)
    ;(window as unknown as { lastPatch?: { undo: () => void } }).lastPatch = r
  }

  const onUndo = (): void => {
    const lp = (window as unknown as { lastPatch?: { undo: () => void } }).lastPatch
    if (lp) {
      lp.undo()
      if (q.data) for (const p of q.data) emitFlash(p.id, 'undo')
      con.info('↶ undo() — inverse patches применены, цены вернулись')
    } else {
      con.warn('Нет patchResult для undo')
    }
  }

  const onUpsert = (): void => {
    store.dispatch(
      api.util.upsertQueryData('getProduct', 99, { id: 99, title: 'Fake Phone (из воздуха)', price: 100 })
    )
    setTimeout(() => emitFlash(99, 'spawn'), 30)
    con.success('upsertQueryData getProduct(99) · entry создана fulfilled, БЕЗ сети')
  }

  const onPrefetch = (id: number, opts?: { force?: boolean; ifOlderThan?: number }): void => {
    prefetchProduct(id, opts)
    con.info(`prefetch(${id}, ${JSON.stringify(opts)}) — entry появится в cache table ниже`)
    // подсветим карточку через 600ms когда fetch завершится
    setTimeout(() => emitFlash(id, 'spawn'), 600)
  }

  const onInvalidateLIST = (): void => {
    store.dispatch(api.util.invalidateTags([{ type: 'Product', id: 'LIST' }]))
    if (q.data) for (const p of q.data) emitFlash(p.id, 'refetch')
    con.warn("invalidateTags [{type:'Product',id:'LIST'}] → getProducts уходит в pending → refetch")
  }

  const onInvalidateOne = (id: number): void => {
    store.dispatch(api.util.invalidateTags([{ type: 'Product', id }]))
    emitFlash(id, 'refetch')
    con.warn(`invalidateTags [{type:'Product',id:${id}}] → getProduct(${id}) refetch`)
  }

  const onReset = (): void => {
    if (q.data) for (const p of q.data) emitFlash(p.id, 'nuke')
    setTimeout(() => {
      store.dispatch(api.util.resetApiState())
      con.error('resetApiState · queries, mutations, subs, provided — всё стёрто')
      fetchCalls = 0
      window.dispatchEvent(new Event('http-tick'))
    }, 350)
  }

  return (
    <div>
      <div className="actions-grid">
        <div className="action-card">
          <h5>1. updateQueryData — скидка -10% на все</h5>
          <p>Immer-рецепт, сеть не дёргается. Карточки ниже мигнут жёлтым (price flash).</p>
          <button className="btn btn--accent" onClick={onUpdatePrices}>-10% updateQueryData</button>
          <button className="btn" style={{ marginLeft: 6 }} onClick={onUndo}>↶ undo</button>
        </div>

        <div className="action-card">
          <h5>2. upsertQueryData — запихнуть #99</h5>
          <p>Появится «Fake Phone» в зелёной анимации spawn — без сетевого запроса.</p>
          <button className="btn btn--accent" onClick={onUpsert}>upsertQueryData(99)</button>
        </div>

        <div className="action-card">
          <h5>3. prefetch — загрузить заранее</h5>
          <p>HTTP +1, новая запись в таблице кеша снизу + карточка появится в "prefetched".</p>
          <button className="btn" onClick={() => onPrefetch(1, { force: true })}>prefetch(1, force)</button>
          <button className="btn" style={{ marginLeft: 6 }} onClick={() => onPrefetch(2, { ifOlderThan: 5 })}>prefetch(2)</button>
          <button className="btn" style={{ marginLeft: 6 }} onClick={() => onPrefetch(3, { force: true })}>prefetch(3, force)</button>
        </div>

        <div className="action-card">
          <h5>4. invalidateTags — внешний сигнал</h5>
          <p>Карточки мигнут синим (refetch flash) — идёт background fetch.</p>
          <button className="btn" onClick={onInvalidateLIST}>invalidate LIST</button>
          <button className="btn" style={{ marginLeft: 6 }} onClick={() => onInvalidateOne(1)}>invalidate #1</button>
          <button className="btn" style={{ marginLeft: 6 }} onClick={() => onInvalidateOne(3)}>invalidate #3</button>
        </div>

        <div className="action-card">
          <h5>5. resetApiState — nuke</h5>
          <p>Карточки красно ужмутся → исчезнут → кеш очищен полностью.</p>
          <button className="btn btn--danger" onClick={onReset}>⚠ resetApiState</button>
        </div>

        <div className="action-card">
          <h5>HTTP calls counter</h5>
          <p>Реактивный — обновляется при каждом mockFetch.</p>
          <p style={{ marginTop: 8 }}>
            <HttpCounter />
            <span style={{ color: 'var(--text-muted)', fontSize: '.78rem', marginLeft: 8 }}>сетевых запросов</span>
          </p>
        </div>
      </div>

      <h4 style={{ color: 'var(--accent-cyan)', fontSize: '.9rem', marginTop: 14 }}>
        getProducts → data
      </h4>
      <ProductList />

      <h4 style={{ color: 'var(--accent-cyan)', fontSize: '.9rem', marginTop: 16 }}>
        Prefetched products (свежие cache entries без активной подписки)
      </h4>
      <div className="products" style={{ marginTop: 6 }}>
        <PrefetchTarget id={1} />
        <PrefetchTarget id={2} />
        <PrefetchTarget id={3} />
        <PrefetchTarget id={4} />
      </div>

      <h4 style={{ color: 'var(--accent-cyan)', fontSize: '.9rem', marginTop: 16 }}>
        upsertQueryData target — getProduct(99)
      </h4>
      <UpsertTarget />

      <CacheTable />
    </div>
  )
}

const host = document.getElementById('react-root')!
createRoot(host).render(
  <StrictMode>
    <Provider store={store}>
      <Products />
    </Provider>
  </StrictMode>,
)

con.info('1. -10% → жёлтый pulse на каждой карточке (без сети). ↶ undo → красный shake.')
con.info('2. upsertQueryData(99) → зелёный spawn-эффект на новой #99.')
con.info('3. prefetch(N) → HTTP counter +1, новая строка в cache table, карточка появится в prefetched.')
con.info('4. invalidate → синий refetch-pulse + isFetching=true в фоне.')
con.info('5. resetApiState → красный nuke → исчезновение → cache table опустеет.')
