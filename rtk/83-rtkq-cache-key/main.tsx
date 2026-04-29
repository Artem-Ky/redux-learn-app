import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── mock ──────────────────────────────────────────────────────────
interface User { id: number; name: string; dept: string }
const USERS: User[] = [
  { id: 1, name: 'Alice',   dept: 'engineering' },
  { id: 2, name: 'Bob',     dept: 'design' },
  { id: 3, name: 'Carol',   dept: 'engineering' },
  { id: 4, name: 'Dan',     dept: 'qa' },
  { id: 5, name: 'Eve',     dept: 'engineering' },
  { id: 6, name: 'Frank',   dept: 'design' },
  { id: 7, name: 'Grace',   dept: 'qa' },
  { id: 8, name: 'Henry',   dept: 'engineering' },
]

// Инструментированный счётчик реальных HTTP-вызовов
let networkCalls = 0
async function mockFetch(input: RequestInfo | URL): Promise<Response> {
  networkCalls += 1
  updateStats()
  const url = typeof input === 'string' ? input : (input as Request).url ?? String(input)
  await new Promise((r) => setTimeout(r, 350))
  if (url.includes('/users/')) {
    const id = Number(url.split('/users/')[1])
    const u = USERS.find((x) => x.id === id)
    if (!u) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    return new Response(JSON.stringify(u), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  if (url.includes('/users?')) {
    const q = new URL(url, 'https://x').searchParams
    const query = q.get('query') ?? ''
    const page = Number(q.get('page') ?? 1)
    const sortBy = q.get('sortBy') ?? 'name'
    const filtered = USERS.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
    const sorted = [...filtered].sort((a, b) => (a[sortBy as keyof User] > b[sortBy as keyof User] ? 1 : -1))
    const pageSize = 3
    return new Response(JSON.stringify(sorted.slice((page - 1) * pageSize, page * pageSize)), {
      status: 200, headers: { 'content-type': 'application/json' },
    })
  }
  return new Response(JSON.stringify({ error: 'unknown' }), { status: 500 })
}

// ── api ───────────────────────────────────────────────────────────
interface SearchArgs { query: string; page: number; sortBy: 'name' | 'dept' | 'id' }

const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://mock.local/', fetchFn: mockFetch as typeof fetch }),
  endpoints: (build) => ({
    getUserById: build.query<User, number>({ query: (id) => `users/${id}` }),
    searchUsers: build.query<User[], SearchArgs>({
      query: (args) => ({ url: 'users', params: args as Record<string, string | number> }),
    }),
  }),
})

const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (gdm) => gdm().concat(api.middleware),
})

// ── panels ────────────────────────────────────────────────────────
const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог cache — reuse vs new')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── replicate defaultSerializeQueryArgs для preview ──────────────
function isPlain(v: unknown): v is Record<string, unknown> {
  return Object.prototype.toString.call(v) === '[object Object]'
}
function sortedStringify(v: unknown): string {
  return JSON.stringify(v, (_, value) => {
    if (!isPlain(value)) return value
    return Object.keys(value).sort().reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = (value as Record<string, unknown>)[k]; return acc
    }, {})
  })
}
function previewCacheKey(endpointName: string, args: unknown): string {
  return `${endpointName}(${sortedStringify(args)})`
}

// ── DOM ───────────────────────────────────────────────────────────
const $form = document.getElementById('endpoint-form')!
const $preview = document.getElementById('preview-key')!
const $cacheList = document.getElementById('cache-list')!
const $banner = document.getElementById('result-banner')!
const $badge = document.getElementById('result-badge')!
const $resultKey = document.getElementById('result-key')!
const $timing = document.getElementById('result-timing')!
const $statDispatch = document.getElementById('stat-dispatch')!
const $statHit = document.getElementById('stat-hit')!
const $statMiss = document.getElementById('stat-miss')!
const $statNetwork = document.getElementById('stat-network')!
const $history = document.getElementById('history')!
let currentEndpoint: 'getUserById' | 'searchUsers' = 'getUserById'
let lastArg: unknown = 1

// ── stats / history ──────────────────────────────────────────────
let stats = { dispatch: 0, hit: 0, miss: 0 }
type HistEntry = { n: number; outcome: 'HIT' | 'MISS' | 'ERR'; key: string; ms: number }
const history: HistEntry[] = []

