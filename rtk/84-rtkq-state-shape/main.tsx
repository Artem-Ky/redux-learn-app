import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── mock ──────────────────────────────────────────────────────────
interface Post { id: number; title: string; body: string }
const POSTS: Record<number, Post> = {
  1: { id: 1, title: 'Pilot', body: 'First post' },
  2: { id: 2, title: 'Second', body: 'More text' },
  3: { id: 3, title: 'Third', body: 'Even more' },
  4: { id: 4, title: 'Fourth', body: 'Continued' },
  5: { id: 5, title: 'Fifth', body: 'Final' },
}
let idSeq = 5

async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as Request).url ?? String(input)
  const method = init?.method ?? 'GET'
  await new Promise((r) => setTimeout(r, 450))

  if (method === 'GET' && url.includes('/posts/')) {
    const id = Number(url.split('/posts/')[1])
    const p = POSTS[id]
    if (!p) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    return new Response(JSON.stringify(p), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  if (method === 'POST' && url.endsWith('/posts')) {
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    const title = String(body.title ?? 'untitled')
    idSeq += 1
    const next: Post = { id: idSeq, title, body: 'new' }
    POSTS[idSeq] = next
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
    getPost: build.query<Post, number>({
      query: (id) => `posts/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Post', id }],
    }),
    addPost: build.mutation<Post, { title: string }>({
      query: (body) => ({ url: 'posts', method: 'POST', body }),
      invalidatesTags: ['Post'],
    }),
  }),
})

const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (gdm) => gdm().concat(api.middleware),
})

// ── panels ────────────────────────────────────────────────────────
const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог state.api — какие поля меняются от каких actions')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── proxy dispatch для лога rtkq-actions ──────────────────────────
const origDispatch = store.dispatch
;(store as unknown as { dispatch: typeof origDispatch }).dispatch = ((action: unknown) => {
  const r = origDispatch(action as never)
  const typed = action as { type?: string } | undefined
  if (typed?.type && (typed.type.startsWith('api/') || typed.type.startsWith('__rtkq/'))) {
    con.action(typed as { type: string }, 'rtkq')
  }
  return r
}) as typeof origDispatch

// ── render tree ───────────────────────────────────────────────────
const $tree = document.getElementById('state-tree')!
interface SubState {
  queries?: Record<string, { status?: string; endpointName?: string; data?: unknown; requestId?: string; error?: unknown } | undefined>
  mutations?: Record<string, { status?: string; endpointName?: string; data?: unknown; requestId?: string } | undefined>
  provided?: { tags?: Record<string, Record<string, string[]>>; keys?: Record<string, unknown[]> }
  subscriptions?: Record<string, Record<string, Record<string, unknown>>>
  config?: Record<string, unknown>
}
let prevSliceStr = ''

function statusClass(s?: string): string {
  if (s === 'fulfilled') return 'fulfilled'
  if (s === 'pending') return 'pending'
  if (s === 'rejected') return 'rejected'
  return ''
}

function renderTree(): void {
  const slice = (store.getState() as Record<string, SubState>)[api.reducerPath]
  const queries = slice.queries ?? {}
  const mutations = slice.mutations ?? {}
  const provided = slice.provided ?? { tags: {}, keys: {} }
  const subs = (store.getState() as Record<string, SubState>)[api.reducerPath].subscriptions ?? {}
  const config = slice.config ?? {}

  const queryKeys = Object.keys(queries).filter((k) => queries[k])
  const mutKeys = Object.keys(mutations).filter((k) => mutations[k])
  const tagNames = Object.keys(provided.tags ?? {})
  const subKeys = Object.keys(subs)

  const queriesHtml = queryKeys.length === 0
    ? '<span class="tree-val">{}</span><span class="tree-comment">— пусто</span>'
    : queryKeys.map((k) => {
        const e = queries[k]!
        return `
          <div class="tree-branch">
            <span class="tree-subkey">${k}</span>
            <div class="entry-detail">
              <div class="entry-detail__row"><span class="entry-detail__label">status</span><span class="entry-detail__value ${statusClass(e.status)}">${e.status ?? '—'}</span></div>
              <div class="entry-detail__row"><span class="entry-detail__label">endpointName</span><span class="entry-detail__value">${e.endpointName ?? '—'}</span></div>
              <div class="entry-detail__row"><span class="entry-detail__label">requestId</span><span class="entry-detail__value">${e.requestId ?? '—'}</span></div>
              <div class="entry-detail__row"><span class="entry-detail__label">data</span><span class="entry-detail__value">${e.data ? JSON.stringify(e.data).slice(0, 50) : '—'}</span></div>
            </div>
          </div>
        `
      }).join('')

  const mutationsHtml = mutKeys.length === 0
    ? '<span class="tree-val">{}</span><span class="tree-comment">— пусто</span>'
    : mutKeys.map((k) => {
        const e = mutations[k]!
        return `
          <div class="tree-branch">
            <span class="tree-subkey">${k.slice(0, 8)}…</span>
            <div class="entry-detail">
              <div class="entry-detail__row"><span class="entry-detail__label">status</span><span class="entry-detail__value ${statusClass(e.status)}">${e.status ?? '—'}</span></div>
              <div class="entry-detail__row"><span class="entry-detail__label">endpoint</span><span class="entry-detail__value">${e.endpointName ?? '—'}</span></div>
              <div class="entry-detail__row"><span class="entry-detail__label">data</span><span class="entry-detail__value">${e.data ? JSON.stringify(e.data).slice(0, 50) : '—'}</span></div>
            </div>
          </div>
        `
      }).join('')

  const providedHtml = tagNames.length === 0
    ? '<span class="tree-val">{ tags: {}, keys: {} }</span>'
    : `
      <div class="tree-branch">
        <span class="tree-key">tags</span>
        ${tagNames.map((tag) => {
          const byId = provided.tags![tag]
          const ids = Object.keys(byId)
          return `
            <div class="tree-branch">
              <span class="tree-subkey">${tag}</span>
              ${ids.map((id) => `
                <div class="tree-branch">
                  <span class="tree-val">[${id}]</span>
                  <span class="tree-comment">→ ${byId[id].length} cacheKey(s)</span>
                </div>
              `).join('')}
            </div>
          `
        }).join('')}
      </div>
      <div class="tree-branch">
        <span class="tree-key">keys</span>
        <span class="tree-comment">${Object.keys(provided.keys ?? {}).length} обратных записи</span>
      </div>
    `

  const subsHtml = subKeys.length === 0
    ? '<span class="tree-val">{}</span><span class="tree-comment">— пусто</span>'
    : subKeys.map((k) => {
        const reqs = Object.keys(subs[k] ?? {})
        return `
          <div class="tree-branch">
            <span class="tree-subkey">${k}</span>
            <span class="counter-pill">${reqs.length} sub${reqs.length === 1 ? '' : 's'}</span>
          </div>
        `
      }).join('')

  const configHtml = `
    <div class="tree-branch">
      <div><span class="tree-subkey">online</span>: <span class="tree-val">${String(config.online)}</span></div>
      <div><span class="tree-subkey">focused</span>: <span class="tree-val">${String(config.focused)}</span></div>
      <div><span class="tree-subkey">middlewareRegistered</span>: <span class="tree-val">${String(config.middlewareRegistered)}</span></div>
      <div><span class="tree-subkey">keepUnusedDataFor</span>: <span class="tree-val">${String(config.keepUnusedDataFor)} сек</span></div>
      <div><span class="tree-subkey">refetchOnFocus</span>: <span class="tree-val">${String(config.refetchOnFocus)}</span></div>
      <div><span class="tree-subkey">refetchOnReconnect</span>: <span class="tree-val">${String(config.refetchOnReconnect)}</span></div>
    </div>
  `

  const sliceStr = JSON.stringify({ queryKeys, mutKeys, tagNames, subKeys, config })
  const prev = prevSliceStr
  prevSliceStr = sliceStr

  const highlight = (section: string, data: unknown): string => {
    const snap = JSON.stringify(data)
    const changed = !prev.includes(snap)
    return changed && prev !== '' ? ` highlight` : ''
  }

  $tree.innerHTML = `
    <div><span class="tree-key">state.api</span> = {</div>
    <div class="tree-branch${highlight('queries', queryKeys)}">
      <span class="tree-key">queries</span> <span class="counter-pill">${queryKeys.length}</span> = {
      ${queriesHtml}
    </div>
    <div class="tree-branch${highlight('mutations', mutKeys)}">
      <span class="tree-key">mutations</span> <span class="counter-pill">${mutKeys.length}</span> = {
      ${mutationsHtml}
    </div>
    <div class="tree-branch${highlight('provided', tagNames)}">
      <span class="tree-key">provided</span> = {
      ${providedHtml}
    </div>
    <div class="tree-branch${highlight('subscriptions', subKeys)}">
      <span class="tree-key">subscriptions</span> <span class="counter-pill">${subKeys.length}</span> = {
      ${subsHtml}
    </div>
    <div class="tree-branch${highlight('config', config)}">
      <span class="tree-key">config</span> = {
      ${configHtml}
    </div>
    <div>}</div>
  `
}
renderTree()
store.subscribe(renderTree)

// ── controls ─────────────────────────────────────────────────────
type Sub = { unwrap: () => Promise<unknown>; unsubscribe: () => void; requestId: string }
const subsById = new Map<number, Sub>()

function getId(): number {
  return Number((document.getElementById('q-id') as HTMLInputElement).value) || 1
}

document.getElementById('q-fetch')!.addEventListener('click', async () => {
  const id = getId()
  const sub = store.dispatch(api.endpoints.getPost.initiate(id)) as unknown as Sub
  subsById.set(id, sub)
  con.info(`dispatch(getPost.initiate(${id})) → queries['getPost(${id})'] = pending`)
  try {
    await sub.unwrap()
    con.success(`fulfilled · requestId=${sub.requestId.slice(0, 8)}…`)
  } catch (err) {
    con.error(`rejected · ${JSON.stringify(err)}`)
  }
})

document.getElementById('q-refetch')!.addEventListener('click', () => {
  const sub = store.dispatch(api.endpoints.getPost.initiate(1, { forceRefetch: true })) as unknown as Sub
  subsById.set(1, sub)
  con.info('refetch(1, { forceRefetch: true }) → pending → fulfilled, requestId обновляется')
})

document.getElementById('q-unsub')!.addEventListener('click', () => {
  const sub = subsById.get(1)
  if (!sub) { con.warn('для id=1 не было активной подписки'); return }
  sub.unsubscribe()
  subsById.delete(1)
  con.warn('unsubscribe(getPost(1)) → subscriptions[key] очищен, через keepUnusedDataFor (60s) cache entry удалится')
})

document.getElementById('m-send')!.addEventListener('click', async () => {
  const title = (document.getElementById('m-title') as HTMLInputElement).value || 'Untitled'
  const sub = store.dispatch(api.endpoints.addPost.initiate({ title })) as unknown as Sub
  con.info(`dispatch(addPost.initiate({title:'${title}'})) → mutations[${sub.requestId.slice(0, 8)}…] = pending`)
  try {
    const res = await sub.unwrap()
    con.success(`mutation fulfilled · ${JSON.stringify(res).slice(0, 80)}`)
    con.info('invalidatesTags: [\'Post\'] → все provided.Post.* cacheKeys помечены для refetch')
  } catch (err) {
    con.error(`mutation rejected · ${JSON.stringify(err)}`)
  }
})

document.getElementById('focus-on')!.addEventListener('click', () => {
  store.dispatch({ type: '__rtkq/focused' })
  con.info('dispatch(__rtkq/focused) → config.focused = true. Если refetchOnFocus:true — refetch всех активных queries')
})

document.getElementById('offline')!.addEventListener('click', () => {
  store.dispatch({ type: '__rtkq/offline' })
  con.warn('dispatch(__rtkq/offline) → config.online = false')
})

document.getElementById('reset')!.addEventListener('click', () => {
  store.dispatch(api.util.resetApiState())
  subsById.clear()
  con.warn('api.util.resetApiState() → reducer(undefined, ...) → все 5 sub-slice reset в initialState')
})

con.info('Играй: 1) fetchPost → смотри queries + subscriptions + provided. 2) addPost → mutations + invalidation.')
con.info('3) unsubscribe → subscriptions очищается, но queries[key] остаётся (keepUnusedDataFor = 60s).')
con.info('4) resetApiState → всё дерево обнуляется одним combineReducers(undefined).')
