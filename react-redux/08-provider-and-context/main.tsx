import { createRoot } from 'react-dom/client'
import { createContext, useContext, useRef, useState, useCallback } from 'react'
import { legacy_createStore as createStore } from 'redux'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

interface CounterState {
  value: number
}

const initialState: CounterState = { value: 0 }

function counterReducer(
  state = initialState,
  action: { type: string }
): CounterState {
  switch (action.type) {
    case 'counter/increment':
      return { value: state.value + 1 }
    default:
      return state
  }
}

const store = createStore(counterReducer)

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — Context vs Subscription'
)

// --- Naive Context approach ---

interface NaiveContextValue {
  state: CounterState
  dispatch: (action: { type: string }) => void
}

const NaiveContext = createContext<NaiveContextValue | null>(null)

let naiveCounterRenders = 0
let naiveUnrelatedRenders = 0

function NaiveProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CounterState>(initialState)

  const dispatch = useCallback((action: { type: string }) => {
    setState((prev) => {
      switch (action.type) {
        case 'counter/increment':
          return { value: prev.value + 1 }
        default:
          return prev
      }
    })
  }, [])

  return (
    <NaiveContext.Provider value={{ state, dispatch }}>
      {children}
    </NaiveContext.Provider>
  )
}

function NaiveCounter() {
  const ctx = useContext(NaiveContext)!
  const renderCount = useRef(0)
  renderCount.current++
  naiveCounterRenders = renderCount.current

  return (
    <div>
      <div className="compare-counter">
        <button
          className="btn btn--accent"
          onClick={() => {
            ctx.dispatch({ type: 'counter/increment' })
            con.warn(`[Naive] dispatch → ВСЕ потребители перерисуются`)
          }}
        >
          +
        </button>
        <div className="compare-counter__value">{ctx.state.value}</div>
      </div>
    </div>
  )
}

function NaiveUnrelated() {
  const _ctx = useContext(NaiveContext)
  const renderCount = useRef(0)
  renderCount.current++
  naiveUnrelatedRenders = renderCount.current

  const ref = useRef<HTMLDivElement>(null)

  if (renderCount.current > 1 && ref.current) {
    ref.current.classList.add('flash')
    setTimeout(() => ref.current?.classList.remove('flash'), 300)
  }

  return (
    <div className="unrelated-box render-flash" ref={ref}>
      Компонент «Часы» (не использует counter)
      <br />
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Текущее время: {new Date().toLocaleTimeString('ru-RU')}
      </span>
    </div>
  )
}

function NaiveRenderTracker() {
  const ctx = useContext(NaiveContext)!
  void ctx

  return (
    <div className="render-tracker">
      <div className="render-tracker__row">
        <span className="render-tracker__label">Counter renders:</span>
        <span className="render-tracker__count render-tracker__count--bad">
          {naiveCounterRenders}
        </span>
      </div>
      <div className="render-tracker__row">
        <span className="render-tracker__label">Unrelated renders:</span>
        <span className="render-tracker__count render-tracker__count--bad">
          {naiveUnrelatedRenders}
        </span>
      </div>
    </div>
  )
}

// --- Real React-Redux approach ---

let realCounterRenders = 0
let realUnrelatedRenders = 0

function RealCounter() {
  const count = useSelector((state: CounterState) => state.value)
  const dispatch = useDispatch()
  const renderCount = useRef(0)
  renderCount.current++
  realCounterRenders = renderCount.current

  return (
    <div>
      <div className="compare-counter">
        <button
          className="btn btn--accent"
          onClick={() => {
            dispatch({ type: 'counter/increment' })
            con.success(`[React-Redux] dispatch → только подписанные компоненты`)
          }}
        >
          +
        </button>
        <div className="compare-counter__value">{count}</div>
      </div>
    </div>
  )
}

function RealUnrelated() {
  const renderCount = useRef(0)
  renderCount.current++
  realUnrelatedRenders = renderCount.current

  return (
    <div className="unrelated-box">
      Компонент «Часы» (не подписан на counter)
      <br />
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Текущее время: {new Date().toLocaleTimeString('ru-RU')}
      </span>
    </div>
  )
}

function RealRenderTracker() {
  useSelector((state: CounterState) => state.value)

  return (
    <div className="render-tracker">
      <div className="render-tracker__row">
        <span className="render-tracker__label">Counter renders:</span>
        <span className="render-tracker__count render-tracker__count--good">
          {realCounterRenders}
        </span>
      </div>
      <div className="render-tracker__row">
        <span className="render-tracker__label">Unrelated renders:</span>
        <span className="render-tracker__count render-tracker__count--good">
          {realUnrelatedRenders}
        </span>
      </div>
    </div>
  )
}

// --- Main App ---

function App() {
  return (
    <div className="compare-grid">
      <div className="compare-panel compare-panel--naive">
        <div className="compare-panel__header">
          Наивный Context (useContext)
        </div>
        <div className="compare-panel__body">
          <NaiveProvider>
            <NaiveCounter />
            <NaiveUnrelated />
            <NaiveRenderTracker />
          </NaiveProvider>
        </div>
      </div>

      <div className="compare-panel compare-panel--real">
        <div className="compare-panel__header">
          React-Redux (Provider + useSelector)
        </div>
        <div className="compare-panel__body">
          <Provider store={store}>
            <RealCounter />
            <RealUnrelated />
            <RealRenderTracker />
          </Provider>
        </div>
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)

con.info('Provider и Context — сравнение подходов.')
con.log('')
con.log('Слева: наивный React.createContext — ВСЕ потребители перерисовываются')
con.log('Справа: React-Redux Provider — только подписанные компоненты')
con.log('')
con.log('Нажимайте + и следите за счётчиками рендеров!')
