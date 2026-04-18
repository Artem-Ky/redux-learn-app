import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, useSelector, shallowEqual } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface PairState { a: number; b: number }
interface OtherState { tick: number }
interface PrecisionState { value: number }

interface RootState {
  pair: PairState
  other: OtherState
  precision: PrecisionState
}

type AppAction =
  | { type: 'INC_A' }
  | { type: 'INC_B' }
  | { type: 'TICK' }
  | { type: 'PRECISION_SMALL' }
  | { type: 'PRECISION_BIG' }
  | { type: 'RESET' }

// --- Reducers ---

function pairReducer(state: PairState = { a: 0, b: 0 }, action: AppAction): PairState {
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

function precisionReducer(state: PrecisionState = { value: 0 }, action: AppAction): PrecisionState {
  switch (action.type) {
    case 'PRECISION_SMALL': return { value: +(state.value + 0.001).toFixed(4) }
    case 'PRECISION_BIG': return { value: +(state.value + 0.5).toFixed(4) }
    case 'RESET': return { value: 0 }
    default: return state
  }
}

const rootReducer = combineReducers({
  pair: pairReducer,
  other: otherReducer,
  precision: precisionReducer,
})
const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — equalityFn'
)

// --- Selectors ---

const selectPair = (state: RootState) => ({ a: state.pair.a, b: state.pair.b })

// --- Custom equality: tolerant number comparison ---

const customEqual = (a: number, b: number) => Math.abs(a - b) < 0.01

// --- Render counters ---

const rc = { def: 0, sh: 0, opts: 0, custom: 0 }

// --- 1. Default (===) ---

function CardDefault() {
  const data = useSelector(selectPair)
  rc.def++
  con.warn(`[1] Default ===: { a: ${data.a}, b: ${data.b} } · рендер #${rc.def}`)
  return (
    <div className="eq-card eq-card--default">
      <div className="eq-card__title">1. Default <code style={{ color: 'var(--accent-red)' }}>===</code> (reference equality)</div>
      <div className="eq-card__code">{`const data = useSelector(
  state => ({ a: state.pair.a, b: state.pair.b })
)`}</div>
      <div className="eq-card__counters">
        <div className="eq-card__counter">
          <div className="eq-card__label">a</div>
          <div className="eq-card__val">{data.a}</div>
        </div>
        <div className="eq-card__counter">
          <div className="eq-card__label">b</div>
          <div className="eq-card__val">{data.b}</div>
        </div>
        <div className="eq-card__counter">
          <div className="eq-card__label">рендеров</div>
          <div className="eq-card__val eq-card__val--rr">{rc.def}</div>
        </div>
      </div>
    </div>
  )
}

// --- 2. shallowEqual (2nd arg) ---

function CardShallow() {
  const data = useSelector(selectPair, shallowEqual)
  rc.sh++
  con.success(`[2] shallowEqual (arg): { a: ${data.a}, b: ${data.b} } · рендер #${rc.sh}`)
  return (
    <div className="eq-card eq-card--shallow">
      <div className="eq-card__title">2. shallowEqual как <code style={{ color: 'var(--success)' }}>2-й аргумент</code></div>
      <div className="eq-card__code">{`import { shallowEqual } from 'react-redux'
const data = useSelector(
  state => ({ a: state.pair.a, b: state.pair.b }),
  shallowEqual
)`}</div>
      <div className="eq-card__counters">
        <div className="eq-card__counter">
          <div className="eq-card__label">a</div>
          <div className="eq-card__val">{data.a}</div>
        </div>
        <div className="eq-card__counter">
          <div className="eq-card__label">b</div>
          <div className="eq-card__val">{data.b}</div>
        </div>
        <div className="eq-card__counter">
          <div className="eq-card__label">рендеров</div>
          <div className="eq-card__val eq-card__val--ok">{rc.sh}</div>
        </div>
      </div>
    </div>
  )
}

// --- 3. options { equalityFn: shallowEqual } ---

