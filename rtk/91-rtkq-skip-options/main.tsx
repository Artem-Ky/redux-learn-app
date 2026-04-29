import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery, setupListeners } from '@reduxjs/toolkit/query/react'
import { skipToken } from '@reduxjs/toolkit/query'
import { Provider } from 'react-redux'
import { StrictMode, useEffect, useRef, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Time { iso: string; ts: number }
let fetchCount = 0

async function mockFetch(input: RequestInfo | URL): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as Request).url
  fetchCount += 1
  await new Promise(r => setTimeout(r, 250))
  if (/\/time$/.test(url)) {
    const now = new Date()
    return new Response(JSON.stringify({ iso: now.toISOString(), ts: now.getTime() }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })
  }
  return new Response('{}', { status: 404 })
}

const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://mock.local/', fetchFn: mockFetch as typeof fetch }),
  endpoints: (build) => ({
    getTime: build.query<Time, void>({ query: () => 'time' }),
  }),
})

const { useGetTimeQuery } = api

const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (gdm) => gdm().concat(api.middleware),
})
// КЛЮЧЕВОЕ: без этого refetchOnFocus/refetchOnReconnect не работают
setupListeners(store.dispatch)

const con = new ConsolePanel(document.getElementById('console-container')!,
  'Опции useQuery — игра с тогглами, лог dispatched actions')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

function Demo(): ReactElement {
  const [skip, setSkip] = useState(false)
  const [useSkipToken, setUseSkipToken] = useState(false)
  const [refetchOnMount, setRefetchOnMount] = useState<'false' | 'true' | '5'>('false')
  const [refetchOnFocus, setRefetchOnFocus] = useState(false)
  const [refetchOnReconnect, setRefetchOnReconnect] = useState(false)
  const [pollingInterval, setPollingInterval] = useState(0)
  const [skipPollingIfUnfocused, setSkipPollingIfUnfocused] = useState(false)
  const [mountKey, setMountKey] = useState(0)

  const q = useGetTimeQuery(
    useSkipToken && skip ? skipToken : (skip ? skipToken : undefined) as never,
    {
      refetchOnMountOrArgChange:
        refetchOnMount === 'true' ? true :
        refetchOnMount === 'false' ? false :
        Number(refetchOnMount),
      refetchOnFocus,
      refetchOnReconnect,
      pollingInterval,
      skipPollingIfUnfocused,
    }
  )
  const prevFulfilledRef = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (q.fulfilledTimeStamp && q.fulfilledTimeStamp !== prevFulfilledRef.current) {
      prevFulfilledRef.current = q.fulfilledTimeStamp
      con.success(`fulfilled · total fetches = ${fetchCount}`)
    }
  }, [q.fulfilledTimeStamp])

  const remount = (): void => { setMountKey(k => k + 1); con.info('↻ remount компонента — смотри refetchOnMountOrArgChange') }

  return (
    <div>
      <div className="opts-grid">
        <div className="opt">
          <div className="opt__head">
            <span>skip</span>
            <span className="opt__val">{String(skip)}</span>
          </div>
          <label><input type="checkbox" checked={skip} onChange={e => setSkip(e.target.checked)} /> skip=true</label>
          <label><input type="checkbox" checked={useSkipToken} onChange={e => setUseSkipToken(e.target.checked)} /> использовать skipToken</label>
        </div>
        <div className="opt">
          <div className="opt__head">
            <span>refetchOnMountOrArgChange</span>
            <span className="opt__val">{refetchOnMount}</span>
          </div>
          <label><input type="radio" name="rom" checked={refetchOnMount === 'false'} onChange={() => setRefetchOnMount('false')} /> false (cache)</label>
          <label><input type="radio" name="rom" checked={refetchOnMount === 'true'} onChange={() => setRefetchOnMount('true')} /> true (всегда)</label>
          <label><input type="radio" name="rom" checked={refetchOnMount === '5'} onChange={() => setRefetchOnMount('5')} /> 5 сек (TTL)</label>
          <button className="btn" style={{ marginTop: 6 }} onClick={remount}>↻ remount</button>
        </div>
        <div className="opt">
          <div className="opt__head"><span>refetchOnFocus</span><span className="opt__val">{String(refetchOnFocus)}</span></div>
          <label><input type="checkbox" checked={refetchOnFocus} onChange={e => setRefetchOnFocus(e.target.checked)} /> вкл · переключись на другое окно и вернись</label>
        </div>
        <div className="opt">
          <div className="opt__head"><span>refetchOnReconnect</span><span className="opt__val">{String(refetchOnReconnect)}</span></div>
          <label><input type="checkbox" checked={refetchOnReconnect} onChange={e => setRefetchOnReconnect(e.target.checked)} /> вкл · DevTools → Network → Offline → Online</label>
        </div>
        <div className="opt">
          <div className="opt__head"><span>pollingInterval (ms)</span><span className="opt__val">{pollingInterval}</span></div>
          <input type="range" min={0} max={10000} step={500} value={pollingInterval} onChange={e => setPollingInterval(Number(e.target.value))} />
          <label><input type="checkbox" checked={skipPollingIfUnfocused} onChange={e => setSkipPollingIfUnfocused(e.target.checked)} /> skipPollingIfUnfocused</label>
        </div>
        <div className="opt">
          <div className="opt__head"><span>status</span><span className="opt__val">
            {q.isUninitialized ? 'uninitialized' :
             q.isLoading ? 'loading' :
             q.isFetching ? 'fetching' :
             q.isSuccess ? 'success' :
             q.isError ? 'error' : 'idle'}
          </span></div>
          <div style={{ fontSize: '.78rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {q.data ? q.data.iso : '— нет данных —'}
          </div>
        </div>
      </div>

      <div className="status-bar">
        <span>total fetches: <strong>{fetchCount}</strong></span>
        <span>cacheKey: <strong>getTime(undefined)</strong></span>
        <span>fulfilledAt: <strong>{q.fulfilledTimeStamp ?? '—'}</strong></span>
      </div>
      <div key={mountKey} style={{ display: 'none' }}>{/* remount trigger */}</div>
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

con.info('1. skip=true → запрос не пойдёт, data остаётся от прошлого успешного fetch.')
con.info('2. refetchOnMountOrArgChange=true + ↻ remount — при каждом re-mount уходит forceRefetch.')
con.info('3. refetchOnFocus=true — переключись на другое приложение и вернись — уходит refetch.')
con.info('4. pollingInterval=2000 — каждые 2s авто-рефетч. Выключишь skipPollingIfUnfocused → поллит даже в фоне.')
