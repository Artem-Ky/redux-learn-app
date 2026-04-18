import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, useSelector } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface CounterState { a: number; b: number }
interface OtherState { tick: number }

interface RootState {
  counter: CounterState
  other: OtherState
}

type AppAction =
  | { type: 'INC_A' }
  | { type: 'INC_B' }
  | { type: 'TICK' }
  | { type: 'RESET' }

// --- Reducers ---

function counterReducer(state: CounterState = { a: 0, b: 0 }, action: AppAction): CounterState {
  switch (action.type) {
    case 'INC_A': return { ...state, a: state.a + 1 }
    case 'INC_B': return { ...state, b: state.b + 1 }
    case 'RESET': return { a: 0, b: 0 }
    default: return state
  }
}

function otherReducer(state: OtherState = { tick: 0 }, action: AppAction): OtherState {
  switch (action.type) {
    case 'TICK': return { tick: state.tick + 1 }
    case 'RESET': return { tick: 0 }
    default: return state
  }
}

const rootReducer = combineReducers({ counter: counterReducer, other: otherReducer })
const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — === по ссылке'
)

// --- Render counters ---

const badRenders = { n: 0 }
const goodRenders = { n: 0 }

// --- BAD: returns new object each time ---

function BadComponent() {
  const data = useSelector((state: RootState) => ({
    a: state.counter.a,
    b: state.counter.b,
  }))
  badRenders.n++
  con.warn(`[BAD] selector → { a: ${data.a}, b: ${data.b} } (новая ссылка) · рендер #${badRenders.n}`)

  return (
    <div className="exp-card exp-card--bad">
      <span className="exp-card__tag">❌ ре-рендер всегда</span>
      <div className="exp-card__code">{`const data = useSelector(state => ({
  a: state.counter.a,
  b: state.counter.b
}))`}</div>
      <div className="exp-card__counters">
        <div className="exp-card__counter">
          <div className="exp-card__counter-label">data.a</div>
          <div className="exp-card__counter-val">{data.a}</div>
        </div>
        <div className="exp-card__counter">
          <div className="exp-card__counter-label">data.b</div>
          <div className="exp-card__counter-val">{data.b}</div>
        </div>
      </div>
      <div className="exp-card__counters">
        <div className="exp-card__counter">
          <div className="exp-card__counter-label">рендеров</div>
          <div className="exp-card__counter-val exp-card__counter-val--red">{badRenders.n}</div>
        </div>
        <div className="exp-card__counter">
          <div className="exp-card__counter-label">ссылка data</div>
          <div className="exp-card__val">{`{…}#${badRenders.n}`}</div>
        </div>
      </div>
    </div>
  )
}

// --- GOOD: two separate useSelector returning primitives ---

function GoodComponent() {
  const a = useSelector((state: RootState) => state.counter.a)
  const b = useSelector((state: RootState) => state.counter.b)
  goodRenders.n++
  con.success(`[GOOD] a=${a} b=${b} · рендер #${goodRenders.n}`)

  return (
    <div className="exp-card exp-card--good">
      <span className="exp-card__tag">✔ рендер только при изменении</span>
      <div className="exp-card__code">{`const a = useSelector(state => state.counter.a)
const b = useSelector(state => state.counter.b)`}</div>
      <div className="exp-card__counters">
        <div className="exp-card__counter">
          <div className="exp-card__counter-label">a</div>
          <div className="exp-card__counter-val">{a}</div>
        </div>
        <div className="exp-card__counter">
          <div className="exp-card__counter-label">b</div>
          <div className="exp-card__counter-val">{b}</div>
        </div>
      </div>
      <div className="exp-card__counters">
        <div className="exp-card__counter">
          <div className="exp-card__counter-label">рендеров</div>
          <div className="exp-card__counter-val exp-card__counter-val--green">{goodRenders.n}</div>
        </div>
        <div className="exp-card__counter">
          <div className="exp-card__counter-label">результат</div>
          <div className="exp-card__val">{`${a}, ${b}`}</div>
        </div>
      </div>
    </div>
  )
}

// tick вынесен в отдельный компонент — иначе App сам подписался бы на state.other.tick
// и его ре-рендер протащил бы ре-рендер всех детей, включая GoodComponent.

function TickBadge() {
  const tick = useSelector((state: RootState) => state.other.tick)
  return (
    <div style={{
      textAlign: 'center',
      marginBottom: 14,
      padding: 10,
      background: 'var(--bg-panel)',
      borderRadius: 'var(--radius)',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.85rem',
      color: 'var(--text-secondary)',
    }}>
      state.other.tick = <strong style={{ color: 'var(--accent-cyan)' }}>{tick}</strong>
      <span style={{ color: 'var(--text-muted)' }}> — этот слайс никак не связан с counter</span>
    </div>
  )
}

function App() {
  const dispatchAndLog = (action: AppAction, label: string) => {
    con.log('')
    con.info(`📤 store.dispatch(${label})`)
    store.dispatch(action)
  }

  return (
    <div>
      <div className="global-controls">
        <button className="btn btn--success" onClick={() => dispatchAndLog({ type: 'INC_A' }, '{ type: "INC_A" }')}>
          a +1
        </button>
        <button className="btn btn--success" onClick={() => dispatchAndLog({ type: 'INC_B' }, '{ type: "INC_B" }')}>
          b +1
        </button>
        <button className="btn btn--accent" onClick={() => dispatchAndLog({ type: 'TICK' }, '{ type: "TICK" }')}>
          tick (unrelated)
        </button>
        <button className="btn btn--danger" onClick={() => dispatchAndLog({ type: 'RESET' }, '{ type: "RESET" }')}>
          reset
        </button>
      </div>

      <TickBadge />

      <div className="pair-grid">
        <BadComponent />
        <GoodComponent />
      </div>
    </div>
  )
}

// --- Render ---

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={store}>
    <App />
  </Provider>
)

// --- Initial log ---

con.info('useSelector: сравнение результатов через === (strict)')
con.log('')
con.log('Оба компонента читают counter.a и counter.b.')
con.log('BAD: selector возвращает { a, b } — новый объект каждый раз.')
con.log('GOOD: два отдельных useSelector — каждый возвращает примитив.')
con.log('')
con.log('Нажмите "tick (unrelated)": state.other меняется, но counter НЕ меняется.')
con.log('GOOD не ре-рендерится (значения равны через ===).')
con.log('BAD ре-рендерится каждый раз ({ a, b } новый объект → !== старого).')
