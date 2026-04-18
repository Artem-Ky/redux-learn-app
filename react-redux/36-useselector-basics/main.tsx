import { createRoot } from 'react-dom/client'
import { useEffect, useRef, useState } from 'react'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, useSelector } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface CounterState { value: number }
interface UserState { name: string }
interface TodosState { list: string[] }

interface RootState {
  counter: CounterState
  user: UserState
  todos: TodosState
}

type AppAction =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'SET_USER'; payload: string }
  | { type: 'ADD_TODO'; payload: string }
  | { type: 'REMOVE_TODO' }
  | { type: 'RESET' }

// --- Reducers ---

function counterReducer(state: CounterState = { value: 0 }, action: AppAction): CounterState {
  switch (action.type) {
    case 'INCREMENT': return { value: state.value + 1 }
    case 'DECREMENT': return { value: state.value - 1 }
    case 'RESET': return { value: 0 }
    default: return state
  }
}

function userReducer(state: UserState = { name: 'Guest' }, action: AppAction): UserState {
  switch (action.type) {
    case 'SET_USER': return { name: action.payload }
    case 'RESET': return { name: 'Guest' }
    default: return state
  }
}

function todosReducer(state: TodosState = { list: [] }, action: AppAction): TodosState {
  switch (action.type) {
    case 'ADD_TODO': return { list: [...state.list, action.payload] }
    case 'REMOVE_TODO': return { list: state.list.slice(0, -1) }
    case 'RESET': return { list: [] }
    default: return state
  }
}

const rootReducer = combineReducers({
  counter: counterReducer,
  user: userReducer,
  todos: todosReducer,
})
const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — useSelector основы'
)

// --- Flash hook: подсвечивает карточку на 300ms, когда trigger меняется ---
// ВАЖНО: без массива зависимостей у useEffect получается бесконечный цикл
// setOn(true) → re-render → useEffect → setOn(true) → re-render → ...
// Поэтому подсвечиваем именно при изменении читаемого selector'ом значения.

function useFlash(trigger: unknown): string {
  const [on, setOn] = useState(false)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    setOn(true)
    const id = setTimeout(() => setOn(false), 300)
    return () => clearTimeout(id)
  }, [trigger])
  return on ? 'slice-card flashing' : 'slice-card'
}

// --- Three display components, each reads its own slice ---
// Счётчик рендеров считает только рендеры, вызванные изменением selector'а.
// useFlash вызывает ещё 2 extra-рендера (setOn true/false), их в счётчик не включаем.

const counterRenders = { n: 0 }
const userRenders = { n: 0 }
const todoRenders = { n: 0 }

function CounterDisplay() {
  const count = useSelector((state: RootState) => state.counter.value)
  const prev = useRef<number | undefined>(undefined)
  if (prev.current !== count) {
    prev.current = count
    counterRenders.n++
    con.log(`  [CounterDisplay] selector → ${count} · рендер #${counterRenders.n}`)
  }
  const cls = useFlash(count)
  return (
    <div className={cls}>
      <div className="slice-card__title">useSelector(s =&gt; s.counter.value)</div>
      <div className="slice-card__value">{count}</div>
      <div className="slice-card__meta">
        <span>counter</span>
        <span>рендеров: <strong>{counterRenders.n}</strong></span>
      </div>
    </div>
  )
}

function UserName() {
  const name = useSelector((state: RootState) => state.user.name)
  const prev = useRef<string | undefined>(undefined)
  if (prev.current !== name) {
    prev.current = name
    userRenders.n++
    con.log(`  [UserName] selector → "${name}" · рендер #${userRenders.n}`)
  }
  const cls = useFlash(name)
  return (
    <div className={cls}>
      <div className="slice-card__title">useSelector(s =&gt; s.user.name)</div>
      <div className="slice-card__value" style={{ fontSize: '1.2rem', wordBreak: 'break-all' }}>{name}</div>
      <div className="slice-card__meta">
        <span>user</span>
        <span>рендеров: <strong>{userRenders.n}</strong></span>
      </div>
    </div>
  )
}

function TodoCount() {
  const todoCount = useSelector((state: RootState) => state.todos.list.length)
  const prev = useRef<number | undefined>(undefined)
  if (prev.current !== todoCount) {
    prev.current = todoCount
    todoRenders.n++
    con.log(`  [TodoCount] selector → ${todoCount} · рендер #${todoRenders.n}`)
  }
  const cls = useFlash(todoCount)
  return (
    <div className={cls}>
      <div className="slice-card__title">useSelector(s =&gt; s.todos.list.length)</div>
      <div className="slice-card__value">{todoCount}</div>
      <div className="slice-card__meta">
        <span>todos</span>
        <span>рендеров: <strong>{todoRenders.n}</strong></span>
      </div>
    </div>
  )
}

function App() {
  const dispatchAndLog = (action: AppAction, label: string) => {
    con.log('')
    con.info(`📤 store.dispatch(${label})`)
    store.dispatch(action)
  }

  return (
    <div>
      <div className="global-controls">
        <button
          className="btn btn--success"
          onClick={() => dispatchAndLog({ type: 'INCREMENT' }, '{ type: "INCREMENT" }')}
        >counter +1</button>
        <button
          className="btn"
          onClick={() => dispatchAndLog({ type: 'DECREMENT' }, '{ type: "DECREMENT" }')}
        >counter −1</button>
        <button
          className="btn btn--accent"
          onClick={() => {
            const names = ['Alice', 'Bob', 'Charlie', 'Dana', 'Eve']
            const idx = Math.floor(Math.random() * names.length)
            dispatchAndLog({ type: 'SET_USER', payload: names[idx] }, `{ type: "SET_USER", payload: "${names[idx]}" }`)
          }}
        >set user</button>
        <button
          className="btn btn--accent"
          onClick={() => {
            const n = store.getState().todos.list.length + 1
            dispatchAndLog({ type: 'ADD_TODO', payload: `task #${n}` }, `{ type: "ADD_TODO", payload: "task #${n}" }`)
          }}
        >add todo</button>
        <button
          className="btn"
          onClick={() => dispatchAndLog({ type: 'REMOVE_TODO' }, '{ type: "REMOVE_TODO" }')}
        >remove todo</button>
        <button
          className="btn btn--danger"
          onClick={() => dispatchAndLog({ type: 'RESET' }, '{ type: "RESET" }')}
        >reset all</button>
      </div>

      <div className="slice-grid">
        <CounterDisplay />
        <UserName />
        <TodoCount />
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

con.info('useSelector — каждый компонент читает свой срез state')
con.log('')
con.log('CounterDisplay: useSelector(s => s.counter.value)')
con.log('UserName:       useSelector(s => s.user.name)')
con.log('TodoCount:      useSelector(s => s.todos.list.length)')
con.log('')
con.log('После каждого dispatch useSelector запускает selector заново и сравнивает через ===.')
con.log('Ре-рендерится только тот компонент, чьё значение изменилось.')
