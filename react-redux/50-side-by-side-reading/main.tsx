import { useRef, useState, memo } from 'react'
import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, connect, useSelector, type ConnectedProps } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface CounterState { value: number }
interface UserState   { name: string; email: string }
interface NoiseState  { tick: number }

interface RootState {
  counter: CounterState
  user: UserState
  noise: NoiseState
}

type AppAction =
  | { type: 'INCREMENT' }
  | { type: 'SET_USER'; payload: string }
  | { type: 'SET_EMAIL'; payload: string }
  | { type: 'TICK' }

// --- Reducers ---

function counterReducer(state: CounterState = { value: 0 }, action: AppAction): CounterState {
  switch (action.type) {
    case 'INCREMENT': return { value: state.value + 1 }
    default: return state
  }
}

function userReducer(
  state: UserState = { name: 'Alice', email: 'alice@example.com' },
  action: AppAction
): UserState {
  switch (action.type) {
    case 'SET_USER':  return { ...state, name: action.payload }
    case 'SET_EMAIL': return { ...state, email: action.payload }
    default: return state
  }
}

function noiseReducer(state: NoiseState = { tick: 0 }, action: AppAction): NoiseState {
  switch (action.type) {
    case 'TICK': return { tick: state.tick + 1 }
    default: return state
  }
}

const rootReducer = combineReducers({
  counter: counterReducer,
  user: userReducer,
  noise: noiseReducer,
})

const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — connect vs useSelector (чтение)'
)

// ================================================
// Версия 1: connect + mapStateToProps
// ================================================

interface OwnProps { title: string }

const mapStateToProps = (state: RootState) => ({
  count: state.counter.value,
  userName: state.user.name,
})

const connector = connect(mapStateToProps)
type ConnectProps = ConnectedProps<typeof connector> & OwnProps

function UserCounterConnectRaw({ title, count, userName }: ConnectProps) {
  const renders = useRef(0)
  renders.current++
  con.info(`[connect] рендер #${renders.current} · userName="${userName}", count=${count}`)

  return (
    <div className="sbs-card sbs-card--connect">
      <div className="sbs-card__header">
        <div className="sbs-card__title">connect + mapStateToProps</div>
        <div className="sbs-card__renders">рендеров: {renders.current}</div>
      </div>
      <h3 className="sbs-card__title-h3">{title}</h3>
      <div className="sbs-card__body">
        <div>user: <strong>{userName}</strong></div>
        <div>count: <strong>{count}</strong></div>
      </div>
      <div className="sbs-card__code">{`const mapStateToProps = state => ({
  count: state.counter.value,
  userName: state.user.name,
})

connect(mapStateToProps)(UserCounter)`}</div>
    </div>
  )
}

const UserCounterConnect = connector(UserCounterConnectRaw)

// ================================================
// Версия 2: useSelector
// ================================================

function UserCounterHook({ title }: OwnProps) {
  const count    = useSelector((state: RootState) => state.counter.value)
  const userName = useSelector((state: RootState) => state.user.name)

  const renders = useRef(0)
  renders.current++
  con.warn(`[hook]    рендер #${renders.current} · userName="${userName}", count=${count}`)

  return (
    <div className="sbs-card sbs-card--hooks">
      <div className="sbs-card__header">
        <div className="sbs-card__title">useSelector</div>
        <div className="sbs-card__renders">рендеров: {renders.current}</div>
      </div>
      <h3 className="sbs-card__title-h3">{title}</h3>
      <div className="sbs-card__body">
        <div>user: <strong>{userName}</strong></div>
        <div>count: <strong>{count}</strong></div>
      </div>
      <div className="sbs-card__code">{`const count = useSelector(s => s.counter.value)
const userName = useSelector(s => s.user.name)`}</div>
    </div>
  )
}

// ================================================
// Версия 3: useSelector + React.memo (для сравнения с parent re-render)
// ================================================

