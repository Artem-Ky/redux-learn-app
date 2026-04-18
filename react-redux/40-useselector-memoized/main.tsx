import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, useSelector } from 'react-redux'
import { createSelector } from 'reselect'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface Todo { id: number; text: string; completed: boolean }
interface TodosState { list: Todo[] }
interface UserState { name: string }

interface RootState {
  todos: TodosState
  user: UserState
}

type AppAction =
  | { type: 'ADD_TODO'; payload: string }
  | { type: 'TOGGLE_TODO'; payload: number }
  | { type: 'REMOVE_LAST' }
  | { type: 'SET_USER'; payload: string }
  | { type: 'RESET' }

let nextId = 1

// --- Reducers ---

const initialTodos: Todo[] = [
  { id: nextId++, text: 'Изучить Redux', completed: true },
  { id: nextId++, text: 'Изучить React-Redux', completed: true },
  { id: nextId++, text: 'Изучить reselect', completed: false },
  { id: nextId++, text: 'Написать приложение', completed: false },
]

function todosReducer(state: TodosState = { list: initialTodos }, action: AppAction): TodosState {
  switch (action.type) {
    case 'ADD_TODO':
      return { list: [...state.list, { id: nextId++, text: action.payload, completed: false }] }
    case 'TOGGLE_TODO':
      return {
        list: state.list.map(t => t.id === action.payload ? { ...t, completed: !t.completed } : t),
      }
    case 'REMOVE_LAST':
      return { list: state.list.slice(0, -1) }
    case 'RESET':
      return { list: initialTodos }
    default:
      return state
  }
}

function userReducer(state: UserState = { name: 'Alice' }, action: AppAction): UserState {
  switch (action.type) {
    case 'SET_USER': return { name: action.payload }
    case 'RESET': return { name: 'Alice' }
    default: return state
  }
}

const rootReducer = combineReducers({ todos: todosReducer, user: userReducer })
const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — inline / outside / createSelector'
)

// --- Filter-call / render counters (side-effect только для демо) ---
// filterCalls — сколько раз selector'у пришлось реально фильтровать список.
// rc           — сколько раз ре-рендерился каждый вариант карточки.

const filterCalls = { inline: 0, outside: 0, memo: 0 }

// --- Vartiant 2: selector outside component, NOT memoized ---

const selectCompletedOutside = (state: RootState): Todo[] => {
  filterCalls.outside++
  return state.todos.list.filter(t => t.completed)
}

// --- Variant 3: createSelector (memoized) ---

const selectCompletedMemo = createSelector(
  (state: RootState) => state.todos.list,
  (list): Todo[] => {
    filterCalls.memo++
    return list.filter(t => t.completed)
  }
)

// --- Render counters ---

const rc = { inline: 0, outside: 0, memo: 0 }

// --- Variant 1: inline ---

function CardInline() {
  const completed = useSelector((state: RootState) => {
    filterCalls.inline++
    return state.todos.list.filter(t => t.completed)
  })
  rc.inline++
  con.warn(`[1 inline]   рендер #${rc.inline} · filter-calls: ${filterCalls.inline} · длина: ${completed.length}`)
  return (
    <div className="mem-card mem-card--bad">
      <span className="mem-card__tag">❌ Bad</span>
      <div className="mem-card__title">1. Inline selector</div>
      <div className="mem-card__code">{`useSelector(state =>
  state.todos.list.filter(t => t.completed)
)`}</div>
      <div className="mem-card__list">
        {completed.length === 0
          ? <div className="mem-card__list-empty">— пусто —</div>
          : completed.map(t => (
              <div className="mem-card__list-item" key={t.id}>✓ {t.text}</div>
            ))}
      </div>
      <div className="mem-card__stats">
        <div className="mem-card__stat">
          <div className="mem-card__stat-label">рендеров</div>
          <div className="mem-card__stat-val mem-card__stat-val--red">{rc.inline}</div>
        </div>
        <div className="mem-card__stat">
          <div className="mem-card__stat-label">filter вызвано</div>
          <div className="mem-card__stat-val mem-card__stat-val--red">{filterCalls.inline}</div>
        </div>
      </div>
    </div>
  )
}

// --- Variant 2: selector outside, but not memoized ---

function CardOutside() {
  const completed = useSelector(selectCompletedOutside)
  rc.outside++
  con.warn(`[2 outside]  рендер #${rc.outside} · filter-calls: ${filterCalls.outside} · длина: ${completed.length}`)
  return (
    <div className="mem-card mem-card--meh">
      <span className="mem-card__tag">⚠ Лучше, но тоже не то</span>
      <div className="mem-card__title">2. Selector вне компонента</div>
      <div className="mem-card__code">{`const selectCompleted =
  state => state.todos.list.filter(t => t.completed)

useSelector(selectCompleted)`}</div>
      <div className="mem-card__list">
        {completed.length === 0
          ? <div className="mem-card__list-empty">— пусто —</div>
          : completed.map(t => (
              <div className="mem-card__list-item" key={t.id}>✓ {t.text}</div>
            ))}
      </div>
      <div className="mem-card__stats">
        <div className="mem-card__stat">
          <div className="mem-card__stat-label">рендеров</div>
          <div className="mem-card__stat-val mem-card__stat-val--red">{rc.outside}</div>
        </div>
        <div className="mem-card__stat">
          <div className="mem-card__stat-label">filter вызвано</div>
          <div className="mem-card__stat-val mem-card__stat-val--red">{filterCalls.outside}</div>
        </div>
      </div>
    </div>
  )
}

