import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, useSelector, useDispatch, connect } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface Todo {
  id: number
  text: string
  done: boolean
}

interface TodosState {
  items: Todo[]
  filter: 'all' | 'active' | 'done'
}

interface RootState {
  todos: TodosState
}

// --- Reducer ---

const initialTodos: TodosState = {
  items: [
    { id: 1, text: 'Изучить createStore', done: true },
    { id: 2, text: 'Изучить connect()', done: true },
    { id: 3, text: 'Написать селекторы', done: false },
    { id: 4, text: 'Добавить мемоизацию', done: false },
    { id: 5, text: 'Оптимизировать рендеры', done: false },
  ],
  filter: 'all',
}

let nextId = 6

function todosReducer(
  state = initialTodos,
  action: { type: string; payload?: unknown }
): TodosState {
  switch (action.type) {
    case 'ADD_TODO':
      return {
        ...state,
        items: [...state.items, { id: nextId++, text: action.payload as string, done: false }],
      }
    case 'TOGGLE_TODO':
      return {
        ...state,
        items: state.items.map(t =>
          t.id === (action.payload as number) ? { ...t, done: !t.done } : t
        ),
      }
    case 'SET_FILTER':
      return { ...state, filter: action.payload as 'all' | 'active' | 'done' }
    default:
      return state
  }
}

const rootReducer = combineReducers({ todos: todosReducer })
const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — Селекторы и пересчёт'
)

// --- Selectors with tracking ---

const selectorStats = {
  selectAllTodos: 0,
  selectFilteredTodos: 0,
  selectFilteredTodosCache: 0,
  selectTodoCount: 0,
}

const selectAllTodos = (state: RootState): Todo[] => {
  selectorStats.selectAllTodos++
  return state.todos.items
}

const selectFilter = (state: RootState): string => {
  return state.todos.filter
}

let prevItems: Todo[] | null = null
let prevFilter: string | null = null
let prevFiltered: Todo[] | null = null

const selectFilteredTodos = (state: RootState): Todo[] => {
  const items = selectAllTodos(state)
  const filter = selectFilter(state)

  if (items === prevItems && filter === prevFilter && prevFiltered !== null) {
    selectorStats.selectFilteredTodosCache++
    con.success(`selectFilteredTodos → кэш (входы не изменились). Кэш-хитов: ${selectorStats.selectFilteredTodosCache}`)
    return prevFiltered
  }

  selectorStats.selectFilteredTodos++
  con.warn(`selectFilteredTodos → ПЕРЕСЧЁТ #${selectorStats.selectFilteredTodos} (входы изменились)`)

  prevItems = items
  prevFilter = filter

  let newFiltered: Todo[]
  if (filter === 'done') {
    newFiltered = items.filter(t => t.done)
  } else if (filter === 'active') {
    newFiltered = items.filter(t => !t.done)
  } else {
    newFiltered = items
  }

  // Стабилизация ссылки: если содержимое не изменилось — возвращаем старый массив.
  // Это предотвращает ложные ре-рендеры (например, переключение active-задачи
  // при фильтре 'done' пересчитывает массив, но результат тот же).
  if (
    prevFiltered !== null &&
    newFiltered.length === prevFiltered.length &&
    newFiltered.every((t, i) => t === prevFiltered![i])
  ) {
    con.info('selectFilteredTodos → содержимое не изменилось, ссылка стабилизирована')
    return prevFiltered
  }

  prevFiltered = newFiltered
  return prevFiltered
}

const selectTodoCount = (state: RootState): number => {
  selectorStats.selectTodoCount++
  return state.todos.items.length
}

// --- Connected Component ---

let renderCount = 0

interface TodoListProps {
  todos: Todo[]
  count: number
  filter: string
  statsAllTodos: number
  statsFilteredRecalc: number
  statsFilteredCache: number
  statsTodoCount: number
  dispatch: (action: { type: string; payload?: unknown }) => void
}

