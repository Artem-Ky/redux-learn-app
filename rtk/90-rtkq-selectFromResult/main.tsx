import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { Provider } from 'react-redux'
import { StrictMode, memo, useRef, useState, useEffect, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── domain ────────────────────────────────────────────────────────
interface Post { id: number; title: string; likes: number }

const SERVER_POSTS: Post[] = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  title: `Пост номер ${i + 1}`,
  likes: Math.floor(Math.random() * 10),
}))

async function mockFetch(input: RequestInfo | URL): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as Request).url
  await new Promise(r => setTimeout(r, 200))
  if (/\/posts$/.test(url)) {
    return new Response(JSON.stringify(SERVER_POSTS), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  return new Response('{}', { status: 404 })
}

// ── api — только GET /posts. Лайки делаем напрямую через updateQueryData. ──
const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://mock.local/', fetchFn: mockFetch as typeof fetch }),
  endpoints: (build) => ({
    getPosts: build.query<Post[], void>({
      query: () => 'posts',
    }),
  }),
})

const { useGetPostsQuery } = api

// КЛЮЧЕВОЕ для чистоты эксперимента: отключаем autoBatchEnhancer.
// С ним несколько dispatch в одной микротаске схлопывались в 1 уведомление.
// Нам нужен ровно 1 dispatch → 1 уведомление → видно реальное число рендеров.
const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (gdm) => gdm().concat(api.middleware),
  enhancers: (getDefault) => getDefault({ autoBatch: false }),
})

// ── panels ────────────────────────────────────────────────────────
const con = new ConsolePanel(document.getElementById('console-container')!,
  'Лог selectFromResult — после клика смотри Δ NAIVE vs OPTIMIZED')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── глобальные счётчики ──────────────────────────────────────────────
const renderStats = {
  naive: 0,
  optimized: 0,
  reset() { this.naive = 0; this.optimized = 0 },
}

// ── NaiveRow — подписка на ВЕСЬ q.data ──────────────────────────────
const NaiveRow = memo(function NaiveRow({ id }: { id: number }): ReactElement {
  const q = useGetPostsQuery()
  const post = q.data?.find(p => p.id === id)
  const renderCountRef = useRef(0)
  renderCountRef.current += 1
  renderStats.naive += 1
  if (!post) return <></>
  return (
    <div className="post-row">
      <span className="post-row__id">#{post.id}</span>
      <span className="post-row__title">{post.title}</span>
      <span className="post-row__likes">♥ {post.likes}</span>
      <span className="post-row__renders">renders: <strong>{renderCountRef.current}</strong></span>
    </div>
  )
})

// ── OptimizedRow — selectFromResult ─────────────────────────────────
const OptimizedRow = memo(function OptimizedRow({ id }: { id: number }): ReactElement {
  const { post } = useGetPostsQuery(undefined, {
    selectFromResult: ({ data }) => ({ post: data?.find(p => p.id === id) }),
  })
  const renderCountRef = useRef(0)
  renderCountRef.current += 1
  renderStats.optimized += 1
  if (!post) return <></>
  return (
    <div className="post-row">
      <span className="post-row__id">#{post.id}</span>
      <span className="post-row__title">{post.title}</span>
      <span className="post-row__likes">♥ {post.likes}</span>
      <span className="post-row__renders">renders: <strong>{renderCountRef.current}</strong></span>
    </div>
  )
})

// ── StatHeader — отдельный компонент, не оборачивает строки ──────────
function StatHeader({ kind, label }: { kind: 'naive' | 'optimized'; label: string }): ReactElement {
  const [, force] = useState(0)
  useEffect(() => {
    const i = setInterval(() => force(n => n + 1), 200)
    return () => clearInterval(i)
  }, [])
  return (
    <div className={`stat-card ${kind === 'optimized' ? 'good' : 'bad'}`}>
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__val">всего рендеров: {renderStats[kind]}</div>
    </div>
  )
}

// ── App ────────────────────────────────────────────────────────────
function App(): ReactElement {
  useEffect(() => {
    const handlers: Array<[HTMLElement, () => void]> = []
    const make = (selector: string, fn: () => void): void => {
      const $el = document.getElementById(selector)
      if (!$el) return
      $el.addEventListener('click', fn)
      handlers.push([$el, fn])
    }

    // Прямой patch кеша — РОВНО ОДИН dispatch на клик.
    // Никаких pending/fulfilled, никакого flash → чистые цифры.
    const patchLike = (id: number, label: string): void => {
      const before = { naive: renderStats.naive, optimized: renderStats.optimized }
      con.action({ type: label }, 'demo')
      store.dispatch(api.util.updateQueryData('getPosts', undefined, (draft) => {
        const p = draft.find(x => x.id === id)
        if (p) p.likes += 1
      }))
      // Один frame достаточно — нет async-action'ов после patch
      requestAnimationFrame(() => {
        const dN = renderStats.naive - before.naive
        const dO = renderStats.optimized - before.optimized
        const ratio = dO > 0 ? (dN / dO).toFixed(1) : '∞'
        con.success(`Δ ${label}: NAIVE +${dN} · OPTIMIZED +${dO} · ratio ${ratio}x`)
      })
    }

    make('btn-like-5', () => patchLike(5, 'patch #5'))
    make('btn-like-50', () => patchLike(50, 'patch #50'))
    make('btn-reset', () => {
      renderStats.reset()
      con.warn('renderStats сброшены — кликни ОДИН раз и смотри Δ в логе')
    })
    return () => { for (const [el, fn] of handlers) el.removeEventListener('click', fn) }
  }, [])

  return (
    <div className="stat-bar">
      <div>
        <StatHeader kind="naive" label="NAIVE (подписан на весь data)" />
        <div style={{ maxHeight: 360, overflow: 'auto', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 4, marginTop: 6 }}>
          {Array.from({ length: 100 }, (_, i) => <NaiveRow key={i + 1} id={i + 1} />)}
        </div>
      </div>
      <div>
        <StatHeader kind="optimized" label="OPTIMIZED (selectFromResult)" />
        <div style={{ maxHeight: 360, overflow: 'auto', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 4, marginTop: 6 }}>
          {Array.from({ length: 100 }, (_, i) => <OptimizedRow key={i + 1} id={i + 1} />)}
        </div>
      </div>
    </div>
  )
}

const host = document.getElementById('react-root')!
createRoot(host).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)

con.info('Алгоритм: 1) "сброс рендеров" → 2) кликни "+1 лайк #5" ОДИН раз → смотри Δ в логе.')
con.info('Ожидание (StrictMode dev): NAIVE +200 (100 строк × 2), OPTIMIZED +2 (только #5 × 2). Ratio = 100x.')
con.info('Если ratio < 50 — обнови страницу (Cmd+Shift+R), Vite HMR мог не подхватить.')