// --- Variant 3: createSelector (memoized) ---

function CardMemo() {
  const completed = useSelector(selectCompletedMemo)
  rc.memo++
  con.success(`[3 memo]     рендер #${rc.memo} · filter-calls: ${filterCalls.memo} · длина: ${completed.length}`)
  return (
    <div className="mem-card mem-card--good">
      <span className="mem-card__tag">✔ Good</span>
      <div className="mem-card__title">3. createSelector (reselect)</div>
      <div className="mem-card__code">{`import { createSelector } from 'reselect'

const selectCompleted = createSelector(
  state => state.todos.list,
  list => list.filter(t => t.completed)
)

useSelector(selectCompleted)`}</div>
      <div className="mem-card__list">
        {completed.length === 0
          ? <div className="mem-card__list-empty">— пусто —</div>
          : completed.map(t => (
              <div className="mem-card__list-item" key={t.id}>✓ {t.text}</div>
            ))}
      </div>
      <div className="mem-card__stats">
        <div className="mem-card__stat">
          <div className="mem-card__stat-label">рендеров</div>
          <div className="mem-card__stat-val mem-card__stat-val--green">{rc.memo}</div>
        </div>
        <div className="mem-card__stat">
          <div className="mem-card__stat-label">filter вызвано</div>
          <div className="mem-card__stat-val mem-card__stat-val--green">{filterCalls.memo}</div>
        </div>
      </div>
    </div>
  )
}

function TodosPanel() {
  const list = useSelector((state: RootState) => state.todos.list)
  return (
    <div className="todo-list-panel">
      <div className="todo-list-panel__header">Все todos в store · кликните по чекбоксу, чтобы toggle</div>
      <div className="todo-list-panel__list">
        {list.map(t => (
          <div
            key={t.id}
            className={t.completed ? 'todo-list-panel__item completed' : 'todo-list-panel__item'}
          >
            <input
              type="checkbox"
              checked={t.completed}
              onChange={() => {
                con.log('')
                con.info(`📤 store.dispatch({ type: "TOGGLE_TODO", payload: ${t.id} })`)
                store.dispatch({ type: 'TOGGLE_TODO', payload: t.id })
              }}
            />
            <span className="todo-list-panel__text">{t.text}</span>
          </div>
        ))}
        {list.length === 0 && <div className="mem-card__list-empty">— пусто —</div>}
      </div>
    </div>
  )
}

function UserDisplay() {
  const name = useSelector((state: RootState) => state.user.name)
  return (
    <div className="user-display">
      state.user.name = <strong>"{name}"</strong>
      <span style={{ color: 'var(--text-muted)' }}> — этот слайс НЕ связан с todos</span>
    </div>
  )
}

function App() {
  const dispatchAndLog = (action: AppAction, label: string) => {
    const beforeFilter = { ...filterCalls }
    const beforeRender = { ...rc }
    con.log('')
    con.info(`📤 store.dispatch(${label})`)
    store.dispatch(action)
    Promise.resolve().then(() => {
      const dI  = filterCalls.inline  - beforeFilter.inline
      const dO  = filterCalls.outside - beforeFilter.outside
      const dM  = filterCalls.memo    - beforeFilter.memo
      const drI = rc.inline  - beforeRender.inline
      const drO = rc.outside - beforeRender.outside
      const drM = rc.memo    - beforeRender.memo
      con.warn(`  [1 inline]   +${dI} filter · +${drI} render`)
      con.warn(`  [2 outside]  +${dO} filter · +${drO} render`)
      con.success(`  [3 memo]     +${dM} filter · +${drM} render`)
    })
  }

  return (
    <div>
      <UserDisplay />
      <div className="global-controls">
        <button className="btn btn--success" onClick={() => {
          const n = store.getState().todos.list.length + 1
          dispatchAndLog({ type: 'ADD_TODO', payload: `task #${n}` }, `{ type: "ADD_TODO", payload: "task #${n}" }`)
        }}>add todo</button>
        <button className="btn" onClick={() => dispatchAndLog({ type: 'REMOVE_LAST' }, '{ type: "REMOVE_LAST" }')}>
          remove last
        </button>
        <button className="btn btn--accent" onClick={() => {
          const next = store.getState().user.name === 'Alice' ? 'Bob' : 'Alice'
          dispatchAndLog({ type: 'SET_USER', payload: next }, `{ type: "SET_USER", payload: "${next}" } — unrelated`)
        }}>
          change user (unrelated)
        </button>
        <button className="btn btn--danger" onClick={() => dispatchAndLog({ type: 'RESET' }, '{ type: "RESET" }')}>
          reset
        </button>
      </div>

      <TodosPanel />

      <div className="mem-grid">
        <CardInline />
        <CardOutside />
        <CardMemo />
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

con.info('Три варианта selector для фильтрации todos')
con.log('')
con.log('[1 inline]   селектор объявлен прямо в useSelector — рендер на каждом dispatch')
con.log('[2 outside]  селектор вне компонента, но БЕЗ мемоизации — .filter() даёт новый массив')
con.log('[3 memo]     createSelector — результат закешировал, если todos.list не поменялся')
con.log('')
con.log('Нажмите "change user (unrelated)" — todos не меняются.')
con.log('Card [3 memo] НЕ ре-рендерится (возвращена та же ссылка). Cards [1] и [2] — ре-рендерятся.')