function TodoListRaw({ todos, count, filter, statsAllTodos, statsFilteredRecalc, statsFilteredCache, statsTodoCount, dispatch }: TodoListProps) {
  renderCount++
  con.info(`🔄 Рендер компонента #${renderCount}`)

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      {/* Filter bar */}
      <div className="filter-bar">
        {(['all', 'active', 'done'] as const).map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => {
              con.log('')
              con.info(`📤 SET_FILTER → "${f}"`)
              dispatch({ type: 'SET_FILTER', payload: f })
            }}
          >
            {f === 'all' ? 'Все' : f === 'active' ? 'Активные' : 'Выполненные'}
          </button>
        ))}
      </div>

      {/* Todo list */}
      {todos.map(todo => (
        <div key={todo.id} className={`todo-item ${todo.done ? 'done' : ''}`}>
          <input
            type="checkbox"
            className="todo-check"
            checked={todo.done}
            onChange={() => {
              con.log('')
              con.info(`📤 TOGGLE_TODO id=${todo.id}`)
              dispatch({ type: 'TOGGLE_TODO', payload: todo.id })
            }}
          />
          <span className="todo-text">{todo.text}</span>
          <span style={{
            fontSize: '0.7rem', color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)'
          }}>#{todo.id}</span>
        </div>
      ))}

      {/* Add todo */}
      <div style={{ marginTop: 10 }}>
        <button
          className="btn btn--accent btn--sm"
          onClick={() => {
            const text = `Задача #${nextId}`
            con.log('')
            con.info(`📤 ADD_TODO → "${text}"`)
            dispatch({ type: 'ADD_TODO', payload: text })
          }}
        >
          + Добавить задачу
        </button>
      </div>

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stats-bar__item">
          <div className="stats-bar__num">{count}</div>
          <div className="stats-bar__label">Всего</div>
        </div>
        <div className="stats-bar__item">
          <div className="stats-bar__num">{todos.length}</div>
          <div className="stats-bar__label">Показано</div>
        </div>
        <div className="stats-bar__item">
          <div className="stats-bar__num" style={{ color: 'var(--accent-yellow)' }}>{renderCount}</div>
          <div className="stats-bar__label">Рендеров</div>
        </div>
      </div>

      {/* Selector stats */}
      <div className="selector-stats">
        <div className="selector-stat-card">
          <div className="selector-stat-card__name">selectAllTodos</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Вызовов:</div>
          <div className="selector-stat-card__val">{statsAllTodos}</div>
        </div>
        <div className="selector-stat-card">
          <div className="selector-stat-card__name">selectFilteredTodos</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
            Пересчётов: {statsFilteredRecalc} | Кэш: {statsFilteredCache}
          </div>
          <div className="selector-stat-card__val">
            {statsFilteredRecalc + statsFilteredCache}
          </div>
        </div>
        <div className="selector-stat-card">
          <div className="selector-stat-card__name">selectTodoCount</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Вызовов:</div>
          <div className="selector-stat-card__val">{statsTodoCount}</div>
        </div>
      </div>

      {/* mapStateToProps display */}
      <div style={{
        marginTop: 14, padding: 12, background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-sm)', fontSize: '0.78rem',
        fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)'
      }}>
        <div style={{ color: 'var(--accent-yellow)', fontWeight: 600, marginBottom: 4 }}>
          mapStateToProps:
        </div>
        {'(state) => ({\n'}
        {'  todos: selectFilteredTodos(state),\n'}
        {'  count: selectTodoCount(state),\n'}
        {'  filter: state.todos.filter\n'}
        {'})'}
      </div>
    </div>
  )
}

const mapStateToProps = (state: RootState) => {
  const todos = selectFilteredTodos(state)
  const count = selectTodoCount(state)
  return {
    todos,
    count,
    filter: state.todos.filter,
    statsAllTodos: selectorStats.selectAllTodos,
    statsFilteredRecalc: selectorStats.selectFilteredTodos,
    statsFilteredCache: selectorStats.selectFilteredTodosCache,
    statsTodoCount: selectorStats.selectTodoCount,
  }
}

const TodoList = connect(mapStateToProps)(TodoListRaw)

// --- Render ---

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={store}>
    <TodoList />
  </Provider>
)

// --- Initial log ---

con.info('Селекторы в mapStateToProps — selectAllTodos, selectFilteredTodos (мемоизированный), selectTodoCount')
con.log('')
con.log('Попробуйте:')
con.log('  1. Переключить фильтр → selectFilteredTodos пересчитается')
con.log('  2. Отметить задачу → items изменились → пересчёт')
con.log('  3. Следите за кэш-хитами мемоизированного селектора')