function updateStats(): void {
  $statDispatch.textContent = String(stats.dispatch)
  $statHit.textContent = String(stats.hit)
  $statMiss.textContent = String(stats.miss)
  $statNetwork.textContent = String(networkCalls)
}
function renderHistory(): void {
  if (history.length === 0) {
    $history.innerHTML = '<div style="color: var(--text-muted); font-size: .76rem;">— пусто —</div>'
    return
  }
  $history.innerHTML = history.map((h) => `
    <div class="history-row">
      <span class="history-row__num">#${h.n}</span>
      <span class="history-row__tag ${h.outcome.toLowerCase()}">${h.outcome}</span>
      <span class="history-row__key">${h.key}</span>
      <span class="history-row__ms">${h.ms} ms</span>
    </div>
  `).join('')
}
function pushHistory(entry: HistEntry): void {
  history.unshift(entry)
  if (history.length > 10) history.length = 10
  renderHistory()
}
function setBanner(outcome: 'HIT' | 'MISS' | 'ERR' | 'PENDING', key: string, ms?: number): void {
  $banner.classList.remove('hit', 'miss', 'err')
  if (outcome === 'HIT')  $banner.classList.add('hit')
  if (outcome === 'MISS' || outcome === 'PENDING') $banner.classList.add('miss')
  if (outcome === 'ERR')  $banner.classList.add('err')
  $badge.textContent = outcome === 'PENDING' ? 'FETCH…' : outcome
  $resultKey.textContent = key
  $timing.innerHTML = ms !== undefined
    ? `<strong>${ms} ms</strong><br><span style="font-size:.7rem;">${outcome === 'HIT' ? 'из кэша' : 'по сети'}</span>`
    : (outcome === 'PENDING' ? '<span style="font-size:.7rem; color: var(--accent);">идёт запрос…</span>' : '')
}

// ── form ─────────────────────────────────────────────────────────
function formatEndpointForm(): void {
  if (currentEndpoint === 'getUserById') {
    $form.innerHTML = `
      <div class="input-row">
        <label>id:</label>
        <input id="arg-id" type="number" value="${typeof lastArg === 'number' ? lastArg : 1}" min="1" max="10" />
        <span></span>
        <button class="btn btn--accent" id="run">▶ dispatch</button>
      </div>
    `
    document.getElementById('arg-id')!.addEventListener('input', updatePreview)
  } else {
    const args = (typeof lastArg === 'object' && lastArg !== null ? lastArg : { query: 'a', page: 1, sortBy: 'name' }) as SearchArgs
    $form.innerHTML = `
      <div class="input-row">
        <label>query:</label>
        <input id="arg-query" type="text" value="${args.query}" />
        <input id="arg-page" type="number" value="${args.page}" min="1" max="5" />
        <select id="arg-sortBy">
          <option value="name" ${args.sortBy === 'name' ? 'selected' : ''}>sortBy: name</option>
          <option value="dept" ${args.sortBy === 'dept' ? 'selected' : ''}>sortBy: dept</option>
          <option value="id" ${args.sortBy === 'id' ? 'selected' : ''}>sortBy: id</option>
        </select>
      </div>
      <div class="input-row">
        <label></label>
        <span style="font-size: .78rem; color: var(--text-muted);">
          Попробуй ввести те же значения, но в другом порядке — cacheKey совпадёт (ключи сортируются).
        </span>
        <span></span>
        <button class="btn btn--accent" id="run">▶ dispatch</button>
      </div>
    `
    document.getElementById('arg-query')!.addEventListener('input', updatePreview)
    document.getElementById('arg-page')!.addEventListener('input', updatePreview)
    document.getElementById('arg-sortBy')!.addEventListener('change', updatePreview)
  }
  document.getElementById('run')!.addEventListener('click', runQuery)
  updatePreview()
}

function readArgs(): unknown {
  if (currentEndpoint === 'getUserById') {
    return Number((document.getElementById('arg-id') as HTMLInputElement).value) || 1
  }
  return {
    query: (document.getElementById('arg-query') as HTMLInputElement).value,
    page: Number((document.getElementById('arg-page') as HTMLInputElement).value) || 1,
    sortBy: (document.getElementById('arg-sortBy') as HTMLSelectElement).value as SearchArgs['sortBy'],
  }
}

function updatePreview(): void {
  const args = readArgs()
  lastArg = args
  $preview.textContent = previewCacheKey(currentEndpoint, args)
}

// Flash строки в cache-list при доступе к ней
function flashRow(key: string, outcome: 'hit' | 'miss'): void {
  const nodes = $cacheList.querySelectorAll<HTMLElement>('.cache-entry')
  nodes.forEach((n) => {
    if (n.querySelector('.cache-entry__key')?.textContent === key) {
      n.classList.remove('hit', 'miss')
      // force reflow так анимация перезапускается
      void n.offsetWidth
      n.classList.add(outcome)
    }
  })
}

