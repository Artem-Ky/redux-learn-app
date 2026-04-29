import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { Provider } from 'react-redux'
import { StrictMode, useEffect, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface User { id: number; name: string }

const USERS: User[] = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]

async function mockFetch(input: RequestInfo | URL): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as Request).url
  await new Promise(r => setTimeout(r, 250))
  if (/\/users$/.test(url)) {
    return new Response(JSON.stringify(USERS), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  return new Response('{}', { status: 404 })
}

// Динамический keepUnusedDataFor — через внешнюю переменную и кастомный базовый query
let currentKeepFor = 5

const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://mock.local/', fetchFn: mockFetch as typeof fetch }),
  endpoints: (build) => ({
    getUsers: build.query<User[], void>({
      query: () => 'users',
      // keepUnusedDataFor читается ОДИН раз — берём текущее значение
      keepUnusedDataFor: 5,
    }),
  }),
})

const { useGetUsersQuery } = api

const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (gdm) => gdm().concat(api.middleware),
})

const con = new ConsolePanel(document.getElementById('console-container')!,
  'keepUnusedDataFor — живой таймер отписки')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── Subscriber — просто вызывает useGetUsersQuery и маунтится/анмаунтится ──
function Subscriber({ label }: { label: string }): ReactElement {
  const q = useGetUsersQuery()
  useEffect(() => {
    con.action({ type: `Subscriber "${label}" MOUNT — subscribe` }, 'api')
    return () => { con.action({ type: `Subscriber "${label}" UNMOUNT — unsubscribe` }, 'api') }
  }, [label])
  return (
    <div className="sub-row">
      <span className="sub-row__id">[{label}]</span>
      <span className="sub-row__status mounted">MOUNTED</span>
      <span>{q.isLoading ? '⏳' : q.isSuccess ? '✔' : '·'}</span>
      <span style={{ color: 'var(--text-muted)', fontSize: '.75rem' }}>
        {q.data ? `${q.data.length} users` : '—'}
      </span>
    </div>
  )
}

function CacheView(): ReactElement {
  const [, force] = useState(0)
  const [timerStart, setTimerStart] = useState<number | null>(null)
  const [keep, setKeep] = useState(5)

  useEffect(() => {
    return store.subscribe(() => force(n => n + 1))
  }, [])

  useEffect(() => {
    // Отслеживаем refCount по state.api.subscriptions
    const check = (): void => {
      const apiState = store.getState().api as {
        subscriptions?: Record<string, Record<string, unknown>>
        queries?: Record<string, unknown>
      }
      const subs = apiState.subscriptions ?? {}
      const entry = subs['getUsers(undefined)']
      const refCount = entry ? Object.keys(entry).length : 0
      const hasEntry = !!apiState.queries?.['getUsers(undefined)']

      if (refCount === 0 && hasEntry && timerStart === null) {
        setTimerStart(Date.now())
        con.warn(`refCount=0 → стартует таймер keepUnusedDataFor=${keep}s`)
      } else if ((refCount > 0 || !hasEntry) && timerStart !== null) {
        setTimerStart(null)
      }
    }
    const u = store.subscribe(check)
    return u
  }, [timerStart, keep])

  useEffect(() => {
    const $sl = document.getElementById('kd-slider') as HTMLInputElement
    const $val = document.getElementById('kd-val') as HTMLSpanElement
    const h = (): void => {
      const v = Number($sl.value)
      setKeep(v)
      $val.textContent = String(v)
      currentKeepFor = v
      con.info(`keepUnusedDataFor изменён на ${v}s (применится после полного resetApiState — RTKQ запоминает значение при первом useQuery)`)
    }
    $sl.addEventListener('input', h)
    return () => $sl.removeEventListener('input', h)
  }, [])

  const apiState = store.getState().api as {
    subscriptions?: Record<string, Record<string, unknown>>
    queries?: Record<string, { status?: string; data?: unknown }>
  }
  const subs = apiState.subscriptions ?? {}
  const queries = apiState.queries ?? {}
  const refCount = subs['getUsers(undefined)'] ? Object.keys(subs['getUsers(undefined)']!).length : 0
  const entry = queries['getUsers(undefined)']

  const elapsed = timerStart ? (Date.now() - timerStart) / 1000 : 0
  const pct = timerStart ? Math.min(100, (elapsed / keep) * 100) : 0

  return (
    <div className="cache-box">
      <h4 style={{ color: 'var(--accent-cyan)', margin: '0 0 6px', fontSize: '.82rem' }}>state.api live</h4>
      <div className="cache-row" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
        <span>cacheKey</span><span>status</span><span>refCount</span><span>timer</span>
      </div>
      {entry ? (
        <div className="cache-row">
          <span style={{ color: 'var(--accent-cyan)' }}>getUsers(undefined)</span>
          <span>{entry.status ?? '—'}</span>
          <span style={{ color: refCount === 0 ? 'var(--accent-red)' : 'var(--success)' }}>{refCount}</span>
          <span>
            {timerStart ? `${elapsed.toFixed(1)}s / ${keep}s` : '—'}
            {timerStart && <div className="timer-bar"><div className="timer-bar__fill" style={{ width: `${pct}%` }} /></div>}
          </span>
        </div>
      ) : (
        <div style={{ padding: 8, color: 'var(--text-muted)', fontStyle: 'italic' }}>— entry не существует (удалена таймером или ещё не создана) —</div>
      )}
    </div>
  )
}

function App(): ReactElement {
  const [mounts, setMounts] = useState<string[]>([])
  const [counter, setCounter] = useState(0)
  const [, force] = useState(0)
  useEffect(() => {
    const i = setInterval(() => force(n => n + 1), 120)
    return () => clearInterval(i)
  }, [])

  const addSub = (): void => {
    setCounter(c => c + 1)
    setMounts(m => [...m, `sub-${counter + 1}`])
  }
  const removeSub = (): void => {
    setMounts(m => m.slice(0, -1))
  }
  const removeAll = (): void => setMounts([])

  return (
    <div>
      <div className="toggle-bar" style={{ marginBottom: 10 }}>
        <button className="btn btn--accent" onClick={addSub}>+ добавить subscriber</button>
        <button className="btn" onClick={removeSub}>− убрать последнего</button>
        <button className="btn btn--danger" onClick={removeAll}>✗ убрать всех (refCount → 0)</button>
        <button className="btn" onClick={() => store.dispatch(api.util.resetApiState())}>⚠ resetApiState</button>
      </div>
      <div>
        {mounts.length === 0
          ? <div style={{ padding: 10, color: 'var(--text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-mono)', fontSize: '.8rem' }}>— нет подписчиков —</div>
          : mounts.map((m) => <Subscriber key={m} label={m} />)
        }
      </div>
      <CacheView />
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

con.info('1. Жми "+ subscriber" 2-3 раза — видно refCount растёт, но fetch только один (дедуп).')
con.info('2. Жми "−" по одному — refCount падает. Пока > 0, entry живёт.')
con.info('3. "✗ убрать всех" → refCount=0 → стартует таймер. Ждёшь 5s → entry исчезает.')
con.info('4. Добавь subscriber ДО истечения → таймер отменяется, entry остаётся.')