const UserCounterHookMemo = memo(function UserCounterHookMemoRaw({ title }: OwnProps) {
  const count    = useSelector((state: RootState) => state.counter.value)
  const userName = useSelector((state: RootState) => state.user.name)

  const renders = useRef(0)
  renders.current++
  con.success(`[memo]    рендер #${renders.current} · userName="${userName}", count=${count}`)

  return (
    <div className="sbs-card" style={{ borderColor: 'rgba(76, 175, 80, 0.6)' }}>
      <div className="sbs-card__header">
        <div className="sbs-card__title" style={{ color: 'var(--success)' }}>
          useSelector + React.memo
        </div>
        <div className="sbs-card__renders">рендеров: {renders.current}</div>
      </div>
      <h3 className="sbs-card__title-h3">{title}</h3>
      <div className="sbs-card__body">
        <div>user: <strong>{userName}</strong></div>
        <div>count: <strong>{count}</strong></div>
      </div>
      <div className="sbs-card__code">{`const C = memo(({ title }) => {
  const count = useSelector(s => s.counter.value)
  ...
})`}</div>
    </div>
  )
})

// ================================================
// Parent — ре-рендерится по своему state (не Redux)
// ================================================

function Parent() {
  const [parentTick, setParentTick] = useState(0)
  const parentRenders = useRef(0)
  parentRenders.current++

  return (
    <div>
      <div className="parent-panel">
        <div className="parent-panel__title">Parent (ре-рендерится по своему React state)</div>
        <div className="parent-panel__counter">
          parentTick: <strong>{parentTick}</strong> · рендеров Parent: <strong>{parentRenders.current}</strong>
        </div>
        <button
          className="btn btn--accent"
          style={{ marginTop: 8 }}
          onClick={() => {
            con.log('')
            con.warn(`setParentTick(${parentTick + 1}) — parent re-render, state Redux НЕ меняется`)
            setParentTick(t => t + 1)
          }}
        >
          Ре-рендер Parent (без dispatch)
        </button>
      </div>

      <div className="sbs-grid">
        <UserCounterConnect title={`Слева — connect (parentTick ${parentTick})`} />
        <UserCounterHook    title={`Справа — useSelector (parentTick ${parentTick})`} />
      </div>

      <div style={{ margin: '8px 0 6px', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
        Тот же hook-компонент, но завёрнутый в <code>React.memo</code>:
      </div>
      <UserCounterHookMemo title={`useSelector + memo (parentTick ${parentTick})`} />
    </div>
  )
}

// ================================================
// App
// ================================================

function App() {
  const dispatchAndLog = (action: AppAction, label: string) => {
    con.log('')
    con.info(`📤 store.dispatch(${label})`)
    store.dispatch(action)
  }

  return (
    <div>
      <div className="global-controls">
        <button className="btn btn--success" onClick={() => dispatchAndLog({ type: 'INCREMENT' }, '{ type: "INCREMENT" }')}>
          counter + 1 (подписанное поле)
        </button>
        <button className="btn btn--accent" onClick={() => {
          const names = ['Alice', 'Bob', 'Charlie', 'Dave']
          const next = names[Math.floor(Math.random() * names.length)]
          dispatchAndLog({ type: 'SET_USER', payload: next }, `{ type: "SET_USER", payload: "${next}" }`)
        }}>
          сменить user.name (подписанное поле)
        </button>
        <button className="btn" onClick={() => dispatchAndLog({ type: 'SET_EMAIL', payload: `e${Date.now()%1000}@x.ru` }, '{ type: "SET_EMAIL" } — unrelated')}>
          сменить user.email (unrelated)
        </button>
        <button className="btn btn--danger" onClick={() => dispatchAndLog({ type: 'TICK' }, '{ type: "TICK" } — unrelated')}>
          noise.tick + 1 (unrelated)
        </button>
      </div>

      <Parent />
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

con.info('Урок 50 — сравнение: mapStateToProps vs useSelector')
con.log('')
con.log('Оба компонента читают state.counter.value и state.user.name.')
con.log('')
con.info('Сценарии:')
con.log('  1. counter + 1       → оба ре-рендерятся (подписаны)')
con.log('  2. SET_USER          → оба ре-рендерятся (подписаны)')
con.log('  3. SET_EMAIL         → оба НЕ ре-рендерятся (unrelated)')
con.log('  4. TICK              → оба НЕ ре-рендерятся (unrelated)')
con.log('  5. Ре-рендер Parent  → connect НЕ ре-рендерится, useSelector РЕ-рендерится,')
con.log('                         useSelector+memo НЕ ре-рендерится (props title меняется,')
con.log('                         поэтому memo всё-таки обновит — это видно в title)')
