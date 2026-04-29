import { configureStore, createEntityAdapter, type EntityState } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { Provider } from 'react-redux'
import { StrictMode, useEffect, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── domain ────────────────────────────────────────────────────────
interface Post { id: number; title: string; body: string; draft?: boolean }
interface ApiEnvelope<T> { data: T; meta: { total: number; generatedAt: string } }

// ── mock server — отдаёт "envelope" формат ──────────────────────────
let failNext = false
const RAW_POSTS: Post[] = [
  { id: 1, title: 'intro', body: 'первый пост первый пост первый пост первый', draft: false },
  { id: 2, title: 'draft', body: 'черновик', draft: true },
  { id: 3, title: 'mid',   body: 'средний пост средний пост средний пост', draft: false },
  { id: 4, title: 'last',  body: 'последний пост последний последний', draft: false },
]

async function mockFetch(input: RequestInfo | URL): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as Request).url
  await new Promise(r => setTimeout(r, 380))

  if (failNext) {
    failNext = false
    return new Response(JSON.stringify({ message: 'Server down', code: 'DB_OFFLINE' }),
      { status: 500, headers: { 'content-type': 'application/json' } })
  }

  if (/\/posts$/.test(url)) {
    const envelope: ApiEnvelope<Post[]> = {
      data: RAW_POSTS,
      meta: { total: RAW_POSTS.length, generatedAt: new Date().toISOString() },
    }
    return new Response(JSON.stringify(envelope),
      { status: 200, headers: { 'content-type': 'application/json', 'x-total-count': String(RAW_POSTS.length) } })
  }
  return new Response(JSON.stringify({ error: 'unknown' }), { status: 404 })
}

// ── entity adapter для нормализации ─────────────────────────────────
const postsAdapter = createEntityAdapter<Post>({
  sortComparer: (a, b) => a.id - b.id,
})

interface NormalizedError { code: number | string; message: string }

// ── RTKQ ──────────────────────────────────────────────────────────
const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://mock.local/', fetchFn: mockFetch as typeof fetch }),
  endpoints: (build) => ({
    getPosts: build.query<EntityState<Post, number> & { total: number }, void>({
      query: () => 'posts',
      // transformResponse: разворачиваем envelope + фильтруем drafts + нормализуем
      transformResponse: (response: ApiEnvelope<Post[]>, meta) => {
        const filtered = response.data.filter(p => !p.draft)
        const normalized = postsAdapter.setAll(postsAdapter.getInitialState(), filtered)
        const headerTotal = Number(
          meta?.response?.headers?.get('x-total-count') ?? response.meta.total
        )
        return { ...normalized, total: headerTotal }
      },
      transformErrorResponse: (err: FetchBaseQueryError): NormalizedError => {
        if (typeof err.status === 'number') {
          const body = err.data as { message?: string; code?: string } | undefined
          return { code: body?.code ?? err.status, message: body?.message ?? String(err.status) }
        }
        return { code: err.status, message: 'Ошибка сети' }
      },
    }),
  }),
})

const { useGetPostsQuery } = api

const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (gdm) => gdm().concat(api.middleware),
})

// ── panels ────────────────────────────────────────────────────────
const con = new ConsolePanel(document.getElementById('console-container')!,
  'Лог transformResponse — смотри разницу между raw envelope и нормализованным cache')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── UI ────────────────────────────────────────────────────────────
function RawPreview(): ReactElement {
  const [raw, setRaw] = useState<string>('— не запрашивали —')
  useEffect(() => {
    const loadRaw = async (): Promise<void> => {
      try {
        const r = await mockFetch('https://mock.local/posts')
        const json = await r.json()
        setRaw(JSON.stringify(json, null, 2))
      } catch { /* noop */ }
    }
    loadRaw()
    const $b = document.getElementById('btn-fetch')
    const h = (): void => { loadRaw() }
    $b?.addEventListener('click', h)
    return () => { $b?.removeEventListener('click', h) }
  }, [])
  return (
    <div>
      <div className="box-title">Что отдаёт сервер (raw)</div>
      <div className="raw-box">{raw}</div>
    </div>
  )
}

function TransformedView(): ReactElement {
  const q = useGetPostsQuery()
  const data = q.data
  return (
    <div>
      <div className="box-title">Что лежит в state.api.queries[...].data</div>
      <div className="transformed-box">
        {q.isLoading
          ? 'загрузка…'
          : q.error
          ? `ERROR (после transformErrorResponse):\n${JSON.stringify(q.error, null, 2)}`
          : data
          ? JSON.stringify({
              ids: data.ids,
              entities: data.entities,
              total: data.total,
            }, null, 2)
          : '— пусто —'}
      </div>
    </div>
  )
}

function App(): ReactElement {
  useEffect(() => {
    const $err = document.getElementById('btn-err') as HTMLButtonElement
    const $fetch = document.getElementById('btn-fetch') as HTMLButtonElement
    const onErr = (): void => {
      failNext = true
      con.warn('Следующий fetch → 500. Смотри как transformErrorResponse нормализует { code, message }')
      store.dispatch(api.endpoints.getPosts.initiate(undefined, { forceRefetch: true }))
    }
    const onFetch = (): void => {
      con.info('Forced refetch → transformResponse выполняется заново, результат в cache')
      store.dispatch(api.endpoints.getPosts.initiate(undefined, { forceRefetch: true }))
    }
    $err.addEventListener('click', onErr)
    $fetch.addEventListener('click', onFetch)
    return () => {
      $err.removeEventListener('click', onErr)
      $fetch.removeEventListener('click', onFetch)
    }
  }, [])

  return (
    <div className="split-cols">
      <RawPreview />
      <TransformedView />
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

con.info('Сравни колонки: слева envelope с meta+data и draft-постом; справа — только {ids, entities, total} без draft.')
con.info('transformResponse выполнился один раз при fulfilled → результат мемоизирован в store.')
con.info('Жми "✗ 500" чтобы увидеть ошибку ПОСЛЕ transformErrorResponse — единый формат { code, message }.')
