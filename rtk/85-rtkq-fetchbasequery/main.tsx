import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── mock ──────────────────────────────────────────────────────────
interface LastReq {
  url: string
  method: string
  headers: Record<string, string>
  body: string | null
}
let lastReq: LastReq | null = null

async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as Request).url ?? String(input)
  const method = init?.method ?? 'GET'
  const headers: Record<string, string> = {}
  new Headers(init?.headers ?? {}).forEach((v, k) => { headers[k] = v })
  const body = init?.body != null ? String(init.body) : null
  lastReq = { url, method, headers, body }

  // искусственная задержка
  const slow = url.includes('slow=1')
  await new Promise((r) => setTimeout(r, slow ? 2000 : 400))

  // /echo-headers — отражает принятые headers
  if (url.includes('/echo-headers')) {
    return new Response(JSON.stringify({ receivedHeaders: headers }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })
  }

  // /echo-query — возвращает query params
  if (url.includes('/echo-query')) {
    const q = Object.fromEntries(new URL(url, 'https://x').searchParams)
    return new Response(JSON.stringify({ receivedQuery: q }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })
  }

  // /teapot — всегда 418
  if (url.includes('/teapot')) {
    return new Response(JSON.stringify({ code: 'IM_A_TEAPOT' }), { status: 418, headers: { 'content-type': 'application/json' } })
  }

  // /no-content — 204 без body
  if (url.includes('/no-content')) {
    return new Response(null, { status: 204 })
  }

  // /html-oops — контент text/html вместо JSON (для PARSING_ERROR demo)
  if (url.includes('/html-oops')) {
    return new Response('<html><body>oops</body></html>', { status: 200, headers: { 'content-type': 'text/html' } })
  }

  // /create — POST с body
  if (method === 'POST' && url.includes('/create')) {
    const parsed = body ? JSON.parse(body) : {}
    return new Response(JSON.stringify({ created: true, echoBody: parsed }), {
      status: 201, headers: { 'content-type': 'application/json' },
    })
  }

  // default
  return new Response(JSON.stringify({ ok: true, path: url }), { status: 200, headers: { 'content-type': 'application/json' } })
}

// ── fake "auth" slice для prepareHeaders demo ─────────────────────
const authSlice = {
  name: 'auth',
  initialState: { token: 'token-abc-123' },
  reducer: (state = { token: 'token-abc-123' }) => state,
}

// ── api ───────────────────────────────────────────────────────────
const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://mock.local/v1/',
    fetchFn: mockFetch as typeof fetch,
    // 👀 prepareHeaders: прикладывает Bearer из state
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as { auth?: { token?: string } }
      const token = state.auth?.token
      if (token) headers.set('authorization', `Bearer ${token}`)
      headers.set('x-client', 'rtk-learn-85')
      return headers
    },
    paramsSerializer: (params) => {
      // сериализатор в "массивы через запятую": ids=1,2,3
      const parts: string[] = []
      for (const [k, v] of Object.entries(params)) {
        if (Array.isArray(v)) parts.push(`${k}=${v.join(',')}`)
        else if (v != null) parts.push(`${k}=${encodeURIComponent(String(v))}`)
      }
      return parts.join('&')
    },
  }),
  endpoints: (build) => ({
    echoHeaders: build.query<{ receivedHeaders: Record<string, string> }, void>({
      query: () => 'echo-headers',
    }),
    echoQuery: build.query<{ receivedQuery: Record<string, string> }, { ids: number[]; q: string }>({
      query: (args) => ({ url: 'echo-query', params: args as unknown as Record<string, unknown> }),
    }),
    teapot: build.query<unknown, void>({
      query: () => 'teapot',
    }),
    noContent: build.query<unknown, void>({
      query: () => ({ url: 'no-content', responseHandler: (res) => (res.status === 204 ? Promise.resolve(null) : res.json()) }),
    }),
    htmlOops: build.query<unknown, void>({
      query: () => 'html-oops',
    }),
    slowReq: build.query<unknown, void>({
      query: () => ({ url: 'slow=1', timeout: 800 }),
    }),
    createPost: build.mutation<unknown, { title: string; tags: string[] }>({
      query: (body) => ({ url: 'create', method: 'POST', body }),
    }),
  }),
})

