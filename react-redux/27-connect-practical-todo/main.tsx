import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, connect } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

type VisibilityFilter = 'all' | 'completed' | 'incomplete'

interface Todo {
  id: number
  content: string
  completed: boolean
}

interface TodosState {
  byIds: Record<number, Todo>
  allIds: number[]
}

interface RootState {
  todos: TodosState
  visibilityFilter: VisibilityFilter
}

type Action =
  | { type: 'ADD_TODO'; payload: { id: number; content: string } }
  | { type: 'TOGGLE_TODO'; payload: { id: number } }
  | { type: 'SET_FILTER'; payload: { filter: VisibilityFilter } }

// --- Action creators ---

let nextTodoId = 1

const addTodo = (content: string): Action => ({
  type: 'ADD_TODO',
  payload: { id: nextTodoId++, content },
})

const toggleTodo = (id: number): Action => ({
  type: 'TOGGLE_TODO',
  payload: { id },
})

const setFilter = (filter: VisibilityFilter): Action => ({
  type: 'SET_FILTER',
  payload: { filter },
})

// --- Reducers ---

const todosInitial: TodosState = {
  byIds: {
    1: { id: 1, content: 'Прочитать туториал react-redux', completed: true },
    2: { id: 2, content: 'Пройти урок 27', completed: false },
    3: { id: 3, content: 'Написать свой Todo-лист', completed: false },
  },
  allIds: [1, 2, 3],
}
nextTodoId = 4

function todosReducer(state: TodosState = todosInitial, action: Action): TodosState {
  switch (action.type) {
    case 'ADD_TODO': {
      const { id, content } = action.payload
      return {
        byIds: { ...state.byIds, [id]: { id, content, completed: false } },
        allIds: [...state.allIds, id],
      }
    }
    case 'TOGGLE_TODO': {
      const { id } = action.payload
      const prev = state.byIds[id]
      if (!prev) return state
      return {
        ...state,
        byIds: { ...state.byIds, [id]: { ...prev, completed: !prev.completed } },
      }
    }
    default:
      return state
  }
}

function visibilityFilterReducer(
  state: VisibilityFilter = 'all',
  action: Action
): VisibilityFilter {
  switch (action.type) {
    case 'SET_FILTER': return action.payload.filter
    default: return state
  }
}

const rootReducer = combineReducers({
  todos: todosReducer,
  visibilityFilter: visibilityFilterReducer,
})
const store = createStore(rootReducer)

// --- Selectors ---

const getTodos = (state: RootState): Todo[] =>
  state.todos.allIds.map(id => state.todos.byIds[id])

const getTodosByVisibilityFilter = (
  state: RootState,
  filter: VisibilityFilter
): Todo[] => {
  const all = getTodos(state)
  switch (filter) {
    case 'completed':  return all.filter(t => t.completed)
    case 'incomplete': return all.filter(t => !t.completed)
    default:           return all
  }
}

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — Todo через connect'
)

// ================================================
// AddTodo — connect(null, { addTodo })
// ================================================

interface AddTodoProps {
  addTodo: (content: string) => Action
}

function AddTodoRaw({ addTodo }: AddTodoProps) {
  const [value, setValue] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    con.log('')
    con.info(`📤 AddTodo: props.addTodo("${trimmed}")`)
    addTodo(trimmed)
    setValue('')
  }

  return (
    <form className="add-todo" onSubmit={submit}>
      <input
        className="add-todo__input"
        placeholder="Что нужно сделать?"
        value={value}
        onChange={e => setValue(e.target.value)}
      />
      <button type="submit" className="btn btn--success">Добавить</button>
    </form>
  )
}

const AddTodo = connect(null, { addTodo })(AddTodoRaw)

// ================================================
// Todo — connect(null, { toggleTodo })
// ================================================

interface TodoItemProps {
  todo: Todo
  toggleTodo: (id: number) => Action
}

