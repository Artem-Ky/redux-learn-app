import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore } from 'redux'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Redux Store ---

interface CounterState {
  value: number
}

const initialState: CounterState = { value: 0 }

function counterReducer(
  state = initialState,
  action: { type: string }
): CounterState {
  switch (action.type) {
    case 'increment':
      return { value: state.value + 1 }
    case 'decrement':
      return { value: state.value - 1 }
    case 'reset':
      return { value: 0 }
    default:
      return state
  }
}

const store = createStore(counterReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — Минимальное React-Redux приложение'
)

// --- React Components ---

function Counter() {
  const count = useSelector((state: CounterState) => state.value)
  const dispatch = useDispatch()

  con.log(`Counter render: count = ${count}`)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center' }}>
      <button
        className="btn"
        onClick={() => {
          dispatch({ type: 'decrement' })
          con.info('dispatch({ type: "decrement" })')
        }}
      >
        −
      </button>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '3rem',
          fontWeight: 700,
          color: 'var(--accent-cyan)',
          minWidth: '80px',
          textAlign: 'center',
        }}
      >
        {count}
      </span>
      <button
        className="btn"
        onClick={() => {
          dispatch({ type: 'increment' })
          con.info('dispatch({ type: "increment" })')
        }}
      >
        +
      </button>
      <button
        className="btn btn--sm"
        style={{ marginLeft: '12px' }}
        onClick={() => {
          dispatch({ type: 'reset' })
          con.warn('dispatch({ type: "reset" })')
        }}
      >
        Reset
      </button>
    </div>
  )
}

function StoreInfo() {
  const count = useSelector((state: CounterState) => state.value)

  return (
    <div
      style={{
        marginTop: '16px',
        padding: '12px 16px',
        background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-sm)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.85rem',
        textAlign: 'center',
      }}
    >
      <span style={{ color: 'var(--text-muted)' }}>store.getState() = </span>
      <span style={{ color: 'var(--accent-orange)' }}>
        {'{ '}
        <span style={{ color: '#9cdcfe' }}>value</span>
        {': '}
        <span style={{ color: '#b5cea8' }}>{count}</span>
        {' }'}
      </span>
    </div>
  )
}

function App() {
  return (
    <>
      <Counter />
      <StoreInfo />
    </>
  )
}

// --- Render ---

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={store}>
    <App />
  </Provider>
)

// --- Copy commands ---

document.querySelectorAll('.setup-step__cmd').forEach((el) => {
  el.addEventListener('click', () => {
    const text = (el as HTMLElement).dataset.copy || el.textContent || ''
    navigator.clipboard.writeText(text).then(() => {
      const orig = el.textContent
      el.textContent = '✔ Скопировано!'
      ;(el as HTMLElement).style.color = 'var(--success)'
      setTimeout(() => {
        el.textContent = orig
        ;(el as HTMLElement).style.color = ''
      }, 1500)
    })
  })
})

// --- Initial log ---

con.info('Минимальное React-Redux приложение запущено!')
con.log('Три компонента: Provider (обёртка), Counter (кнопки), StoreInfo (отображение state)')
con.log('')
con.log('Используемые API:')
con.log('  • createStore(counterReducer) — создание store')
con.log('  • <Provider store={store}> — передача store в дерево')
con.log('  • useSelector(state => state.value) — чтение данных')
con.log('  • useDispatch() — получение dispatch')
con.log('')
con.info('Нажимайте +/−/Reset и смотрите лог!')
