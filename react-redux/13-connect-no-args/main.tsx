import { useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore } from 'redux'
import { Provider, connect, useSelector } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Redux Setup ---

interface AppState {
  count: number
  lastAction: string
}

const initialState: AppState = { count: 0, lastAction: 'none' }

function rootReducer(
  state = initialState,
  action: { type: string }
): AppState {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + 1, lastAction: 'increment' }
    case 'decrement':
      return { ...state, count: state.count - 1, lastAction: 'decrement' }
    case 'reset':
      return { count: 0, lastAction: 'reset' }
    default:
      return state
  }
}

const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — connect() без аргументов'
)

// --- Dispatch-only component (connect with no args) ---

interface DispatchOnlyProps {
  dispatch: (action: { type: string }) => void
}

function ActionButtons({ dispatch, ...rest }: DispatchOnlyProps) {
  const renders = useRef(0)
  renders.current++

  con.info(`<ActionButtons> рендер #${renders.current}`)
  con.log(`  props: { dispatch: [Function], ${Object.keys(rest).length > 0 ? '...' + JSON.stringify(rest) : ''} }`)

  return (
    <div style={{
      border: '2px solid var(--accent-cyan)', borderRadius: 'var(--radius)',
      padding: '16px', background: 'var(--bg-panel)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>
          &lt;ActionButtons /&gt;
        </span>
        <span style={{
          fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px',
          background: 'rgba(78,201,176,0.15)', border: '1px solid var(--accent-cyan)',
          color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)',
        }}>
          connect()()
        </span>
        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', marginLeft: 'auto' }}>
          рендеров: {renders.current}
        </span>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '10px' }}>
        Этот компонент обёрнут в <code>connect()</code> без аргументов.
        Получает <code>props.dispatch</code>, но <strong>не подписан</strong> на store.
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button className="btn btn--sm btn--accent" onClick={() => {
          con.log('────────────────────────────')
          con.warn('props.dispatch({ type: "increment" })')
          dispatch({ type: 'increment' })
        }}>
          props.dispatch(increment)
        </button>
        <button className="btn btn--sm" onClick={() => {
          con.log('────────────────────────────')
          con.warn('props.dispatch({ type: "decrement" })')
          dispatch({ type: 'decrement' })
        }}>
          props.dispatch(decrement)
        </button>
        <button className="btn btn--sm btn--danger" onClick={() => {
          con.log('────────────────────────────')
          con.warn('props.dispatch({ type: "reset" })')
          dispatch({ type: 'reset' })
        }}>
          props.dispatch(reset)
        </button>
      </div>
    </div>
  )
}

const ConnectedActionButtons = connect()(ActionButtons)

// --- State display (uses hooks to show current state) ---

function StateDisplay() {
  const state = useSelector((s: AppState) => s)
  const renders = useRef(0)
  renders.current++

  return (
    <div style={{
      border: '2px solid var(--accent)', borderRadius: 'var(--radius)',
      padding: '16px', background: 'var(--bg-panel)', marginBottom: '12px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--accent)' }}>
          &lt;StateDisplay /&gt;
        </span>
        <span style={{
          fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px',
          background: 'rgba(86,156,214,0.15)', border: '1px solid var(--accent)',
          color: 'var(--accent)', fontFamily: 'var(--font-mono)',
        }}>
          useSelector
        </span>
        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', marginLeft: 'auto' }}>
          рендеров: {renders.current}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        state = {'{'} count: <span style={{ color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '1.1rem' }}>{state.count}</span>,
        lastAction: <span style={{ color: 'var(--accent-orange)' }}>"{state.lastAction}"</span> {'}'}
      </div>
    </div>
  )
}

function App() {
  return (
    <div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>
        <strong>StateDisplay</strong> подписан на store (useSelector) → ре-рендерится.
        <br /><strong>ActionButtons</strong> обёрнут в connect() без аргументов → имеет dispatch, но НЕ ре-рендерится.
      </p>
      <StateDisplay />
      <ConnectedActionButtons />
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

con.info('Урок 13: connect() без аргументов')
con.log('')
con.log('ConnectedActionButtons = connect()(ActionButtons)')
con.log('')
con.log('ActionButtons получает:')
con.log('  ✔ props.dispatch — для отправки actions')
con.log('  ✖ props из state — НЕТ (mapStateToProps не передан)')
con.log('  ✖ подписка на store — НЕТ (не ре-рендерится при dispatch)')
con.log('')
con.info('Нажмите кнопки и сравните счётчики рендеров!')
