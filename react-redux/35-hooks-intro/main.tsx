import { createRoot } from 'react-dom/client'
import { useRef } from 'react'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, useSelector, useDispatch, connect } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface CounterState {
  value: number
}

interface RootState {
  counter: CounterState
}

type Action =
  | { type: 'counter/increment' }
  | { type: 'counter/decrement' }
  | { type: 'counter/reset' }

// --- Reducer ---

function counterReducer(
  state: CounterState = { value: 0 },
  action: Action
): CounterState {
  switch (action.type) {
    case 'counter/increment': return { value: state.value + 1 }
    case 'counter/decrement': return { value: state.value - 1 }
    case 'counter/reset':     return { value: 0 }
    default: return state
  }
}

const rootReducer = combineReducers({ counter: counterReducer })
const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — connect vs hooks'
)

// ================================================
// ВАРИАНТ 1 — через connect (как в уроках 12–27)
// ================================================

interface ConnectCounterProps {
  count: number
  increment: () => Action
  decrement: () => Action
  reset: () => Action
}

function ConnectCounterRaw(props: ConnectCounterProps) {
  const rc = useRef(0)
  rc.current++
  return (
    <div className="intro-card intro-card--connect">
      <div className="intro-card__header">
        <div className="intro-card__title">Через connect</div>
        <div className="intro-card__badge">legacy</div>
      </div>
      <div className="counter-box">
        <button className="btn btn--accent" onClick={() => props.decrement()}>−</button>
        <div className="counter-value">{props.count}</div>
        <button className="btn btn--accent" onClick={() => props.increment()}>+</button>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button className="btn btn--danger" onClick={() => props.reset()}>Reset</button>
      </div>
      <div className="intro-card__source">
{`import { connect } from 'react-redux'

interface StateProps    { count: number }
interface DispatchProps {
  increment: () => Action
  decrement: () => Action
  reset:     () => Action
}
type Props = StateProps & DispatchProps

const mapStateToProps = (state: RootState): StateProps => ({
  count: state.counter.value,
})

const mapDispatchToProps: DispatchProps = {
  increment: () => ({ type: 'counter/increment' }),
  decrement: () => ({ type: 'counter/decrement' }),
  reset:     () => ({ type: 'counter/reset' }),
}

function Counter(props: Props) {
  return (
    <div>
      <button onClick={() => props.decrement()}>−</button>
      <span>{props.count}</span>
      <button onClick={() => props.increment()}>+</button>
    </div>
  )
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Counter)`}
      </div>
      <div className="intro-card__lines">
        ~34 строки · рендеров: {rc.current}
      </div>
    </div>
  )
}

const mapStateToProps = (state: RootState): { count: number } => ({
  count: state.counter.value,
})

const mapDispatchToProps = {
  increment: () => ({ type: 'counter/increment' as const }),
  decrement: () => ({ type: 'counter/decrement' as const }),
  reset:     () => ({ type: 'counter/reset' as const }),
}

const ConnectCounter = connect(mapStateToProps, mapDispatchToProps)(ConnectCounterRaw)

// ================================================
// ВАРИАНТ 2 — через хуки
// ================================================

function HooksCounter() {
  const count = useSelector((state: RootState) => state.counter.value)
  const dispatch = useDispatch()

  const rc = useRef(0)
  rc.current++

  return (
    <div className="intro-card intro-card--hooks">
      <div className="intro-card__header">
        <div className="intro-card__title">Через хуки</div>
        <div className="intro-card__badge">рекомендуется</div>
      </div>
      <div className="counter-box">
        <button
          className="btn btn--success"
          onClick={() => dispatch({ type: 'counter/decrement' })}
        >
          −
        </button>
        <div className="counter-value">{count}</div>
        <button
          className="btn btn--success"
          onClick={() => dispatch({ type: 'counter/increment' })}
        >
          +
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button
          className="btn btn--danger"
          onClick={() => dispatch({ type: 'counter/reset' })}
        >
          Reset
        </button>
      </div>
      <div className="intro-card__source">
{`import { useSelector, useDispatch } from 'react-redux'

function Counter() {
  const count = useSelector(
    (state: RootState) => state.counter.value
  )
  const dispatch = useDispatch()
  return (
    <div>
      <button onClick={() => dispatch({ type: 'counter/decrement' })}>−</button>
      <span>{count}</span>
      <button onClick={() => dispatch({ type: 'counter/increment' })}>+</button>
    </div>
  )
}

export default Counter`}
      </div>
      <div className="intro-card__lines">
        ~14 строк · рендеров: {rc.current}
      </div>
    </div>
  )
}

// ================================================
// App
// ================================================

function App() {
  return (
    <div>
      <div style={{
        display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap',
        padding: 14, background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius)', marginBottom: 14,
      }}>
        <button
          className="btn btn--accent"
          onClick={() => {
            con.log('')
            con.info('📤 dispatch({ type: "counter/increment" }) — обе карточки обновятся')
            store.dispatch({ type: 'counter/increment' })
          }}
        >
          Внешний dispatch +1
        </button>
        <button
          className="btn"
          onClick={() => {
            con.log('')
            con.info('📤 dispatch({ type: "counter/reset" })')
            store.dispatch({ type: 'counter/reset' })
          }}
        >
          Внешний dispatch reset
        </button>
      </div>

      <div className="intro-layout">
        <ConnectCounter />
        <HooksCounter />
      </div>

      <div style={{
        padding: 12, background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius)', fontSize: '0.85rem', color: 'var(--text-secondary)'
      }}>
        <strong style={{ color: 'var(--accent-yellow)' }}>Наблюдение:</strong> оба варианта
        подключены к одному <code>store</code> и отвечают на один и тот же <code>dispatch</code>.
        Логика идентична — но код хук-версии в 2–3 раза короче, без HOC-обёртки в дереве
        компонентов и без ручного описания <code>mapStateToProps</code> /
        <code> mapDispatchToProps</code>. В следующих уроках мы разберём каждый хук отдельно:
        <code> useSelector</code> (36–43), <code>useDispatch</code> (44–45),
        <code> useStore</code> (46).
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={store}>
    <App />
  </Provider>
)

// --- Initial log ---

con.info('Hooks API — useSelector + useDispatch вместо connect')
con.log('')
con.log('connect-версия:')
con.log('  mapStateToProps, mapDispatchToProps, connect(...)(Counter)')
con.log('  → ~20–30 строк boilerplate')
con.log('')
con.log('hooks-версия:')
con.log('  const count = useSelector(state => state.counter.value)')
con.log('  const dispatch = useDispatch()')
con.log('  dispatch({ type: "counter/increment" })')
con.log('  → ~10 строк, без HOC')
con.log('')
con.log('Оба варианта подписаны на один и тот же store через один <Provider>.')
