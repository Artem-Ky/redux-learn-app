import { useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore } from 'redux'
import { Provider, connect } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Redux Setup ---

interface AppState {
  count: number
}

const initialState: AppState = { count: 0 }

function rootReducer(state = initialState, action: { type: string }): AppState {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 }
    case 'decrement':
      return { count: state.count - 1 }
    case 'reset':
      return { count: 0 }
    default:
      return state
  }
}

const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — connect() HOC-паттерн'
)

// --- Original Component (not connected) ---

interface CounterProps {
  count: number
  dispatch: (action: { type: string }) => void
}

function Counter({ count, dispatch }: CounterProps) {
  const renders = useRef(0)
  renders.current++

  con.info(`<Counter> рендер #${renders.current}, count = ${count}`)

  return (
    <div style={{
      border: '2px solid var(--accent-orange)', borderRadius: 'var(--radius)',
      padding: '16px', background: 'var(--bg-tertiary)',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
        color: 'var(--accent-orange)', marginBottom: '8px',
      }}>
        &lt;Counter /&gt; <span style={{ color: 'var(--text-muted)' }}>— оригинальный компонент</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '2rem',
          fontWeight: 700, color: 'var(--accent-cyan)', minWidth: '60px', textAlign: 'center',
        }}>
          {count}
        </span>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button className="btn btn--sm btn--accent" onClick={() => {
            con.log('────────────────────────────')
            con.warn('dispatch({ type: "increment" })')
            dispatch({ type: 'increment' })
          }}>+1</button>
          <button className="btn btn--sm" onClick={() => {
            con.log('────────────────────────────')
            con.warn('dispatch({ type: "decrement" })')
            dispatch({ type: 'decrement' })
          }}>−1</button>
          <button className="btn btn--sm btn--danger" onClick={() => {
            con.log('────────────────────────────')
            con.warn('dispatch({ type: "reset" })')
            dispatch({ type: 'reset' })
          }}>Сброс</button>
        </div>
      </div>
      <div style={{
        color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
        fontSize: '0.72rem', marginTop: '8px',
      }}>
        рендеров: {renders.current}
      </div>
    </div>
  )
}

// --- connect() wrapping ---

const mapStateToProps = (state: AppState) => {
  con.log('  mapStateToProps вызван, state:', JSON.stringify(state))
  return { count: state.count }
}

const ConnectedCounter = connect(mapStateToProps)(Counter)

// --- Visual wrapper ---

function WrapperVisualization() {
  return (
    <div style={{ marginTop: '16px' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>
        Визуализация обёртки — ConnectedCounter оборачивает Counter:
      </p>
      <div style={{
        border: '2px dashed var(--accent-cyan)', borderRadius: 'var(--radius)',
        padding: '12px', background: 'var(--bg-panel)',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
          color: 'var(--accent-cyan)', marginBottom: '8px',
        }}>
          &lt;ConnectedCounter /&gt;
          <span style={{ color: 'var(--text-muted)' }}> — обёртка от connect()</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
            ↳ подписан на store, вызывает mapStateToProps, передаёт результат как props
          </span>
        </div>
        <ConnectedCounter />
      </div>
    </div>
  )
}

function App() {
  return (
    <div>
      <WrapperVisualization />
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

// --- Animate HOC flow ---

let flowInterval: ReturnType<typeof setInterval> | null = null

function animateFlow(): void {
  if (flowInterval !== null) clearInterval(flowInterval)

  const ids = ['hoc-original', 'hoc-connect', 'hoc-connected']
  ids.forEach((id) => document.getElementById(id)?.classList.remove('active'))

  let step = 0
  flowInterval = setInterval(() => {
    ids.forEach((id) => document.getElementById(id)?.classList.remove('active'))
    if (step < ids.length) {
      document.getElementById(ids[step])?.classList.add('active')
    } else {
      clearInterval(flowInterval!)
      flowInterval = null
    }
    step++
  }, 700)
}

animateFlow()
setInterval(animateFlow, 5000)

// --- Initial log ---

con.info('Урок 12: connect() — HOC-паттерн')
con.log('')
con.log('connect(mapStateToProps)(Counter) → ConnectedCounter')
con.log('')
con.log('Структура:')
con.log('  ConnectedCounter (обёртка)')
con.log('    └─ Counter (оригинал)')
con.log('')
con.info('Нажмите кнопки — увидите вызов mapStateToProps и ре-рендер Counter.')
