import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { useLayoutEffect, useRef, useState } from 'react'
import { legacy_createStore as createStore } from 'redux'
import { Provider, useSelector, useDispatch, batch } from 'react-redux'

// ================================================
// State
// ================================================

interface AppState {
  loading: boolean
  userName: string | null
  role: string | null
}

type Action =
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'SET_USER'; name: string; role: string }
  | { type: 'RESET' }

const initial: AppState = { loading: false, userName: null, role: null }

function reducer(state = initial, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, loading: action.value }
    case 'SET_USER':    return { ...state, userName: action.name, role: action.role }
    case 'RESET':       return initial
    default:            return state
  }
}

// Отдельный store на каждую колонку — полная изоляция
const rawStore    = createStore(reducer)
const batchedStore = createStore(reducer)

// ================================================
// Types
// ================================================

interface RenderEntry {
  loading: boolean
  userName: string | null
  role: string | null
}

// ================================================
// ProfileCard — подписчик под наблюдением
// ================================================

function ProfileCard({ logRef }: { logRef: { current: RenderEntry[] } }) {
  const loading  = useSelector((s: AppState) => s.loading)
  const userName = useSelector((s: AppState) => s.userName)
  const role     = useSelector((s: AppState) => s.role)
  const divRef   = useRef<HTMLDivElement>(null)

  // Записываем снимок прямо во время рендера (ref — не state, это безопасно)
  logRef.current.push({ loading, userName, role })

  useLayoutEffect(() => {
    const el = divRef.current
    if (!el) return
    el.classList.remove('flash')
    void el.offsetWidth
    el.classList.add('flash')
  })

  return (
    <div className="pc" ref={divRef}>
      {loading ? (
        <span className="pc__spinner">⏳ загрузка…</span>
      ) : userName ? (
        <div className="pc__ready">
          <span className="pc__name">👤 {userName}</span>
          <span className="pc__role">{role}</span>
        </div>
      ) : (
        <span className="pc__empty">— нет данных —</span>
      )}
    </div>
  )
}

// ================================================
// RenderLog — история рендеров
// ================================================

function RenderLog({ entries }: { entries: RenderEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rlog rlog--empty">
        нажми кнопку — здесь появятся рендеры
      </div>
    )
  }

  return (
    <div className="rlog">
      {entries.map((e, i) => {
        const isFinal = i === entries.length - 1
        return (
          <div key={i} className={`rlog__row ${isFinal ? 'rlog__row--ok' : 'rlog__row--glitch'}`}>
            <span className="rlog__n">#{i + 1}</span>
            <span className="rlog__vals">
              loading=<b>{String(e.loading)}</b>
              {' '}· user=<b>{e.userName ?? '—'}</b>
              {' '}· role=<b>{e.role ?? '—'}</b>
            </span>
            <span className="rlog__tag">{isFinal ? '✓ финал' : '⚠ глитч'}</span>
          </div>
        )
      })}
    </div>
  )
}

// ================================================
// ColumnInner — содержимое внутри Provider
// ================================================

function ColumnInner({
  logRef,
  displayLog,
  onRun,
  onReset,
}: {
  logRef: { current: RenderEntry[] }
  displayLog: RenderEntry[]
  onRun:   (dispatch: ReturnType<typeof useDispatch>) => void
  onReset: (dispatch: ReturnType<typeof useDispatch>) => void
}) {
  const dispatch = useDispatch()

  return (
    <>
      <div className="col__widget-label">UI-компонент (ProfileCard)</div>
      <ProfileCard logRef={logRef} />
      <RenderLog entries={displayLog} />
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          className="btn btn--accent"
          style={{ flex: 1 }}
          onClick={() => onRun(dispatch)}
        >
          Загрузить пользователя
        </button>
        <button className="btn" onClick={() => onReset(dispatch)}>
          Reset
        </button>
      </div>
    </>
  )
}

// ================================================
// Column — карточка с колонкой
// ================================================

function Column({
  title,
  code,
  variant,
  store,
  doDispatch,
}: {
  title: React.ReactNode
  code: string
  variant: 'raw' | 'batch'
  store:   ReturnType<typeof createStore>
  doDispatch: (d: ReturnType<typeof useDispatch>) => void
}) {
  const [displayLog, setDisplayLog] = useState<RenderEntry[]>([])
  const logRef = useRef<RenderEntry[]>([])

  const handleRun = (dispatch: ReturnType<typeof useDispatch>) => {
    logRef.current = []
    doDispatch(dispatch)
    // ждём один тик, чтобы React завершил все рендеры
    setTimeout(() => setDisplayLog([...logRef.current]), 0)
  }

  const handleReset = (dispatch: ReturnType<typeof useDispatch>) => {
    logRef.current = []
    dispatch({ type: 'RESET' } as Action)
    setDisplayLog([])
  }

  const count = displayLog.length

  return (
    <div className={`col col--${variant}`}>
      <div className="col__head">
        <span className="col__title">{title}</span>
        {count > 0 && (
          <span className={`col__cnt ${count === 1 ? 'col__cnt--ok' : 'col__cnt--bad'}`}>
            {count} {count === 1 ? 'рендер' : count < 5 ? 'рендера' : 'рендеров'}
          </span>
        )}
      </div>
      <pre className="col__code">{code}</pre>
      <Provider store={store}>
        <ColumnInner
          logRef={logRef}
          displayLog={displayLog}
          onRun={handleRun}
          onReset={handleReset}
        />
      </Provider>
    </div>
  )
}

// ================================================
// App
// ================================================

const USER = { name: 'Алексей Петров', role: 'admin' }

function App() {
  // flushSync форсирует синхронный рендер ПОСЛЕ каждого dispatch
  // (пробивает React 18 automatic batching — нужно для наглядной демонстрации)
  const doRaw = (dispatch: ReturnType<typeof useDispatch>) => {
    flushSync(() => dispatch({ type: 'SET_LOADING', value: true  } as Action))
    flushSync(() => dispatch({ type: 'SET_USER', name: USER.name, role: USER.role } as Action))
    flushSync(() => dispatch({ type: 'SET_LOADING', value: false } as Action))
  }

  const doBatch = (dispatch: ReturnType<typeof useDispatch>) => {
    batch(() => {
      dispatch({ type: 'SET_LOADING', value: true  } as Action)
      dispatch({ type: 'SET_USER', name: USER.name, role: USER.role } as Action)
      dispatch({ type: 'SET_LOADING', value: false } as Action)
    })
  }

  return (
    <div className="app">
      <Column
        title={<>❌ три отдельных <code>dispatch</code></>}
        code={`// 3 dispatch → 3 рендера\nflushSync(() => dispatch({ type: 'SET_LOADING', value: true }))\nflushSync(() => dispatch({ type: 'SET_USER', ...user }))\nflushSync(() => dispatch({ type: 'SET_LOADING', value: false }))`}
        variant="raw"
        store={rawStore}
        doDispatch={doRaw}
      />
      <Column
        title={<>✅ <code>batch()</code> — три dispatch, один рендер</>}
        code={`// 3 dispatch → 1 рендер\nbatch(() => {\n  dispatch({ type: 'SET_LOADING', value: true })\n  dispatch({ type: 'SET_USER', ...user })\n  dispatch({ type: 'SET_LOADING', value: false })\n})`}
        variant="batch"
        store={batchedStore}
        doDispatch={doBatch}
      />
    </div>
  )
}

// ================================================
// Mount
// ================================================

createRoot(document.getElementById('root')!).render(<App />)
