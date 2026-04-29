import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { Provider } from 'react-redux'
import { StrictMode, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

let attemptLog: Array<{ n: number; kind: 'attempt' | 'ok' | 'fail'; msg: string; ts: number }> = []
let attemptSeq = 0

async function mockFetch(input: RequestInfo | URL): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as Request).url
  attemptSeq += 1
  const n = attemptSeq
  attemptLog = [...attemptLog, { n, kind: 'attempt', msg: `→ attempt #${n} → ${url}`, ts: Date.now() }]
  window.dispatchEvent(new CustomEvent('log-update'))

  await new Promise(r => setTimeout(r, 200))

  const m = /\/posts\?failRate=([\d.]+)/.exec(url)
  const failRate = m ? Number(m[1]) : 0
  const fails = Math.random() < failRate

  if (fails) {
    attemptLog = [...attemptLog, { n, kind: 'fail', msg: `✖ #${n} → 503 (random)`, ts: Date.now() }]
    window.dispatchEvent(new CustomEvent('log-update'))
    return new Response(JSON.stringify({ code: 'SHARD_BUSY', message: 'Shard overloaded, try again' }), { status: 503 })
  }
  attemptLog = [...attemptLog, { n, kind: 'ok', msg: `✔ #${n} → 200`, ts: Date.now() }]
  window.dispatchEvent(new CustomEvent('log-update'))
  return new Response(JSON.stringify([{ id: 1, title: 'ok post' }, { id: 2, title: 'all good' }]), { status: 200 })
}

const baseQuery = fetchBaseQuery({
  baseUrl: 'https://mock.local/',
  fetchFn: mockFetch as typeof fetch,
})

// retry обёртка + bail out на 401
const baseQueryWithRetry = retry(async (args, api, extraOpts) => {
  const result = await baseQuery(args, api, extraOpts)
  if (result.error?.status === 401) {
    retry.fail(result.error)
  }
  return result
}, { maxRetries: 3 })

const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithRetry,
  endpoints: (build) => ({
    getPosts: build.query<Array<{ id: number; title: string }>, { failRate: number }>({
      query: ({ failRate }) => `posts?failRate=${failRate}`,
      // типизируем ошибку: нормализуем shape
      transformErrorResponse: (err: FetchBaseQueryError) => {
        if (typeof err.status === 'number') {
          const body = err.data as { message?: string; code?: string } | undefined
          return { status: err.status, code: body?.code ?? 'HTTP', message: body?.message ?? `HTTP ${err.status}` }
        }
        return { status: err.status, code: 'NETWORK', message: 'Ошибка соединения' }
      },
    }),
  }),
})

const { useGetPostsQuery } = api

const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (gdm) => gdm().concat(api.middleware),
})

const con = new ConsolePanel(document.getElementById('console-container')!,
  'Error handling + retry · смотри attempts / backoff / final result')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

function Demo(): ReactElement {
  const [failRate, setFailRate] = useState(0.5)
  const [tick, setTick] = useState(0)
  const q = useGetPostsQuery({ failRate }, { refetchOnMountOrArgChange: true })
  const [, force] = useState(0)

  useState(() => {
    const handler = (): void => force(n => n + 1)
    window.addEventListener('log-update', handler)
    return handler
  })

  return (
    <div>
      <div style={{ padding: 10, background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 4, display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
        <label style={{ fontFamily: 'var(--font-mono)', fontSize: '.82rem', color: 'var(--accent-cyan)' }}>
          failRate: {(failRate * 100).toFixed(0)}%
        </label>
        <input type="range" min={0} max={1} step={0.1} value={failRate} onChange={e => setFailRate(Number(e.target.value))} style={{ flex: 1 }} />
        <button className="btn btn--accent" onClick={() => { attemptLog = []; setTick(t => t + 1); q.refetch() }}>↻ retry (очистить лог)</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          {q.isLoading && <div style={{ padding: 10, color: 'var(--text-muted)' }}>первая загрузка…</div>}
          {q.isError && (
            <div className="err-box">
              <strong style={{ color: 'var(--accent-red)' }}>✖ Ошибка (после transformErrorResponse)</strong>
              <pre style={{ marginTop: 6, fontSize: '.74rem', color: 'var(--text-secondary)' }}>
                {JSON.stringify(q.error, null, 2)}
              </pre>
            </div>
          )}
          {q.isSuccess && (
            <div className="ok-box">
              <strong style={{ color: 'var(--success)' }}>✔ Успех</strong>
              <pre style={{ marginTop: 6, fontSize: '.74rem', color: 'var(--text-bright)' }}>
                {JSON.stringify(q.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
        <div>
          <h5 style={{ color: 'var(--accent-cyan)', fontSize: '.82rem', margin: '0 0 6px' }}>Attempts log</h5>
          <div className="retry-log">
            {attemptLog.length === 0
              ? <div style={{ color: 'var(--text-muted)', fontSize: '.76rem' }}>— пусто —</div>
              : attemptLog.map((r, i) => (
                <div key={i} className={`retry-row ${r.kind}`}>
                  [{new Date(r.ts).toLocaleTimeString()}] {r.msg}
                </div>
              ))
            }
          </div>
          <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
            maxRetries=3 → максимум 4 attempt'а (1 + 3 ретрая). Backoff exponential + jitter.
          </p>
        </div>
      </div>
      <div key={tick} style={{ display: 'none' }} />
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

con.info('1. failRate=50% — в среднем 1-2 attempt до успеха. В логе видны попытки.')
con.info('2. failRate=100% — все 4 attempt-а упадут → конечная ошибка → видна в панели слева.')
con.info('3. Ошибка прошла через transformErrorResponse → единый формат {status, code, message}.')
