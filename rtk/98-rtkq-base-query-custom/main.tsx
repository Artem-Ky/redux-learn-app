import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { StrictMode, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── auth slice — hold текущий токен ────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState: { token: 'expired_token_v1' },
  reducers: {
    setToken: (s, a: PayloadAction<string>) => { s.token = a.payload },
    logout: (s) => { s.token = '' },
  },
})
const { setToken, logout } = authSlice.actions

// ── mock server — проверяет токен ───────────────────────────────────
let serverValidToken = 'fresh_token_v2'
let log: Array<{ k: 'req' | 'ok' | 'err' | 'reauth'; msg: string; ts: number }> = []
function addLog(k: 'req' | 'ok' | 'err' | 'reauth', msg: string): void {
  log = [...log, { k, msg, ts: Date.now() }]
  window.dispatchEvent(new CustomEvent('bq-log'))
}

async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as Request).url
  const method = init?.method ?? 'GET'
  const auth = (init?.headers as Record<string, string> | undefined)?.['Authorization'] ?? (init?.headers as Headers | undefined)?.get?.('Authorization')
  const token = auth?.replace('Bearer ', '')
  await new Promise(r => setTimeout(r, 180))

  if (/\/auth\/refresh$/.test(url)) {
    addLog('reauth', `POST /auth/refresh → new token`)
    return new Response(JSON.stringify({ token: serverValidToken }), { status: 200 })
  }

  if (method === 'GET' && /\/me$/.test(url)) {
    if (token !== serverValidToken) {
      addLog('err', `GET /me → 401 (token=${token?.slice(0, 12)}...)`)
      return new Response(JSON.stringify({ message: 'token expired' }), { status: 401 })
    }
    addLog('ok', `GET /me → 200 (valid token)`)
    return new Response(JSON.stringify({ id: 1, name: 'Alice', email: 'alice@mail' }), { status: 200 })
  }
  return new Response('{}', { status: 404 })
}

// ── baseQuery с prepareHeaders ───────────────────────────────────────
const rawBaseQuery = fetchBaseQuery({
  baseUrl: 'https://mock.local/',
  fetchFn: mockFetch as typeof fetch,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as { auth: { token: string } }).auth.token
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return headers
  },
})

// ── custom baseQuery с reauth ─────────────────────────────────────
let isRefreshing = false

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs, unknown, FetchBaseQueryError
> = async (args, api, extraOpts) => {
  const url = typeof args === 'string' ? args : args.url
  addLog('req', `→ ${url}`)
  let result = await rawBaseQuery(args, api, extraOpts)

  if (result.error?.status === 401) {
    // Simple "mutex" через флаг: в реальной проде — async-mutex
    if (!isRefreshing) {
      isRefreshing = true
      try {
        const refresh = await rawBaseQuery({ url: 'auth/refresh', method: 'POST' }, api, extraOpts)
        if (refresh.data) {
          api.dispatch(setToken((refresh.data as { token: string }).token))
          addLog('req', `↻ retry ${url} с новым токеном`)
          result = await rawBaseQuery(args, api, extraOpts)
        } else {
          api.dispatch(logout())
          addLog('err', 'refresh упал → logout')
        }
      } finally {
        isRefreshing = false
      }
    } else {
      // ждём пока первый refresh завершится
      while (isRefreshing) await new Promise(r => setTimeout(r, 30))
      result = await rawBaseQuery(args, api, extraOpts)
    }
  }
  return result
}

interface User { id: number; name: string; email: string }

const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  endpoints: (build) => ({
    getMe: build.query<User, void>({ query: () => 'me' }),
  }),
})

const { useGetMeQuery } = api

const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer, auth: authSlice.reducer },
  middleware: (gdm) => gdm().concat(api.middleware),
})

const con = new ConsolePanel(document.getElementById('console-container')!,
  'Custom baseQuery — reauth на 401')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

function Demo(): ReactElement {
  const token = useSelector((s: { auth: { token: string } }) => s.auth.token)
  const dispatch = useDispatch()
  const q = useGetMeQuery()
  const [, force] = useState(0)

  useState(() => {
    const h = (): void => force(n => n + 1)
    window.addEventListener('bq-log', h)
  })

  const expireToken = (): void => {
    dispatch(setToken('expired_token_v' + Math.floor(Math.random() * 1000)))
    con.warn('токен подменён на невалидный — следующий fetch даст 401 → авто-reauth')
    q.refetch()
  }

  return (
    <div>
      <div style={{ padding: 10, background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 4, marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '.82rem' }}>
        <span>client token:</span>
        <strong style={{ color: 'var(--accent-yellow)' }}>{token || '(logout)'}</strong>
        <button className="btn btn--danger" onClick={expireToken}>expire + refetch</button>
        <button className="btn" onClick={() => { log = []; force(n => n + 1) }}>clear log</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <h5 style={{ color: 'var(--accent-cyan)', fontSize: '.82rem', margin: '0 0 6px' }}>useGetMeQuery()</h5>
          {q.isLoading && <div style={{ color: 'var(--text-muted)' }}>loading…</div>}
          {q.isError && <div className="err-box" style={{ background: 'var(--bg-panel)', border: '1px solid var(--accent-red)', padding: 8, borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: '.76rem' }}>
            error: {JSON.stringify(q.error)}
          </div>}
          {q.data && (
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--success)', padding: 10, borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: '.8rem' }}>
              <div>id: <strong>{q.data.id}</strong></div>
              <div>name: <strong>{q.data.name}</strong></div>
              <div>email: <strong>{q.data.email}</strong></div>
            </div>
          )}
        </div>
        <div>
          <h5 style={{ color: 'var(--accent-cyan)', fontSize: '.82rem', margin: '0 0 6px' }}>baseQuery log</h5>
          <div className="custom-log">
            {log.length === 0
              ? <div style={{ color: 'var(--text-muted)' }}>— пусто —</div>
              : log.map((e, i) => (
                <div key={i} className={`bq-row ${e.k}`}>
                  [{new Date(e.ts).toLocaleTimeString()}] {e.msg}
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}

const host = document.getElementById('react-root')!
createRoot(host).render(
  <StrictMode>
    <Provider store={store}>
      <Demo />
    </Provider>
  </StrictMode>,
)

con.info('1. При старте токен expired → 401 → auto-refresh → retry → успех.')
con.info('2. Жми "expire + refetch" → снова 401 → снова refresh → retry.')
con.info('3. В логе видны 3 строки: исходный запрос, /auth/refresh, retry с новым токеном.')
