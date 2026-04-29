import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { Provider } from 'react-redux'
import { StrictMode, useEffect, useRef, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── mock ──────────────────────────────────────────────────────────
interface Post { id: number; title: string; author: string }
const POSTS: Post[] = [
  { id: 1, title: 'RTK Query intro', author: 'Alice' },
  { id: 2, title: 'Cache keys explained', author: 'Bob' },
  { id: 3, title: 'Tags & invalidation', author: 'Carol' },
  { id: 4, title: 'Optimistic updates', author: 'Dave' },
  { id: 5, title: 'WebSocket streaming', author: 'Eve' },
]
let seq = POSTS.length

async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as Request).url ?? String(input)
  const method = init?.method ?? 'GET'
  await new Promise((r) => setTimeout(r, 420))

  if (method === 'GET' && /\/posts$/.test(url)) {
    return new Response(JSON.stringify(POSTS), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  const m = /\/posts\/(\d+)$/.exec(url)
  if (method === 'GET' && m) {
    const id = Number(m[1])
    const p = POSTS.find((x) => x.id === id)
    if (!p) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    return new Response(JSON.stringify(p), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  if (method === 'PATCH' && m) {
    const id = Number(m[1])
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    const p = POSTS.find((x) => x.id === id)
    if (!p) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    Object.assign(p, body)
    return new Response(JSON.stringify(p), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  if (method === 'POST' && /\/posts$/.test(url)) {
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    seq += 1
    const next: Post = { id: seq, title: String(body.title ?? 'untitled'), author: String(body.author ?? 'anon') }
    POSTS.push(next)
    return new Response(JSON.stringify(next), { status: 201, headers: { 'content-type': 'application/json' } })
  }
  return new Response(JSON.stringify({ error: 'unknown' }), { status: 500 })
}

// ── api ───────────────────────────────────────────────────────────
const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://mock.local/', fetchFn: mockFetch as typeof fetch }),
  tagTypes: ['Post'],
  endpoints: (build) => ({
    getPosts: build.query<Post[], void>({
      query: () => 'posts',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Post' as const, id })),
              { type: 'Post' as const, id: 'LIST' },
            ]
          : [{ type: 'Post' as const, id: 'LIST' }],
    }),
    getPost: build.query<Post, number>({
      query: (id) => `posts/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Post', id }],
    }),
    updatePost: build.mutation<Post, { id: number; patch: Partial<Post> }>({
      query: ({ id, patch }) => ({ url: `posts/${id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Post', id: arg.id }],
    }),
    addPost: build.mutation<Post, { title: string; author: string }>({
      query: (body) => ({ url: 'posts', method: 'POST', body }),
      invalidatesTags: [{ type: 'Post', id: 'LIST' }],
    }),
    nukeAll: build.mutation<Post, { id: number; patch: Partial<Post> }>({
      query: ({ id, patch }) => ({ url: `posts/${id}`, method: 'PATCH', body: patch }),
      invalidatesTags: ['Post'],
    }),
  }),
})

const { useGetPostsQuery, useGetPostQuery } = api

const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (gdm) => gdm().concat(api.middleware),
})

// ── panels ────────────────────────────────────────────────────────
const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог tags granular — смотри какие cacheKeys пересчитываются')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── proxy dispatch для лога ────────────────────────────────────────
const origDispatch = store.dispatch
;(store as unknown as { dispatch: typeof origDispatch }).dispatch = ((action: unknown) => {
  const r = origDispatch(action as never)
  const typed = action as { type?: string; payload?: unknown } | undefined
  if (typed?.type && typed.type.startsWith('api/')) {
    con.action(typed as { type: string }, 'api')
  }
  return r
}) as typeof origDispatch

// ── fetch counters по cacheKey ────────────────────────────────────
// Каждая query со своим cacheKey → локальный счётчик fulfilled-переходов.
// Компонент использует useRef чтобы не ресетиться при перерисовке.
function useFetchCount(fulfilledTimeStamp: number | undefined, key: string): number {
  const countRef = useRef<number>(0)
  const prevRef = useRef<number | undefined>(undefined)
  const [, force] = useState(0)
  useEffect(() => {
    if (fulfilledTimeStamp && fulfilledTimeStamp !== prevRef.current) {
      prevRef.current = fulfilledTimeStamp
      countRef.current += 1
      con.info(`[${key}] fulfilled · total fetches = ${countRef.current}`)
      force((n) => n + 1)
    }
  }, [fulfilledTimeStamp, key])
  return countRef.current
}

// ── children ───────────────────────────────────────────────────────
function ListPanel(): ReactElement {
  const q = useGetPostsQuery()
  const count = useFetchCount(q.fulfilledTimeStamp, 'getPosts(undefined)')
  const [flashIds, setFlashIds] = useState<number[]>([])
  const prevTitlesRef = useRef<Map<number, string>>(new Map())

  // при изменении data ищем, какие items обновились (title change) → flash
  useEffect(() => {
    if (!q.data) return
    const changed: number[] = []
    for (const p of q.data) {
      const prev = prevTitlesRef.current.get(p.id)
      if (prev !== undefined && prev !== p.title) changed.push(p.id)
      prevTitlesRef.current.set(p.id, p.title)
    }
    if (changed.length > 0) {
      setFlashIds(changed)
      setTimeout(() => setFlashIds([]), 1200)
    }
  }, [q.data])

  return (
    <div className="panel">
      <h4>getPosts — список (provides [{'{Post,id:1..N}'}, {'{Post,id:\'LIST\'}'}])</h4>
      <p className="panel__hint">
        Fetches: <strong style={{ color: 'var(--accent-cyan)' }}>{count}</strong>
        {q.isFetching && <span style={{ color: 'var(--accent)', marginLeft: 8 }}> · fetching…</span>}
      </p>
      <div>
        {q.data?.map((p) => (
          <div key={p.id} className={`list-row${flashIds.includes(p.id) ? ' flash' : ''}`}>
            <span className="list-row__id">#{p.id}</span>
            <span className="list-row__title">{p.title}</span>
            <span className="list-row__tag">{'{Post,'}{p.id}{'}'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PostCard({ id }: { id: number }): ReactElement {
  const q = useGetPostQuery(id)
  const count = useFetchCount(q.fulfilledTimeStamp, `getPost(${id})`)
  const prevTitleRef = useRef<string | undefined>(undefined)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    if (q.data && prevTitleRef.current !== undefined && prevTitleRef.current !== q.data.title) {
      setFlash(true)
      setTimeout(() => setFlash(false), 1200)
    }
    prevTitleRef.current = q.data?.title
  }, [q.data?.title])

  return (
    <div className={`card${q.isFetching ? ' card--loading' : ''}${flash ? ' flash' : ''}`}>
      <div className="card__head">
        <span>getPost({id})</span>
        <span className={`card__badge${q.isFetching ? ' card__badge--fetching' : ''}`}>
          {q.isFetching ? 'fetch…' : q.isSuccess ? 'ok' : q.isError ? 'err' : 'idle'}
        </span>
      </div>
      <div className="card__title">{q.data?.title ?? '—'}</div>
      <div className="card__meta">
        <span>{q.data?.author ?? '—'}</span>
        <span className="card__fetches">{count} fetches</span>
      </div>
    </div>
  )
}

function ProvidedTree(): ReactElement {
  const [, force] = useState(0)
  useEffect(() => {
    return store.subscribe(() => force((n) => n + 1))
  }, [])
  const slice = (store.getState() as Record<string, unknown>)[api.reducerPath] as {
    provided?: { tags?: Record<string, Record<string, string[]>> }
  }
  const tags = slice?.provided?.tags ?? {}

  return (
    <div className="panel">
      <h4>state.api.provided.tags (live)</h4>
      <p className="panel__hint">
        Обратный индекс: тег → массив cacheKey. Наведи — поймёшь, какие кэши сработают при
        invalidate конкретного bucket.
      </p>
      <div className="tree">
        {Object.keys(tags).length === 0
          ? <span style={{ color: 'var(--text-muted)' }}>— нет провайдеров —</span>
          : Object.entries(tags).map(([tagName, byId]) => (
            <div key={tagName}>
              <div className="tree__entry">
                <span className="tree__name">{tagName}</span>
              </div>
              {Object.entries(byId).map(([id, keys]) => (
                <div key={id} className="tree__entry" style={{ marginLeft: 12 }}>
                  <span className={`tree__id${id === 'LIST' ? ' tree__id--list' : ''}`}>
                    [{id}]
                  </span>
                  {' → '}
                  <code>{keys.join(', ')}</code>
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  )
}

function Counters(): ReactElement {
  // глобальные счётчики вне хуков (работают через subscribe)
  const [, force] = useState(0)
  useEffect(() => {
    return store.subscribe(() => force((n) => n + 1))
  }, [])
  const slice = (store.getState() as Record<string, unknown>)[api.reducerPath] as {
    queries?: Record<string, { status?: string; fulfilledTimeStamp?: number } | undefined>
  }
  const queries = slice.queries ?? {}
  const active = Object.entries(queries)
    .filter(([, v]) => v?.status === 'pending')
    .map(([k]) => k)
  const ready = Object.entries(queries).filter(([, v]) => v?.status === 'fulfilled').length

  return (
    <div className="panel" style={{ marginTop: 10 }}>
      <h4>Снимок state.api.queries</h4>
      <div className="counter-line">
        <span>всего cache entries (fulfilled)</span>
        <strong>{ready}</strong>
      </div>
      <div className="counter-line">
        <span>сейчас pending</span>
        <strong style={{ color: active.length > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
          {active.length === 0 ? '—' : active.length}
        </strong>
      </div>
      {active.length > 0 && (
        <p style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
          {active.join(', ')}
        </p>
      )}
    </div>
  )
}

function App(): ReactElement {
  // Вешаем обработчики на HTML-кнопки. store.dispatch типизирован через
  // configureStore и поддерживает thunk-формы (в отличие от useDispatch без withTypes).
  useEffect(() => {
    const $upd = document.getElementById('btn-update') as HTMLButtonElement
    const $add = document.getElementById('btn-add') as HTMLButtonElement
    const $nuke = document.getElementById('btn-nuke') as HTMLButtonElement
    const $updId = document.getElementById('upd-id') as HTMLInputElement
    const $updTitle = document.getElementById('upd-title') as HTMLInputElement

    const onUpdate = async (): Promise<void> => {
      const id = Math.max(1, Number($updId.value) || 1)
      const title = $updTitle.value || 'updated'
      con.info(`▶ updatePost({ id: ${id}, patch: { title: '${title}' } }) → invalidates [{type:'Post', id:${id}}]`)
      con.info(`  Ожидание: refetch ТОЛЬКО getPosts + getPost(${id}) (оба provides этот тег). Остальные detail-кэши — не трогаются.`)
      try {
        const sub = store.dispatch(api.endpoints.updatePost.initiate({ id, patch: { title } }))
        await (sub as unknown as { unwrap: () => Promise<Post> }).unwrap()
        con.success(`updatePost/fulfilled #${id}`)
        ;(sub as unknown as { reset: () => void }).reset?.()
      } catch (err) {
        con.error(`updatePost rejected · ${JSON.stringify(err)}`)
      }
    }
    const onAdd = async (): Promise<void> => {
      con.info('▶ addPost → invalidates [{type:\'Post\', id:\'LIST\'}]')
      con.info('  Ожидание: refetch ТОЛЬКО getPosts (единственный, кто provides LIST). 5 detail-кэшей — не трогаются.')
      try {
        const sub = store.dispatch(api.endpoints.addPost.initiate({ title: `new @ ${new Date().toLocaleTimeString()}`, author: 'you' }))
        const res = await (sub as unknown as { unwrap: () => Promise<Post> }).unwrap()
        con.success(`addPost/fulfilled #${res.id} — '${res.title}'`)
        ;(sub as unknown as { reset: () => void }).reset?.()
      } catch (err) {
        con.error(`addPost rejected · ${JSON.stringify(err)}`)
      }
    }
    const onNuke = async (): Promise<void> => {
      const id = Math.max(1, Number($updId.value) || 1)
      con.warn('▶ nukeAll → invalidates [\'Post\'] (строковый) — ВСЕ Post-кэши!')
      con.warn('  Ожидание: refetch getPosts + getPost(1..N). Worst-case — 1 update = 6 сетевых вызовов.')
      try {
        const sub = store.dispatch(api.endpoints.nukeAll.initiate({ id, patch: { title: 'nuked at ' + new Date().toLocaleTimeString() } }))
        await (sub as unknown as { unwrap: () => Promise<Post> }).unwrap()
        con.success('nukeAll/fulfilled — наблюдай каскад pending')
        ;(sub as unknown as { reset: () => void }).reset?.()
      } catch (err) {
        con.error(`nukeAll rejected · ${JSON.stringify(err)}`)
      }
    }

    $upd.addEventListener('click', onUpdate)
    $add.addEventListener('click', onAdd)
    $nuke.addEventListener('click', onNuke)
    return () => {
      $upd.removeEventListener('click', onUpdate)
      $add.removeEventListener('click', onAdd)
      $nuke.removeEventListener('click', onNuke)
    }
  }, [])

  return (
    <>
      <div className="board">
        <ListPanel />
        <div>
          <div className="panel">
            <h4>5 detail-кэшей — getPost(1..5) (каждый provides [{'{Post,id:N}'}])</h4>
            <p className="panel__hint">
              Каждый карточка — отдельный cacheKey. Fetches-счётчик на каждой считает,
              сколько раз эта query фулфилилась (первый mount + каждый auto-refetch).
            </p>
            <div className="cards">
              {[1, 2, 3, 4, 5].map((id) => <PostCard key={id} id={id} />)}
            </div>
          </div>
          <Counters />
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <ProvidedTree />
      </div>
    </>
  )
}

// ── mount ──────────────────────────────────────────────────────────
const host = document.getElementById('react-root')!
createRoot(host).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)

con.info('1) Жми updatePost id=3 → видно: getPosts + getPost(3) обе fetch:+1, остальные details — без изменений.')
con.info('2) Жми addPost → getPosts fetch:+1, все 5 details НЕ трогаются (спасибо LIST-тегу).')
con.info('3) Жми nukeAll (invalidatesTags:[\'Post\']) → ВСЕ 6 кэшей fetch:+1 (worst-case).')
con.info('4) Смотри state.api.provided.tags ниже — видишь bucket \'LIST\' и bucket \'N\' для каждого id.')
