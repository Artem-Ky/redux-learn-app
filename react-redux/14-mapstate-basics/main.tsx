import { useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore } from 'redux'
import { Provider, connect } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Redux Setup ---

interface CounterSlice {
  value: number
}

interface AppState {
  counter: CounterSlice
  unrelated: number
}

const initialState: AppState = {
  counter: { value: 0 },
  unrelated: 0,
}

function rootReducer(
  state = initialState,
  action: { type: string }
): AppState {
  switch (action.type) {
    case 'counter/increment':
      return { ...state, counter: { value: state.counter.value + 1 } }
    case 'counter/decrement':
      return { ...state, counter: { value: state.counter.value - 1 } }
    case 'counter/reset':
      return { ...state, counter: { value: 0 } }
    case 'unrelated/change':
      return { ...state, unrelated: state.unrelated + 1 }
    default:
      return state
  }
}

const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — mapStateToProps'
)

// --- Counter Component ---

interface CounterOwnProps {
  label?: string
}

interface CounterStateProps {
  count: number
}

interface CounterDispatchProps {
  dispatch: (action: { type: string }) => void
}

type CounterProps = CounterOwnProps & CounterStateProps & CounterDispatchProps

function Counter({ count, dispatch, label }: CounterProps) {
  const renders = useRef(0)
  renders.current++

  con.info(`<Counter> рендер #${renders.current}, получил props: { count: ${count}, label: "${label ?? ''}" }`)

  return (
    <div style={{
      border: '2px solid var(--accent-cyan)', borderRadius: 'var(--radius)',
      padding: '16px', background: 'var(--bg-panel)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>
          &lt;ConnectedCounter /&gt;
        </span>
        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', marginLeft: 'auto' }}>
          рендеров: {renders.current}
        </span>
      </div>
      {label && (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '8px' }}>
          {label}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '2.5rem',
          fontWeight: 700, color: 'var(--accent-cyan)', minWidth: '70px', textAlign: 'center',
        }}>
          {count}
        </span>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button className="btn btn--sm btn--accent" onClick={() => {
            con.log('────────────────────────────')
            con.warn('dispatch({ type: "counter/increment" })')
            dispatch({ type: 'counter/increment' })
          }}>+1</button>
          <button className="btn btn--sm" onClick={() => {
            con.log('────────────────────────────')
            con.warn('dispatch({ type: "counter/decrement" })')
            dispatch({ type: 'counter/decrement' })
          }}>−1</button>
          <button className="btn btn--sm btn--danger" onClick={() => {
            con.log('────────────────────────────')
            con.warn('dispatch({ type: "counter/reset" })')
            dispatch({ type: 'counter/reset' })
          }}>Сброс</button>
          <button className="btn btn--sm" style={{ borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)' }} onClick={() => {
            con.log('────────────────────────────')
            con.warn('dispatch({ type: "unrelated/change" })')
            con.log('  state.unrelated изменится, но mapStateToProps вернёт тот же count')
            dispatch({ type: 'unrelated/change' })
          }}>dispatch unrelated</button>
        </div>
      </div>
    </div>
  )
}

// --- mapStateToProps ---

const mapStateToProps = (state: AppState): CounterStateProps => {
  con.log('  mapStateToProps вызван:')
  con.log(`    state = ${JSON.stringify(state)}`)
  con.log(`    возвращает { count: ${state.counter.value} }`)
  return { count: state.counter.value }
}

const ConnectedCounter = connect(mapStateToProps)(Counter)

// --- State inspector ---

function StateInspector() {
  return (
    <div style={{
      background: '#0d0d0d', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', padding: '12px 16px',
      fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
      color: 'var(--text-secondary)', marginBottom: '12px',
    }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
        mapStateToProps
      </div>
      <span style={{ color: 'var(--accent-purple)' }}>const</span> mapStateToProps = (<span style={{ color: 'var(--accent-orange)' }}>state</span>) =&gt; {'({'}<br />
      {'  '}<span style={{ color: '#9cdcfe' }}>count</span>: state.<span style={{ color: '#9cdcfe' }}>counter</span>.<span style={{ color: '#9cdcfe' }}>value</span><br />
      {'}'})
    </div>
  )
}

function App() {
  return (
    <div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>
        mapStateToProps извлекает <code>state.counter.value</code> и передаёт как <code>props.count</code>.
        При dispatch "unrelated/change" — mapStateToProps вызовется, но вернёт тот же count → ре-рендера не будет.
      </p>
      <StateInspector />
      <ConnectedCounter label="Счётчик через connect + mapStateToProps" />
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

con.info('Урок 14: mapStateToProps — основы')
con.log('')
con.log('mapStateToProps = (state) => ({ count: state.counter.value })')
con.log('')
con.log('При каждом dispatch:')
con.log('  1. Subscription уведомляет connect-обёртку')
con.log('  2. Обёртка вызывает mapStateToProps(newState)')
con.log('  3. Сравнивает результат с предыдущим (shallow equal)')
con.log('  4. Если отличается → ре-рендер компонента')
con.log('')
con.info('Попробуйте "dispatch unrelated" — mapStateToProps вызовется, но ре-рендера НЕ будет!')
