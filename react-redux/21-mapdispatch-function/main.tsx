import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore, combineReducers } from 'redux'
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

type CounterAction =
  | { type: 'counter/increment' }
  | { type: 'counter/decrement' }
  | { type: 'counter/reset' }

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
  'Лог — mapDispatchToProps функцией'
)

// ============================================================
// LEFT CARD: classic props.dispatch (урок 20)
// ============================================================

let leftRenders = 0

interface LeftProps {
  count: number
  dispatch: Dispatch<CounterAction>
}

function LeftRaw(props: LeftProps) {
  leftRenders++

  return (
    <div>
      <div className="counter-display" style={{ marginBottom: 10 }}>
        <div className="counter-display__value">{props.count}</div>
      </div>
      <div className="btn-group" style={{ justifyContent: 'center' }}>
        <button
          className="btn"
          onClick={() => {
            con.info('[LEFT]  props.dispatch({ type: "counter/decrement" })')
            props.dispatch({ type: 'counter/decrement' })
          }}
        >
          −
        </button>
        <button
          className="btn btn--accent"
          onClick={() => {
            con.info('[LEFT]  props.dispatch({ type: "counter/increment" })')
            props.dispatch({ type: 'counter/increment' })
          }}
        >
          +
        </button>
        <button
          className="btn btn--danger"
          onClick={() => {
            con.info('[LEFT]  props.dispatch({ type: "counter/reset" })')
            props.dispatch({ type: 'counter/reset' })
          }}
        >
          reset
        </button>
      </div>

      <div className="props-viewer">
        <div style={{
          color: 'var(--text-muted)', marginBottom: 6,
          fontSize: '0.7rem', textTransform: 'uppercase'
        }}>
          props компонента (рендеров: {leftRenders}):
        </div>
        {'{\n'}
        {'  '}<span className="props-viewer__key">count</span>:{' '}
        <span className="props-viewer__val">{props.count}</span>{',\n'}
        {'  '}<span className="props-viewer__key">dispatch</span>:{' '}
        <span className="props-viewer__type">ƒ dispatch(action)</span>
        {'\n}'}
      </div>

      <div className="approach-card__snippet">
{`connect(mapStateToProps)(Counter)
// mapDispatchToProps НЕ передан
// → props.dispatch доступен
onClick={() => props.dispatch({ type: '...' })}`}
      </div>
    </div>
  )
}

const mapStateToPropsLeft = (state: RootState) => ({
  count: state.counter.value,
})

const LeftCounter = connect(mapStateToPropsLeft)(LeftRaw)

// ============================================================
// RIGHT CARD: mapDispatchToProps as function
// ============================================================

let rightRenders = 0

interface RightProps {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
}

function RightRaw(props: RightProps) {
  rightRenders++

  return (
    <div>
      <div className="counter-display" style={{ marginBottom: 10 }}>
        <div className="counter-display__value">{props.count}</div>
      </div>
      <div className="btn-group" style={{ justifyContent: 'center' }}>
        <button
          className="btn"
          onClick={() => {
            con.success('[RIGHT] props.decrement()')
            props.decrement()
          }}
        >
          −
        </button>
        <button
          className="btn btn--success"
          onClick={() => {
            con.success('[RIGHT] props.increment()')
            props.increment()
          }}
        >
          +
        </button>
        <button
          className="btn btn--danger"
          onClick={() => {
            con.success('[RIGHT] props.reset()')
            props.reset()
          }}
        >
          reset
        </button>
      </div>

      <div className="props-viewer">
        <div style={{
          color: 'var(--text-muted)', marginBottom: 6,
          fontSize: '0.7rem', textTransform: 'uppercase'
        }}>
          props компонента (рендеров: {rightRenders}):
        </div>
        {'{\n'}
        {'  '}<span className="props-viewer__key">count</span>:{' '}
        <span className="props-viewer__val">{props.count}</span>{',\n'}
        {'  '}<span className="props-viewer__key">increment</span>:{' '}
        <span className="props-viewer__type">ƒ ()</span>{',\n'}
        {'  '}<span className="props-viewer__key">decrement</span>:{' '}
        <span className="props-viewer__type">ƒ ()</span>{',\n'}
        {'  '}<span className="props-viewer__key">reset</span>:{' '}
        <span className="props-viewer__type">ƒ ()</span>{'\n'}
        {'  '}<span style={{ color: 'var(--text-muted)' }}>
          // dispatch отсутствует — см. урок 25
        </span>{'\n}'}
      </div>

      <div className="approach-card__snippet">
{`const mapDispatchToProps = (dispatch) => ({
  increment: () => dispatch({ type: 'counter/increment' }),
  decrement: () => dispatch({ type: 'counter/decrement' }),
  reset:     () => dispatch({ type: 'counter/reset' }),
})
connect(mapStateToProps, mapDispatchToProps)(Counter)
onClick={props.increment}`}
      </div>
    </div>
  )
}

const mapStateToPropsRight = (state: RootState) => ({
  count: state.counter.value,
})

const mapDispatchToProps = (dispatch: Dispatch<CounterAction>) => ({
  increment: () => {
    con.log('   └─ mapDispatchToProps.increment → dispatch({ type: "counter/increment" })')
    dispatch({ type: 'counter/increment' })
  },
  decrement: () => {
    con.log('   └─ mapDispatchToProps.decrement → dispatch({ type: "counter/decrement" })')
    dispatch({ type: 'counter/decrement' })
  },
  reset: () => {
    con.log('   └─ mapDispatchToProps.reset → dispatch({ type: "counter/reset" })')
    dispatch({ type: 'counter/reset' })
  },
})

const RightCounter = connect(mapStateToPropsRight, mapDispatchToProps)(RightRaw)

// ============================================================
// App
// ============================================================

function App() {
  return (
    <div>
      <div className="side-by-side">
        <div className="approach-card">
          <div className="approach-card__header approach-card__header--old">
            ← урок 20 — props.dispatch напрямую
          </div>
          <LeftCounter />
        </div>
        <div className="approach-card">
          <div className="approach-card__header approach-card__header--new">
            урок 21 — mapDispatchToProps функцией
          </div>
          <RightCounter />
        </div>
      </div>

      <div style={{
        marginTop: 16, padding: 12, background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-sm)', fontSize: '0.85rem',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ color: 'var(--accent-yellow)', fontWeight: 600, marginBottom: 6 }}>
          Обе карточки читают один и тот же store — state общий.
        </div>
        Нажмите любую кнопку и сравните строки в консоли: слева компонент знает про
        <code>dispatch</code> и <code>type</code>, справа — только про <code>props.increment()</code>.
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

con.info('mapDispatchToProps в функциональной форме')
con.log('')
con.log('Левая карточка: connect(mapStateToProps)(Counter)')
con.log('  → props = { count, dispatch }')
con.log('')
con.log('Правая карточка: connect(mapStateToProps, mapDispatchToProps)(Counter)')
con.log('  → props = { count, increment, decrement, reset }  (dispatch отсутствует)')
con.log('')
con.log('Нажмите любую кнопку — в консоли видны разные стили вызова.')
