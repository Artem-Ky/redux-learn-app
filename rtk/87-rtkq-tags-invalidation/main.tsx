import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── mock ──────────────────────────────────────────────────────────
interface Post { id: number; title: string }
const POSTS: Post[] = [
  { id: 1, title: 'Intro to RTK Query' },
  { id: 2, title: 'Cache keys explained' },
]
let seq = POSTS.length

async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as Request).url ?? String(input)
  const method = init?.method ?? 'GET'
  await new Promise((r) => setTimeout(r, 450))

  if (method === 'GET' && url.endsWith('/posts')) {
    return new Response(JSON.stringify(POSTS), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  if (method === 'POST' && url.endsWith('/posts')) {
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    seq += 1
    const next: Post = { id: seq, title: String(body.title ?? 'untitled') }
    POSTS.push(next)
    return new Response(JSON.stringify(next), { status: 201, headers: { 'content-type': 'application/json' } })
  }
  if (method === 'POST' && url.endsWith('/noop')) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } })
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
      providesTags: ['Post'],
    }),
    addPost: build.mutation<Post, { title: string }>({
      query: (body) => ({ url: 'posts', method: 'POST', body }),
      invalidatesTags: ['Post'],
    }),
    noopMutation: build.mutation<{ ok: boolean }, void>({
      query: () => ({ url: 'noop', method: 'POST' }),
      // invalidatesTags не задан — список не обновится
    }),
  }),
})

const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (gdm) => gdm().concat(api.middleware),
})

// ── panels ────────────────────────────────────────────────────────
const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог tags — смотри invalidateTags → refetch')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── proxy dispatch для лога rtkq-actions ──────────────────────────
const origDispatch = store.dispatch
;(store as unknown as { dispatch: typeof origDispatch }).dispatch = ((action: unknown) => {
  const r = origDispatch(action as never)
  const typed = action as { type?: string } | undefined
  if (typed?.type && typed.type.startsWith('api/')) {
    con.action(typed as { type: string }, 'api')
  }
  return r
}) as typeof origDispatch

// ── persistent subscription для getPosts (без unsubscribe) ─────────
let getPostsSub: { unwrap: () => Promise<Post[]>; unsubscribe: () => void; refetch: () => void } | null = null
let fetchCount = 0
let prevIds: number[] = []

function mountGetPosts(): void {
  const sub = store.dispatch(api.endpoints.getPosts.initiate()) as unknown as typeof getPostsSub
  getPostsSub = sub
  sub!.unwrap().then(() => {
    con.success('getPosts/fulfilled')
  }).catch((err) => con.error(`getPosts/rejected · ${JSON.stringify(err)}`))
}

mountGetPosts()

// ── render ─────────────────────────────────────────────────────────
const $posts = document.getElementById('posts')!
const $tree = document.getElementById('provided-tree')!
const $count = document.getElementById('fetch-count')!

interface SubState {
  queries?: Record<string, { status?: string; data?: Post[]; startedTimeStamp?: number; fulfilledTimeStamp?: number } | undefined>
  provided?: { tags?: Record<string, Record<string, string[]>>; keys?: Record<string, unknown[]> }
}

let prevFulfilledAt: number | undefined
let invalidatedAt = 0
function render(): void {
  const slice = (store.getState() as Record<string, SubState>)[api.reducerPath]
  const queries = slice.queries ?? {}
  const provided = slice.provided ?? { tags: {}, keys: {} }

  const getPostsCache = queries['getPosts(undefined)']
  const data = getPostsCache?.data ?? []
  const status = getPostsCache?.status

  // render posts
  const curIds = data.map((p) => p.id)
  $posts.innerHTML = data.length === 0
    ? '<div style="color: var(--text-muted); padding: 6px 10px; font-size: .78rem;">— пусто —</div>'
    : data.map((p) => {
        const isFresh = !prevIds.includes(p.id)
        return `
          <div class="post${isFresh ? ' fresh' : ''}">
            <span class="post__id">#${p.id}</span>
            <span class="post__title">${p.title}</span>
            <span class="post__tag">Post</span>
          </div>
        `
      }).join('')
  prevIds = curIds

  // render provided tree
  const tagNames = Object.keys(provided.tags ?? {})
  $tree.innerHTML = tagNames.length === 0
    ? '<div style="color: var(--text-muted);">— нет провайдеров —</div>'
    : tagNames.map((tag) => {
        const byId = provided.tags![tag]
        const ids = Object.keys(byId)
        const justInvalidated = Date.now() - invalidatedAt < 1200
        return `
          <div class="tag-entry${justInvalidated ? ' invalidating' : ''}">
            <span class="tag-entry__name">${tag}</span>
            ${ids.map((id) => `
              <div class="tag-entry__keys">
                [${id}] → ${byId[id].length} cacheKey: ${byId[id].map((k) => `<code>${k}</code>`).join(', ')}
              </div>
            `).join('')}
          </div>
        `
      }).join('')

  // render fetch count — инкрементируем только при каждом новом fulfilledTimeStamp
  if (getPostsCache?.fulfilledTimeStamp && getPostsCache.fulfilledTimeStamp !== prevFulfilledAt && status === 'fulfilled') {
    fetchCount += 1
    $count.textContent = String(fetchCount)
    prevFulfilledAt = getPostsCache.fulfilledTimeStamp
  }
}
render()
store.subscribe(render)

// ── actions ────────────────────────────────────────────────────────
document.getElementById('btn-add')!.addEventListener('click', async () => {
  const title = (document.getElementById('new-title') as HTMLInputElement).value || 'untitled'
  invalidatedAt = Date.now()
  const sub = store.dispatch(api.endpoints.addPost.initiate({ title })) as unknown as { unwrap: () => Promise<Post>; unsubscribe: () => void }
  con.info(`trigger addPost({ title: '${title}' }) → после fulfilled: api/invalidateTags(['Post'])`)
  try {
    const res = await sub.unwrap()
    con.success(`addPost/fulfilled #${res.id}`)
    con.info('→ invalidateTags[\'Post\'] → getPosts имеет activeSubscription → refetch')
  } catch (err) {
    con.error(`addPost/rejected · ${JSON.stringify(err)}`)
  }
})

document.getElementById('btn-noop')!.addEventListener('click', async () => {
  const sub = store.dispatch(api.endpoints.noopMutation.initiate()) as unknown as { unwrap: () => Promise<unknown>; unsubscribe: () => void }
  con.info('trigger noopMutation — НЕТ invalidatesTags → getPosts НЕ переобновляется')
  try {
    await sub.unwrap()
    con.warn('noopMutation/fulfilled, но список остался как был (fetchCount не растёт)')
  } catch (err) {
    con.error(`noop/rejected · ${JSON.stringify(err)}`)
  }
})

con.info('1) Нажми addPost — смотри: api/invalidateTags → api/getPosts/pending → fulfilled. Счётчик fetches += 1.')
con.info('2) Нажми noopMutation — тоже pending/fulfilled, но БЕЗ invalidation → список тот же, счётчик не растёт.')
con.info('3) В provided tree видно, какие cacheKeys зарегистрированы под тегом Post.')