// повторное создание api с validateStatus (для кнопки teapot-ok)
const apiTeapotOk = createApi({
  reducerPath: 'apiTeapotOk',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://mock.local/v1/',
    fetchFn: mockFetch as typeof fetch,
    validateStatus: (res) => res.status === 418 || (res.status >= 200 && res.status <= 299),
  }),
  endpoints: (build) => ({
    teapotOk: build.query<unknown, void>({ query: () => 'teapot' }),
  }),
})

const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    [api.reducerPath]: api.reducer,
    [apiTeapotOk.reducerPath]: apiTeapotOk.reducer,
  },
  middleware: (gdm) => gdm().concat(api.middleware, apiTeapotOk.middleware),
})

// ── panels ────────────────────────────────────────────────────────
const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог fetchBaseQuery — каждый option в деле')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── блоки опций ────────────────────────────────────────────────────
interface Opt {
  name: string
  desc: string
  controlsHtml: string
  bindHandlers: (root: HTMLElement) => void
}

function renderReq(req: LastReq | null): string {
  if (!req) return '<span style="color: var(--text-muted);">— ещё не было запроса —</span>'
  const headersStr = Object.entries(req.headers).map(([k, v]) => `<span class="req-view__key">${k}</span>: <span class="req-view__val">${v}</span>`).join('\n')
  return `<div class="req-view__head">${req.method} ${req.url}</div>${headersStr}${req.body ? `\n\n<span class="req-view__key">body</span>: <span class="req-view__val">${req.body}</span>` : ''}`
}

function renderResult(res: unknown, err: unknown): string {
  return `
    <div class="res-view">
      <div class="res-view__panel ${res ? 'success' : ''}">
        <h5>data</h5>
        <pre style="margin: 0; white-space: pre-wrap;">${res ? JSON.stringify(res, null, 2) : '—'}</pre>
      </div>
      <div class="res-view__panel ${err ? 'error' : ''}">
        <h5>error</h5>
        <pre style="margin: 0; white-space: pre-wrap;">${err ? JSON.stringify(err, null, 2) : '—'}</pre>
      </div>
    </div>
  `
}

