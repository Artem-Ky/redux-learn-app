import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore, combineReducers, bindActionCreators } from 'redux'
import type { Dispatch } from 'redux'
import { Provider, connect } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface CounterState {
  value: number
}

interface RootState {
  counter: CounterState
}

// --- Action creators ---

const increment = () => ({ type: 'counter/increment' as const })
const decrement = () => ({ type: 'counter/decrement' as const })
const reset = () => ({ type: 'counter/reset' as const })

type CounterAction =
  | ReturnType<typeof increment>
  | ReturnType<typeof decrement>
  | ReturnType<typeof reset>

// --- Reducer ---

function counterReducer(
  state: CounterState = { value: 0 },
  action: CounterAction | { type: string }
): CounterState {
  switch (action.type) {
    case 'counter/increment':
      return { value: state.value + 1 }
    case 'counter/decrement':
      return { value: state.value - 1 }
    case 'counter/reset':
      return { value: 0 }
    default:
      return state
  }
}

const rootReducer = combineReducers({ counter: counterReducer })
const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — три стиля mapDispatchToProps'
)

// ============================================================
// Shared counter UI
// ============================================================

interface CounterUIProps {
  label: 'A' | 'B' | 'C'
  count: number
  clicks: number
  onIncrement: () => void
  onDecrement: () => void
  onReset: () => void
}

function CounterUI(props: CounterUIProps) {
  return (
    <>
      <div className="variant__counter">{props.count}</div>
      <div className="variant__buttons">
        <button className="btn btn--sm" onClick={props.onDecrement}>−</button>
        <button className="btn btn--sm btn--success" onClick={props.onIncrement}>+</button>
        <button className="btn btn--sm btn--danger" onClick={props.onReset}>reset</button>
      </div>
      <div className="variant__stats">
        кликов по этой карточке: <strong>{props.clicks}</strong>
      </div>
    </>
  )
}

const mapStateToProps = (state: RootState) => ({
  count: state.counter.value,
})

// ============================================================
// Variant A — manual wrapping
// ============================================================

interface ManualProps {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
}

let manualClicks = 0

function ManualRaw(props: ManualProps) {
  return (
    <CounterUI
      label="A"
      count={props.count}
      clicks={manualClicks}
      onIncrement={() => {
        manualClicks++
        con.warn('[A manual]   props.increment() → dispatch(increment()) (ручная обёртка)')
        props.increment()
      }}
      onDecrement={() => {
        manualClicks++
        con.warn('[A manual]   props.decrement() → dispatch(decrement())')
        props.decrement()
      }}
      onReset={() => {
        manualClicks++
        con.warn('[A manual]   props.reset() → dispatch(reset())')
        props.reset()
      }}
    />
  )
}

const mapDispatchManual = (dispatch: Dispatch<CounterAction>) => ({
  increment: () => dispatch(increment()),
  decrement: () => dispatch(decrement()),
  reset: () => dispatch(reset()),
})

const ManualCounter = connect(mapStateToProps, mapDispatchManual)(ManualRaw)

// ============================================================
// Variant B — bindActionCreators
// ============================================================

interface BoundProps {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
}

let boundClicks = 0

function BoundRaw(props: BoundProps) {
  return (
    <CounterUI
      label="B"
      count={props.count}
      clicks={boundClicks}
      onIncrement={() => {
        boundClicks++
        con.success('[B bound]    props.increment() → bound wrapper → dispatch(increment())')
        props.increment()
      }}
      onDecrement={() => {
        boundClicks++
        con.success('[B bound]    props.decrement() → bound wrapper → dispatch(decrement())')
        props.decrement()
      }}
      onReset={() => {
        boundClicks++
        con.success('[B bound]    props.reset() → bound wrapper → dispatch(reset())')
        props.reset()
      }}
    />
  )
}

const mapDispatchBound = (dispatch: Dispatch<CounterAction>) =>
  bindActionCreators({ increment, decrement, reset }, dispatch)

const BoundCounter = connect(mapStateToProps, mapDispatchBound)(BoundRaw)

// ============================================================
// Variant C — object shorthand (preview of lesson 24)
// ============================================================

interface ShorthandProps {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
}

let shorthandClicks = 0

function ShorthandRaw(props: ShorthandProps) {
  return (
    <CounterUI
      label="C"
      count={props.count}
      clicks={shorthandClicks}
      onIncrement={() => {
        shorthandClicks++
        con.info('[C shorthand] props.increment() → (react-redux внутри вызвал bindActionCreators)')
        props.increment()
      }}
      onDecrement={() => {
        shorthandClicks++
        con.info('[C shorthand] props.decrement()')
        props.decrement()
      }}
      onReset={() => {
        shorthandClicks++
        con.info('[C shorthand] props.reset()')
        props.reset()
      }}
    />
  )
}

const ShorthandCounter = connect(mapStateToProps, {
  increment,
  decrement,
  reset,
})(ShorthandRaw)

// ============================================================
// App
// ============================================================

function App() {
  return (
    <div>
      <div className="three-col">
        <div className="variant variant--manual">
          <span className="variant__badge">A — manual</span>
          <div className="variant__code">
{`const mapDispatchToProps =
  (dispatch) => ({
    increment: () =>
      dispatch(increment()),
    decrement: () =>
      dispatch(decrement()),
    reset: () =>
      dispatch(reset()),
  })`}
          </div>
          <ManualCounter />
        </div>

        <div className="variant variant--bound">
          <span className="variant__badge">B — bindActionCreators</span>
          <div className="variant__code">
{`import { bindActionCreators }
  from 'redux'

const mapDispatchToProps =
  (dispatch) =>
    bindActionCreators(
      { increment,
        decrement,
        reset },
      dispatch
    )`}
          </div>
          <BoundCounter />
        </div>

        <div className="variant variant--shorthand">
          <span className="variant__badge">C — object shorthand (урок 24)</span>
          <div className="variant__code">
{`// просто объект action
// creators — без функции:
connect(
  mapStateToProps,
  { increment,
    decrement,
    reset }
)(Counter)`}
          </div>
          <ShorthandCounter />
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ color: 'var(--accent-yellow)', fontWeight: 600, marginBottom: 4 }}>
          Все три счётчика смотрят в один state.counter.value:
        </div>
        поэтому нажав «+» на карточке B, число изменится сразу во всех трёх.
        Разница — только в том, <strong>как</strong> компонент получил свои колбэки
        (<code>props.increment</code>, <code>props.decrement</code>, <code>props.reset</code>).
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

con.info('Три способа mapDispatchToProps — A manual, B bindActionCreators, C object shorthand')
con.log('')
con.log('Все три компонента получают идентичный набор props:')
con.log('  { count, increment, decrement, reset }')
con.log('')
con.log('Разница только в объёме boilerplate-кода. Внешнее поведение одинаково.')
