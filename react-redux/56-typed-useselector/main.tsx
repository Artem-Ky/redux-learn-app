import { createRoot } from 'react-dom/client'
import { useRef } from 'react'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface CounterState { value: number }
interface UserState { name: string; email: string }

interface RootState {
  counter: CounterState
  user: UserState
}

type AppAction =
  | { type: 'counter/increment' }
  | { type: 'counter/decrement' }
  | { type: 'user/rename'; payload: string }

// --- Reducers ---

function counterReducer(state: CounterState = { value: 0 }, action: AppAction): CounterState {
  switch (action.type) {
    case 'counter/increment': return { value: state.value + 1 }
    case 'counter/decrement': return { value: state.value - 1 }
    default: return state
  }
}

function userReducer(
  state: UserState = { name: 'Alice', email: 'alice@example.com' },
  action: AppAction,
): UserState {
  return action.type === 'user/rename' ? { ...state, name: action.payload } : state
}

const store = createStore(combineReducers({ counter: counterReducer, user: userReducer }))

// --- Pre-typed hook ---
// Это именно то, что даёт урок 55: один раз объявили, везде используем.

const useAppSelector = useSelector.withTypes<RootState>()

// --- Также можно держать selector-функции отдельно ---
// TS infers: (state: RootState) => number
const selectCount = (state: RootState) => state.counter.value
// TS infers: (state: RootState) => string
const selectUserName = (state: RootState) => state.user.name

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — типизация useSelector',
)

// ================================================
// ВАРИАНТ 1 — Ручная типизация в каждом вызове
// ================================================

function CounterManual() {
  const rc = useRef(0)
  rc.current++

  const count = useSelector((state: RootState) => state.counter.value)
  const userName = useSelector((state: RootState) => state.user.name)

  return (
    <div className="ts-card ts-card--manual">
      <div className="ts-card__header">
        <div className="ts-card__title">Ручная типизация в каждом вызове</div>
        <div className="ts-card__badge">boilerplate</div>
      </div>
      <div className="ts-card__demo">
        <div>
          <b style={{ color: 'var(--accent-cyan)' }}>{userName}</b>
          <span style={{ color: 'var(--text-muted)' }}> · count = </span>
          <b style={{ color: 'var(--accent-orange)' }}>{count}</b>
        </div>
      </div>
      <div className="ts-card__code">
{`function CounterManual() {
  const count = useSelector(
    (state: RootState) => state.counter.value,
  )
  const userName = useSelector(
    (state: RootState) => state.user.name,
  )
  return <div>{userName}: {count}</div>
}
// ⚠ если забыть ": RootState" —
//   state станет any, опечатки пройдут молча`}
      </div>
      <div className="ts-card__metric">рендеров: {rc.current}</div>
    </div>
  )
}

// ================================================
// ВАРИАНТ 2 — Pre-typed hook useAppSelector
// ================================================

function CounterTyped() {
  const rc = useRef(0)
  rc.current++

  // Никаких ": RootState" — state выводится автоматически.
  const count = useAppSelector(state => state.counter.value)
  const userName = useAppSelector(state => state.user.name)

  // Альтернатива: вынесенные селекторы.
  // TS выводит возврат из selectCount → number.
  const count2 = useSelector(selectCount)
  const userName2 = useSelector(selectUserName)

  return (
    <div className="ts-card ts-card--pre">
      <div className="ts-card__header">
        <div className="ts-card__title">Pre-typed useAppSelector</div>
        <div className="ts-card__badge">минимум кода</div>
      </div>
      <div className="ts-card__demo">
        <div>
          <b style={{ color: 'var(--accent-cyan)' }}>{userName}</b>
          <span style={{ color: 'var(--text-muted)' }}> · count = </span>
          <b style={{ color: 'var(--success)' }}>{count}</b>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
          selectCount(): {count2} · selectUserName(): {userName2}
        </div>
      </div>
      <div className="ts-card__code">
{`// app/hooks.ts
export const useAppSelector =
  useSelector.withTypes<RootState>()

// Counter.tsx
function CounterTyped() {
  const count    = useAppSelector(s => s.counter.value)
  const userName = useAppSelector(s => s.user.name)
  return <div>{userName}: {count}</div>
}

// Или — вынесенный селектор:
const selectCount = (state: RootState) =>
  state.counter.value
// TS: (state: RootState) => number
const count2 = useSelector(selectCount)
// TS: count2 — number`}
      </div>
      <div className="ts-card__metric">рендеров: {rc.current}</div>
    </div>
  )
}

// ================================================
// App
// ================================================

function App() {
  const dispatch = useDispatch()
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
            con.info('📤 dispatch counter/increment')
            dispatch({ type: 'counter/increment' })
          }}
        >
          counter +
        </button>
        <button
          className="btn"
          onClick={() => {
            con.info('📤 dispatch counter/decrement')
            dispatch({ type: 'counter/decrement' })
          }}
        >
          counter −
        </button>
        <button
          className="btn btn--success"
          onClick={() => {
            const next = store.getState().user.name === 'Alice' ? 'Bob' : 'Alice'
            con.info(`📤 dispatch user/rename → ${next}`)
            dispatch({ type: 'user/rename', payload: next })
          }}
        >
          переименовать user
        </button>
      </div>

      <div className="ts-layout">
        <CounterManual />
        <CounterTyped />
      </div>

      <div style={{
        padding: 12, background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius)', fontSize: '0.85rem', color: 'var(--text-secondary)'
      }}>
        <strong style={{ color: 'var(--accent-yellow)' }}>Наблюдение:</strong> счётчики
        рендеров в обеих карточках одинаковы — в рантайме разницы нет. Разница только в
        компиляции и читаемости исходника.
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={store}>
    <App />
  </Provider>,
)

// --- Initial log ---

con.info('useSelector — дженерик, который возвращает то, что вернул селектор')
con.log('')
con.log('Вариант 1: ручная типизация')
con.log('  useSelector((state: RootState) => state.counter.value)')
con.log('  useSelector((state: RootState) => state.user.name)')
con.log('')
con.log('Вариант 2: pre-typed хук')
con.log('  const useAppSelector = useSelector.withTypes<RootState>()')
con.log('  useAppSelector(state => state.counter.value)  // state уже RootState')
con.log('  useAppSelector(state => state.user.name)')
con.log('')
con.log('В рантайме оба варианта работают идентично:')
con.log('  Subscription.notify() → checkForUpdates → selector → === → forceRender')