async function runQuery(): Promise<void> {
  const args = readArgs()
  const key = previewCacheKey(currentEndpoint, args)
  stats.dispatch += 1
  const netBefore = networkCalls

  // Смотрим на cache ДО dispatch: если status === 'fulfilled' → HIT, иначе → MISS
  const slice = (store.getState() as Record<string, { queries?: Record<string, { status?: string } | undefined> }>)[api.reducerPath]
  const existing = slice.queries?.[key]
  const willHit = existing?.status === 'fulfilled'

  setBanner('PENDING', key)
  if (willHit) {
    stats.hit += 1
    con.success(`CACHE HIT · ${key} — вернётся мгновенно, без сетевого вызова`)
  } else {
    stats.miss += 1
    con.info(`CACHE MISS · ${key} → идём в сеть`)
  }
  updateStats()

  const started = performance.now()
  const endpoint = currentEndpoint === 'getUserById'
    ? api.endpoints.getUserById.initiate(args as number)
    : api.endpoints.searchUsers.initiate(args as SearchArgs)
  const sub = store.dispatch(endpoint) as unknown as { unwrap: () => Promise<unknown>; unsubscribe: () => void }

  try {
    const result = await sub.unwrap()
    const ms = Math.round(performance.now() - started)
    const actuallyHit = networkCalls === netBefore  // сеть не дёргалась → реальный HIT
    const outcome: 'HIT' | 'MISS' = actuallyHit ? 'HIT' : 'MISS'
    setBanner(outcome, key, ms)
    flashRow(key, outcome.toLowerCase() as 'hit' | 'miss')
    pushHistory({ n: stats.dispatch, outcome, key, ms })
    con.success(`${outcome} · ${ms}ms · ${JSON.stringify(result).slice(0, 70)}…`)
  } catch (err) {
    const ms = Math.round(performance.now() - started)
    setBanner('ERR', key, ms)
    pushHistory({ n: stats.dispatch, outcome: 'ERR', key, ms })
    con.error(`rejected · ${JSON.stringify(err)}`)
  }
  // Небольшая задержка перед unsubscribe — чтобы keepUnusedDataFor успел
  // зафиксировать время последней подписки
  setTimeout(() => sub.unsubscribe(), 0)
}

// ── render cache list ────────────────────────────────────────────
let prevKeys = new Set<string>()
function renderCache(): void {
  const slice = (store.getState() as Record<string, { queries?: Record<string, { status?: string; endpointName?: string }>; subscriptions?: Record<string, Record<string, unknown>> }>)[api.reducerPath]
  const queries = slice.queries ?? {}
  const subs = slice.subscriptions ?? {}
  const keys = Object.keys(queries).filter((k) => k !== undefined)
  if (keys.length === 0) {
    $cacheList.innerHTML = '<div class="cache-entry"><span style="color: var(--text-muted);">— пусто —</span><span></span><span></span></div>'
    prevKeys = new Set()
    return
  }
  const rows = keys.map((k) => {
    const entry = queries[k]
    const status = entry?.status ?? 'unknown'
    const subCount = Object.keys(subs[k] ?? {}).length
    const isNew = !prevKeys.has(k)
    return `
      <div class="cache-entry ${isNew ? 'new' : ''}">
        <span class="cache-entry__key">${k}</span>
        <span class="cache-entry__status ${status}">${status}</span>
        <span style="text-align: center; color: var(--text-muted);">${subCount}</span>
      </div>`
  })
  $cacheList.innerHTML = rows.join('')
  prevKeys = new Set(keys)
}
renderCache()
store.subscribe(renderCache)

// ── endpoint switcher ───────────────────────────────────────────
document.querySelectorAll<HTMLButtonElement>('button[data-endpoint]').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentEndpoint = btn.dataset.endpoint as typeof currentEndpoint
    lastArg = currentEndpoint === 'getUserById' ? 1 : { query: 'a', page: 1, sortBy: 'name' }
    formatEndpointForm()
    con.info(`endpoint: ${currentEndpoint}`)
  })
})

document.getElementById('reset-cache')!.addEventListener('click', () => {
  store.dispatch(api.util.resetApiState())
  stats = { dispatch: 0, hit: 0, miss: 0 }
  networkCalls = 0
  history.length = 0
  updateStats()
  renderHistory()
  setBanner('PENDING', '— кэш сброшен, следующий dispatch будет MISS —')
  $badge.textContent = 'IDLE'
  $banner.classList.remove('hit', 'miss', 'err')
  $timing.innerHTML = ''
  con.warn('api.util.resetApiState() — весь кэш очищен. Счётчики обнулены.')
})

// ── начальный рендер ─────────────────────────────────────────────
updateStats()
renderHistory()
formatEndpointForm()
con.info('Нажми ▶ dispatch несколько раз с id=1 — первый раз MISS (network: +1), далее HIT (network без изменений).')
con.info('Меняй аргументы — увидишь, как создаётся новый cache entry. Смотри счётчики и историю.')
con.info('Для searchUsers: одинаковые значения в разном порядке → ключ один и тот же (HIT).')