const opts: Opt[] = [
  {
    name: 'baseUrl',
    desc: 'Префикс для каждого URL. FetchArgs.url добавляется к нему через joinUrls.',
    controlsHtml: `
      <div class="mini-inputs">
        <button class="btn btn--accent" data-act="base">▶ GET echo-headers</button>
      </div>
      <div class="req-view" data-req></div>
      <div data-out></div>
    `,
    bindHandlers: (root) => {
      root.querySelector<HTMLButtonElement>('[data-act="base"]')!.addEventListener('click', async () => {
        const sub = store.dispatch(api.endpoints.echoHeaders.initiate()) as unknown as { unwrap: () => Promise<unknown>; unsubscribe: () => void }
        try {
          const res = await sub.unwrap()
          root.querySelector('[data-req]')!.innerHTML = renderReq(lastReq)
          root.querySelector('[data-out]')!.innerHTML = renderResult(res, null)
          con.success(`GET https://mock.local/v1/echo-headers — смотри headers внизу (Bearer + x-client)`)
        } catch (err) {
          root.querySelector('[data-out]')!.innerHTML = renderResult(null, err)
        }
        setTimeout(() => sub.unsubscribe(), 0)
      })
    },
  },
  {
    name: 'prepareHeaders',
    desc: 'Функция (headers, api) => Headers. Читает getState() и инжектит Authorization, x-client и т.д.',
    controlsHtml: `
      <div class="mini-inputs">
        <button class="btn btn--accent" data-act="prep">▶ с Bearer токеном</button>
        <span style="font-size: .78rem; color: var(--text-muted); margin-left: 6px; align-self: center;">
          Нажми → смотри "authorization: Bearer token-abc-123" в headers
        </span>
      </div>
      <div class="req-view" data-req></div>
    `,
    bindHandlers: (root) => {
      root.querySelector<HTMLButtonElement>('[data-act="prep"]')!.addEventListener('click', async () => {
        const sub = store.dispatch(api.endpoints.echoHeaders.initiate(undefined, { forceRefetch: true })) as unknown as { unwrap: () => Promise<unknown>; unsubscribe: () => void }
        await sub.unwrap().catch(() => {})
        root.querySelector('[data-req]')!.innerHTML = renderReq(lastReq)
        con.info('prepareHeaders получил (headers, { getState, arg, endpoint, type, forced, extra, extraOptions })')
        setTimeout(() => sub.unsubscribe(), 0)
      })
    },
  },
  {
    name: 'paramsSerializer',
    desc: 'По умолчанию URLSearchParams (ids=1&ids=2). В этом API — "ids=1,2,3" (через запятую).',
    controlsHtml: `
      <div class="mini-inputs">
        <input type="text" data-q value="test" />
        <button class="btn btn--accent" data-act="params">▶ echo-query?ids=[1,2,3]</button>
      </div>
      <div class="req-view" data-req></div>
      <div data-out></div>
    `,
    bindHandlers: (root) => {
      root.querySelector<HTMLButtonElement>('[data-act="params"]')!.addEventListener('click', async () => {
        const q = root.querySelector<HTMLInputElement>('[data-q]')!.value
        const sub = store.dispatch(api.endpoints.echoQuery.initiate({ ids: [1, 2, 3], q })) as unknown as { unwrap: () => Promise<unknown>; unsubscribe: () => void }
        try {
          const res = await sub.unwrap()
          root.querySelector('[data-req]')!.innerHTML = renderReq(lastReq)
          root.querySelector('[data-out]')!.innerHTML = renderResult(res, null)
          con.success('paramsSerializer(params) → "ids=1,2,3&q=test" (комма, а не повторы)')
        } catch (err) {
          root.querySelector('[data-out]')!.innerHTML = renderResult(null, err)
        }
        setTimeout(() => sub.unsubscribe(), 0)
      })
    },
  },
  {
    name: 'body + auto JSON',
    desc: 'plain-object body автоматически JSON.stringify + content-type: application/json.',
    controlsHtml: `
      <div class="mini-inputs">
        <input type="text" data-title value="Hello" />
        <button class="btn btn--accent" data-act="post">▶ POST /create</button>
      </div>
      <div class="req-view" data-req></div>
      <div data-out></div>
    `,
    bindHandlers: (root) => {
      root.querySelector<HTMLButtonElement>('[data-act="post"]')!.addEventListener('click', async () => {
        const title = root.querySelector<HTMLInputElement>('[data-title]')!.value
        const sub = store.dispatch(api.endpoints.createPost.initiate({ title, tags: ['rtk', 'fetch'] })) as unknown as { unwrap: () => Promise<unknown>; unsubscribe: () => void }
        try {
          const res = await sub.unwrap()
          root.querySelector('[data-req]')!.innerHTML = renderReq(lastReq)
          root.querySelector('[data-out]')!.innerHTML = renderResult(res, null)
          con.success('body → JSON.stringify, content-type → application/json (auto)')
        } catch (err) {
          root.querySelector('[data-out]')!.innerHTML = renderResult(null, err)
        }
        setTimeout(() => sub.unsubscribe(), 0)
      })
    },
  },
  {
    name: 'validateStatus',
    desc: 'Default: 200–299. Сравни — два api: один считает 418 ошибкой, второй — нет.',
    controlsHtml: `
      <div class="mini-inputs">
        <button class="btn btn--danger" data-act="def">▶ default validate (418 = error)</button>
        <button class="btn btn--accent" data-act="custom">▶ custom validate (418 = ok)</button>
      </div>
      <div data-out></div>
    `,
    bindHandlers: (root) => {
      root.querySelector<HTMLButtonElement>('[data-act="def"]')!.addEventListener('click', async () => {
        const sub = store.dispatch(api.endpoints.teapot.initiate()) as unknown as { unwrap: () => Promise<unknown>; unsubscribe: () => void }
        try {
          const res = await sub.unwrap()
          root.querySelector('[data-out]')!.innerHTML = renderResult(res, null)
        } catch (err) {
          root.querySelector('[data-out]')!.innerHTML = renderResult(null, err)
          con.error('default: 418 → { status: 418, data: { code: "IM_A_TEAPOT" } }')
        }
        setTimeout(() => sub.unsubscribe(), 0)
      })
      root.querySelector<HTMLButtonElement>('[data-act="custom"]')!.addEventListener('click', async () => {
        const sub = store.dispatch(apiTeapotOk.endpoints.teapotOk.initiate()) as unknown as { unwrap: () => Promise<unknown>; unsubscribe: () => void }
        try {
          const res = await sub.unwrap()
          root.querySelector('[data-out]')!.innerHTML = renderResult(res, null)
          con.success('custom validateStatus: 418 → { data: { code: "IM_A_TEAPOT" } }')
        } catch (err) {
          root.querySelector('[data-out]')!.innerHTML = renderResult(null, err)
        }
        setTimeout(() => sub.unsubscribe(), 0)
      })
    },
  },
  {
    name: 'responseHandler',
    desc: 'json (default) | text | content-type | (res)=>Promise. Для 204 No Content / не-JSON ответов.',
    controlsHtml: `
      <div class="mini-inputs">
        <button class="btn btn--danger" data-act="oops">▶ html-oops (default=json → PARSING_ERROR)</button>
        <button class="btn btn--accent" data-act="nc">▶ no-content (custom handler)</button>
      </div>
      <div data-out></div>
    `,
    bindHandlers: (root) => {
      root.querySelector<HTMLButtonElement>('[data-act="oops"]')!.addEventListener('click', async () => {
        const sub = store.dispatch(api.endpoints.htmlOops.initiate()) as unknown as { unwrap: () => Promise<unknown>; unsubscribe: () => void }
        try {
          const res = await sub.unwrap()
          root.querySelector('[data-out]')!.innerHTML = renderResult(res, null)
        } catch (err) {
          root.querySelector('[data-out]')!.innerHTML = renderResult(null, err)
          con.error('default handler=json → response.json() бросает → {status: "PARSING_ERROR", data: "<html>..."}')
        }
        setTimeout(() => sub.unsubscribe(), 0)
      })
      root.querySelector<HTMLButtonElement>('[data-act="nc"]')!.addEventListener('click', async () => {
        const sub = store.dispatch(api.endpoints.noContent.initiate()) as unknown as { unwrap: () => Promise<unknown>; unsubscribe: () => void }
        try {
          const res = await sub.unwrap()
          root.querySelector('[data-out]')!.innerHTML = renderResult(res, null)
          con.success('custom responseHandler: 204 → return null, вместо json-parse')
        } catch (err) {
          root.querySelector('[data-out]')!.innerHTML = renderResult(null, err)
        }
        setTimeout(() => sub.unsubscribe(), 0)
      })
    },
  },
  {
    name: 'timeout',
    desc: 'ms. Объединяется с api.signal через anySignal → AbortController. Срабатывает → TIMEOUT_ERROR.',
    controlsHtml: `
      <div class="mini-inputs">
        <button class="btn btn--danger" data-act="to">▶ GET slow=1 (2000ms) · timeout=800ms</button>
      </div>
      <div data-out></div>
    `,
    bindHandlers: (root) => {
      root.querySelector<HTMLButtonElement>('[data-act="to"]')!.addEventListener('click', async () => {
        const sub = store.dispatch(api.endpoints.slowReq.initiate()) as unknown as { unwrap: () => Promise<unknown>; unsubscribe: () => void }
        try {
          const res = await sub.unwrap()
          root.querySelector('[data-out]')!.innerHTML = renderResult(res, null)
        } catch (err) {
          root.querySelector('[data-out]')!.innerHTML = renderResult(null, err)
          con.error('timeout=800ms, запрос 2000ms → {status: "TIMEOUT_ERROR", error: "AbortError: ..."}')
        }
        setTimeout(() => sub.unsubscribe(), 0)
      })
    },
  },
]

const $opts = document.getElementById('opts')!
$opts.innerHTML = opts.map((o, i) => `
  <div class="opt-block" data-idx="${i}">
    <div class="opt-block__title">
      <span class="opt-block__name">${o.name}</span>
    </div>
    <div class="opt-block__desc">${o.desc}</div>
    ${o.controlsHtml}
  </div>
`).join('')

$opts.querySelectorAll<HTMLElement>('.opt-block').forEach((el) => {
  const idx = Number(el.dataset.idx)
  opts[idx].bindHandlers(el)
})

con.info('Опции идут в порядке жизненного цикла: baseUrl → params → headers → body → validateStatus → responseHandler → timeout.')
con.info('Каждая кнопка — один setting fetchBaseQuery. Смотри req-view для диагностики, что реально отправлено.')