function CardOpts() {
  const data = useSelector(selectPair, { equalityFn: shallowEqual })
  rc.opts++
  con.info(`[3] options.equalityFn: { a: ${data.a}, b: ${data.b} } · рендер #${rc.opts}`)
  return (
    <div className="eq-card eq-card--opts">
      <div className="eq-card__title">3. shallowEqual через <code style={{ color: 'var(--accent)' }}>options</code></div>
      <div className="eq-card__code">{`const data = useSelector(
  state => ({ a: state.pair.a, b: state.pair.b }),
  { equalityFn: shallowEqual }
)`}</div>
      <div className="eq-card__counters">
        <div className="eq-card__counter">
          <div className="eq-card__label">a</div>
          <div className="eq-card__val">{data.a}</div>
        </div>
        <div className="eq-card__counter">
          <div className="eq-card__label">b</div>
          <div className="eq-card__val">{data.b}</div>
        </div>
        <div className="eq-card__counter">
          <div className="eq-card__label">рендеров</div>
          <div className="eq-card__val eq-card__val--ok">{rc.opts}</div>
        </div>
      </div>
    </div>
  )
}

// --- 4. Custom equality for number (tolerant) ---

function CardCustom() {
  const precision = useSelector((state: RootState) => state.precision.value, customEqual)
  rc.custom++
  con.log(`[4] customEqual(|a-b|<0.01): precision=${precision} · рендер #${rc.custom}`)
  return (
    <div className="eq-card eq-card--custom">
      <div className="eq-card__title">4. Custom equality — <code style={{ color: 'var(--accent-purple)' }}>Math.abs(a - b) &lt; 0.01</code></div>
      <div className="eq-card__code">{`const customEqual = (a, b) => Math.abs(a - b) < 0.01
const precision = useSelector(
  state => state.precision.value,
  customEqual
)`}</div>
      <div className="eq-card__counters">
        <div className="eq-card__counter">
          <div className="eq-card__label">precision</div>
          <div className="eq-card__val" style={{ fontSize: '1rem' }}>{precision.toFixed(4)}</div>
        </div>
        <div className="eq-card__counter">
          <div className="eq-card__label">рендеров</div>
          <div className="eq-card__val">{rc.custom}</div>
        </div>
        <div className="eq-card__counter">
          <div className="eq-card__label">порог</div>
          <div className="eq-card__val" style={{ fontSize: '0.9rem' }}>≥ 0.01</div>
        </div>
      </div>
    </div>
  )
}

function StateDisplay() {
  const pair = useSelector(selectPair, shallowEqual)
  const tick = useSelector((s: RootState) => s.other.tick)
  const precision = useSelector((s: RootState) => s.precision.value)
  return (
    <div className="state-display">
      state.pair = <strong>{`{ a: ${pair.a}, b: ${pair.b} }`}</strong>
      <span style={{ color: 'var(--text-muted)' }}> · </span>
      state.other.tick = <strong>{tick}</strong>
      <span style={{ color: 'var(--text-muted)' }}> · </span>
      state.precision.value = <strong>{precision.toFixed(4)}</strong>
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
      <StateDisplay />
      <div className="global-controls">
        <button className="btn btn--success" onClick={() => dispatchAndLog({ type: 'INC_A' }, '{ type: "INC_A" }')}>
          a +1
        </button>
        <button className="btn btn--success" onClick={() => dispatchAndLog({ type: 'INC_B' }, '{ type: "INC_B" }')}>
          b +1
        </button>
        <button className="btn btn--accent" onClick={() => dispatchAndLog({ type: 'TICK' }, '{ type: "TICK" }')}>
          tick (не pair)
        </button>
        <button className="btn" onClick={() => dispatchAndLog({ type: 'PRECISION_SMALL' }, '{ type: "PRECISION_SMALL" } (+0.001)')}>
          precision +0.001
        </button>
        <button className="btn btn--accent" onClick={() => dispatchAndLog({ type: 'PRECISION_BIG' }, '{ type: "PRECISION_BIG" } (+0.5)')}>
          precision +0.5
        </button>
        <button className="btn btn--danger" onClick={() => dispatchAndLog({ type: 'RESET' }, '{ type: "RESET" }')}>
          reset
        </button>
      </div>

      <div className="eq-grid">
        <CardDefault />
        <CardShallow />
        <CardOpts />
        <CardCustom />
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

con.info('Четыре варианта equalityFn — бок о бок')
con.log('')
con.log('[1] Default (===)        — selector возвращает новый объект → рендер на каждом dispatch')
con.log('[2] shallowEqual (arg)   — сравнение по полям → рендер только при смене a или b')
con.log('[3] options.equalityFn   — то же, через объект-options')
con.log('[4] customEqual (>= 0.01)— рендер только при изменении precision на 0.01 и больше')
con.log('')
con.log('Попробуйте нажимать "tick" и "precision +0.001" — карточки 2, 3 и 4 игнорируют эти изменения,')
con.log('а карточка 1 ре-рендерится каждый раз.')