function TodoRaw({ todo, toggleTodo }: TodoItemProps) {
  const onClick = () => {
    con.log('')
    con.info(`📤 Todo #${todo.id}: props.toggleTodo(${todo.id})`)
    toggleTodo(todo.id)
  }
  return (
    <div
      className={'todo-item' + (todo.completed ? ' todo-item--done' : '')}
      onClick={onClick}
    >
      <div className="todo-item__check" />
      <div className="todo-item__text">{todo.content}</div>
      <div className="todo-item__id">#{todo.id}</div>
    </div>
  )
}

const TodoItem = connect(null, { toggleTodo })(TodoRaw)

// ================================================
// TodoList — connect(mapStateToProps)
// ================================================

interface TodoListProps {
  todos: Todo[]
}

function TodoListRaw({ todos }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <div className="todo-list">
        <div className="todo-list__empty">Пусто — нет todo по текущему фильтру</div>
      </div>
    )
  }
  return (
    <div className="todo-list">
      {todos.map(t => <TodoItem key={t.id} todo={t} />)}
    </div>
  )
}

const mapStateToPropsTodoList = (state: RootState) => ({
  todos: getTodosByVisibilityFilter(state, state.visibilityFilter),
})

const TodoList = connect(mapStateToPropsTodoList)(TodoListRaw)

// ================================================
// VisibilityFilters — connect(mapStateToProps, { setFilter })
// ================================================

interface VisibilityFiltersProps {
  activeFilter: VisibilityFilter
  setFilter: (filter: VisibilityFilter) => Action
}

const FILTERS: { key: VisibilityFilter; label: string }[] = [
  { key: 'all',        label: 'Все' },
  { key: 'incomplete', label: 'Активные' },
  { key: 'completed',  label: 'Выполненные' },
]

function VisibilityFiltersRaw({ activeFilter, setFilter }: VisibilityFiltersProps) {
  return (
    <div className="filters">
      {FILTERS.map(f => (
        <button
          key={f.key}
          className={'filters__btn' + (activeFilter === f.key ? ' filters__btn--active' : '')}
          onClick={() => {
            if (activeFilter === f.key) return
            con.log('')
            con.info(`📤 VisibilityFilters: props.setFilter("${f.key}")`)
            setFilter(f.key)
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

const mapStateToPropsFilters = (state: RootState) => ({
  activeFilter: state.visibilityFilter,
})

const VisibilityFilters = connect(mapStateToPropsFilters, { setFilter })(
  VisibilityFiltersRaw
)

// ================================================
// Stats — connect(mapStateToProps) (вспомогательный)
// ================================================

interface StatsProps {
  total: number
  done: number
  filter: VisibilityFilter
}

function StatsRaw({ total, done, filter }: StatsProps) {
  return (
    <div className="stats">
      <span>всего: <strong>{total}</strong></span>
      <span>·</span>
      <span>выполнено: <strong>{done}</strong></span>
      <span>·</span>
      <span>фильтр: <strong>{filter}</strong></span>
    </div>
  )
}

const Stats = connect((state: RootState) => {
  const all = getTodos(state)
  return {
    total: all.length,
    done: all.filter(t => t.completed).length,
    filter: state.visibilityFilter,
  }
})(StatsRaw)

// ================================================
// App
// ================================================

function App() {
  return (
    <div className="todo-app">
      <AddTodo />
      <VisibilityFilters />
      <TodoList />
      <Stats />
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

con.info('Todo-приложение через connect — по туториалу react-redux')
con.log('')
con.log('AddTodo           → connect(null, { addTodo })')
con.log('Todo              → connect(null, { toggleTodo })')
con.log('TodoList          → connect(state => ({ todos: ... }))')
con.log('VisibilityFilters → connect(state => ({ activeFilter }), { setFilter })')
con.log('Stats             → connect(state => ({ total, done, filter }))')
con.log('')
con.log('При каждом dispatch проверяются только подписанные компоненты:')
con.log('TodoList, VisibilityFilters, Stats. AddTodo и Todo не подписаны — их не трогает subscribe.')
