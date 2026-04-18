import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore, combineReducers, type Dispatch } from 'redux'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

type VisibilityFilter = 'all' | 'completed' | 'incomplete'

interface TodoItem {
  id: number
  content: string
  completed: boolean
}

interface TodosState {
  byIds: Record<number, TodoItem>
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
    2: { id: 2, content: 'Пройти урок 49', completed: false },
    3: { id: 3, content: 'Сравнить с уроком 27', completed: false },
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

const getTodos = (state: RootState): TodoItem[] =>
  state.todos.allIds.map(id => state.todos.byIds[id])

const getTodosByVisibilityFilter = (
  state: RootState,
  filter: VisibilityFilter
): TodoItem[] => {
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
  'Лог — Todo через hooks'
)

// ================================================
// AddTodo — useDispatch + useState
// ================================================

function AddTodo() {
  const dispatch = useDispatch<Dispatch<Action>>()
  const [value, setValue] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    con.log('')
    con.info(`📤 AddTodo: dispatch(addTodo("${trimmed}"))`)
    dispatch(addTodo(trimmed))
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

// ================================================
// Todo — useDispatch, todo через ownProps
// ================================================

function Todo({ todo }: { todo: TodoItem }) {
  const dispatch = useDispatch<Dispatch<Action>>()
  const onClick = () => {
    con.log('')
    con.info(`📤 Todo #${todo.id}: dispatch(toggleTodo(${todo.id}))`)
    dispatch(toggleTodo(todo.id))
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

// ================================================
// TodoList — два useSelector
// ================================================

function TodoList() {
  const filter = useSelector((state: RootState) => state.visibilityFilter)
  const todos = useSelector((state: RootState) =>
    getTodosByVisibilityFilter(state, filter)
  )

  if (todos.length === 0) {
    return (
      <div className="todo-list">
        <div className="todo-list__empty">Пусто — нет todo по текущему фильтру</div>
      </div>
    )
  }

  return (
    <div className="todo-list">
      {todos.map(t => <Todo key={t.id} todo={t} />)}
    </div>
  )
}

// ================================================
// VisibilityFilters — useSelector + useDispatch
// ================================================

const FILTERS: { key: VisibilityFilter; label: string }[] = [
  { key: 'all',        label: 'Все' },
  { key: 'incomplete', label: 'Активные' },
  { key: 'completed',  label: 'Выполненные' },
]

function VisibilityFilters() {
  const active = useSelector((state: RootState) => state.visibilityFilter)
  const dispatch = useDispatch<Dispatch<Action>>()

  return (
    <div className="filters">
      {FILTERS.map(f => (
        <button
          key={f.key}
          className={'filters__btn' + (active === f.key ? ' filters__btn--active' : '')}
          onClick={() => {
            if (active === f.key) return
            con.log('')
            con.info(`📤 VisibilityFilters: dispatch(setFilter("${f.key}"))`)
            dispatch(setFilter(f.key))
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

// ================================================
// Stats — один useSelector, производные значения
// ================================================

function Stats() {
  const { total, done, filter } = useSelector((state: RootState) => {
    const all = getTodos(state)
    return {
      total: all.length,
      done: all.filter(t => t.completed).length,
      filter: state.visibilityFilter,
    }
  })

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

con.info('Урок 49 — Todo-приложение через hooks (useSelector + useDispatch)')
con.log('')
con.log('AddTodo           → useDispatch')
con.log('Todo              → useDispatch (todo приходит через props)')
con.log('TodoList          → 2× useSelector (filter + отфильтрованные todos)')
con.log('VisibilityFilters → useSelector + useDispatch')
con.log('Stats             → useSelector (производные значения)')
con.log('')
con.log('Сравните с уроком 27 — тот же функционал, но через connect.')
