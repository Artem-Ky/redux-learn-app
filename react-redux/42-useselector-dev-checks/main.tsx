import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, useSelector } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface CounterState { value: number }
interface UserState { name: string }

interface RootState {
  counter: CounterState
  user: UserState
}

type AppAction =
  | { type: 'INCREMENT' }
  | { type: 'SET_USER'; payload: string }

function counterReducer(state: CounterState = { value: 0 }, action: AppAction): CounterState {
  switch (action.type) {
    case 'INCREMENT': return { value: state.value + 1 }
    default: return state
  }
}

function userReducer(state: UserState = { name: 'Alice' }, action: AppAction): UserState {
  switch (action.type) {
    case 'SET_USER': return { name: action.payload }
    default: return state
  }
}

const rootReducer = combineReducers({ counter: counterReducer, user: userReducer })
const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — dev-mode checks + предупреждения react-redux'
)

// --- Перехватываем console.warn / console.error, чтобы видеть warning из react-redux в панели ---
// Важно: react-redux v9 пишет stabilityCheck / identityFunctionCheck через console.warn,
// а не через console.error. Поэтому перехватываем оба.

function intercept(method: 'warn' | 'error'): void {
  const original = console[method].bind(console)
  console[method] = (...args: unknown[]) => {
    original(...args)
    const first = args[0]
    if (typeof first === 'string' && first.startsWith('Selector ')) {
      // Короткий однострочник: до первой \n — сама фраза, остальное (stack, state) в devtools.
      const short = first.split('\n')[0]
      con.error(`[react-redux ${method}] ${short}`)
    }
  }
}

intercept('warn')
intercept('error')

type Mode = 'never' | 'once' | 'always'

// --- Bad selector 1: returns new object (stabilityCheck triggers) ---

function BadObjectCard({ mode }: { mode: Mode }) {
  const data = useSelector(
    (state: RootState) => ({
      count: state.counter.value,
      user: state.user.name,
    }),
    { devModeChecks: { stabilityCheck: mode } }
  )
  return (
    <div className="dev-card__output">
      selector вернул: <strong>{`{ count: ${data.count}, user: "${data.user}" }`}</strong>
      <div style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: '0.72rem' }}>
        — новый объект, даже если count и user не изменились
      </div>
    </div>
  )
}

// --- Bad selector 2: returns entire state (identityFunctionCheck triggers) ---

function BadIdentityCard({ mode }: { mode: Mode }) {
  const everything = useSelector(
    (state: RootState) => state,
    { devModeChecks: { identityFunctionCheck: mode } }
  )
  return (
    <div className="dev-card__output">
      selector вернул: <strong>state (root)</strong>
      <div style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: '0.72rem' }}>
        keys: [{Object.keys(everything).join(', ')}]
      </div>
    </div>
  )
}

// --- Mode selector ---

function ModeButtons({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const modes: Mode[] = ['never', 'once', 'always']
  return (
    <div className="dev-card__mode">
      <span className="dev-card__mode-label">devModeChecks:</span>
      {modes.map(m => (
        <button
          key={m}
          className={`dev-mode-btn ${mode === m ? 'active' : ''}`}
          onClick={() => onChange(m)}
        >
          '{m}'{m === 'once' ? ' (default)' : ''}
        </button>
      ))}
    </div>
  )
}

function App() {
  const [stabMode, setStabMode] = useState<Mode>('once')
  const [idMode, setIdMode] = useState<Mode>('once')
  const [remount, setRemount] = useState(0)

  const dispatchAndLog = (action: AppAction, label: string) => {
    con.log('')
    con.info(`📤 store.dispatch(${label})`)
    store.dispatch(action)
  }

  return (
    <div>
      <div className="provider-info">
        Глобально можно настроить так: <br />
        <code>&lt;Provider store={'{store}'} stabilityCheck="always" identityFunctionCheck="always"&gt;</code>
        <br />
        Ниже — per-hook настройка через второй аргумент <code>useSelector</code>.
      </div>

      <div className="global-controls">
        <button
          className="btn btn--success"
          onClick={() => dispatchAndLog({ type: 'INCREMENT' }, '{ type: "INCREMENT" }')}
        >counter +1</button>
        <button
          className="btn btn--accent"
          onClick={() => {
            const next = store.getState().user.name === 'Alice' ? 'Bob' : 'Alice'
            dispatchAndLog(
              { type: 'SET_USER', payload: next },
              `{ type: "SET_USER", payload: "${next}" }`
            )
          }}
        >change user</button>
        <button
          className="btn btn--danger"
          onClick={() => {
            setRemount(n => n + 1)
            con.log('')
            con.warn(`🔄 remount обоих карточек (forceRemount #${remount + 1})`)
            con.warn('   для mode="once" проверка сработает ещё раз на первом вызове')
          }}
        >remount cards</button>
      </div>

      <div className="dev-grid">
        <div className="dev-card dev-card--stability">
          <span className="dev-card__tag">stabilityCheck</span>
          <div className="dev-card__title">Selector возвращает новый объект каждый раз</div>
          <div className="dev-card__code">{`useSelector(
  state => ({
    count: state.counter.value,
    user: state.user.name
  }),
  { devModeChecks: { stabilityCheck: '${stabMode}' } }
)`}</div>
          <ModeButtons mode={stabMode} onChange={setStabMode} />
          <BadObjectCard key={`stab-${stabMode}-${remount}`} mode={stabMode} />
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            never → проверка выключена · once → только при первом вызове · always → на каждом dispatch
          </div>
        </div>

        <div className="dev-card dev-card--identity">
          <span className="dev-card__tag">identityFunctionCheck</span>
          <div className="dev-card__title">Selector возвращает root state целиком</div>
          <div className="dev-card__code">{`useSelector(
  state => state,
  { devModeChecks: { identityFunctionCheck: '${idMode}' } }
)`}</div>
          <ModeButtons mode={idMode} onChange={setIdMode} />
          <BadIdentityCard key={`id-${idMode}-${remount}`} mode={idMode} />
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            result === state (root) — identity function pattern
          </div>
        </div>
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

con.info('Dev-mode checks появились в react-redux v8.1.0 — работают только в development')
con.log('')
con.log('stabilityCheck:          ловит selector → новый объект/массив (→ ненужные ре-рендеры)')
con.log('identityFunctionCheck:   ловит selector → весь state целиком (state => state)')
con.log('')
con.log('Значения: "never" | "once" (default) | "always"')
con.log('')
con.log('Сразу после загрузки страницы — уже должно быть два warning от react-redux:')
con.log('  • "Selector unknown returned a different result..."  — это stabilityCheck')
con.log('  • "Selector unknown returned the root state..."      — это identityFunctionCheck')
con.log('')
con.log('Переключите mode = "always" и нажмите counter +1 — warning будет на каждом dispatch.')
con.log('Переключите mode = "never" — warning пропадёт полностью (нажмите "remount cards").')
