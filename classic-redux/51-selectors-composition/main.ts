import { legacy_createStore as createStore, combineReducers } from 'redux'
import { ConsolePanel } from '../shared/console-panel'

interface Todo {
  id: number
  text: string
  completed: boolean
}

type FilterValue = 'all' | 'active' | 'completed'

interface TodosState {
  todos: Todo[]
  filter: FilterValue
}

interface RootState {
  todos: Todo[]
  filter: FilterValue
}

type AppAction =
  | { type: 'todos/todoToggled'; payload: number }
  | { type: 'filter/filterChanged'; payload: FilterValue }

const initialTodos: Todo[] = [
  { id: 1, text: 'Изучить Redux store', completed: true },
  { id: 2, text: 'Написать reducer', completed: true },
  { id: 3, text: 'Создать selectors', completed: false },
  { id: 4, text: 'Добавить фильтрацию', completed: false },
  { id: 5, text: 'Оптимизировать рендер', completed: false }
]

function todosReducer(state: Todo[] = initialTodos, action: AppAction): Todo[] {
  switch (action.type) {
    case 'todos/todoToggled':
      return state.map(todo =>
        todo.id === action.payload
          ? { ...todo, completed: !todo.completed }
          : todo
      )
    default:
      return state
  }
}

function filterReducer(state: FilterValue = 'all', action: AppAction): FilterValue {
  switch (action.type) {
    case 'filter/filterChanged':
      return action.payload
    default:
      return state
  }
}

const rootReducer = combineReducers({
  todos: todosReducer,
  filter: filterReducer
})

const store = createStore(rootReducer)

// --- Базовые (input) селекторы ---
const selectTodos = (state: RootState): Todo[] => state.todos
const selectFilter = (state: RootState): FilterValue => state.filter

// --- Составной (composed) селектор ---
const selectFilteredTodos = (state: RootState): Todo[] => {
  const todos = selectTodos(state)
  const filter = selectFilter(state)

  switch (filter) {
    case 'active':
      return todos.filter(t => !t.completed)
    case 'completed':
      return todos.filter(t => t.completed)
    default:
      return todos
  }
}

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)
consolePanel.info('Композиция селекторов: selectTodos + selectFilter → selectFilteredTodos')

function render(): void {
  const state = store.getState() as RootState
  const filterValue = selectFilter(state)
  const filteredTodos = selectFilteredTodos(state)

  consolePanel.log(`selectTodos(state) → ${selectTodos(state).length} задач`)
  consolePanel.log(`selectFilter(state) → "${filterValue}"`)
  consolePanel.success(`selectFilteredTodos(state) → ${filteredTodos.length} задач`)

  document.getElementById('current-filter')!.textContent = filterValue
  document.getElementById('count')!.textContent = String(filteredTodos.length)

  const listEl = document.getElementById('todo-list')!
  listEl.innerHTML = filteredTodos.map((todo: Todo) => `
    <li style="padding: 6px 8px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; cursor: pointer;"
        data-id="${todo.id}">
      <input type="checkbox" ${todo.completed ? 'checked' : ''}
             style="cursor: pointer; width: 14px; height: 14px;">
      <span style="color: var(--accent); font-family: var(--font-mono); font-size: 0.75rem;">#${todo.id}</span>
      <span style="flex: 1; font-size: 0.85rem; ${todo.completed ? 'text-decoration: line-through; color: var(--text-muted);' : 'color: var(--text-primary);'}">
        ${todo.text}
      </span>
    </li>
  `).join('')

  listEl.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', (): void => {
      const id = Number(li.getAttribute('data-id'))
      store.dispatch({ type: 'todos/todoToggled', payload: id })
    })
  })

  // Update filter button styles
  const buttons: Record<FilterValue, string> = {
    all: 'btn-all',
    active: 'btn-active',
    completed: 'btn-completed'
  }
  for (const [filter, btnId] of Object.entries(buttons)) {
    const btn = document.getElementById(btnId)!
    btn.className = filter === filterValue ? 'btn btn--accent' : 'btn'
  }
}

store.subscribe(render)
render()

document.getElementById('btn-all')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'filter/filterChanged', payload: 'all' })
})

document.getElementById('btn-active')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'filter/filterChanged', payload: 'active' })
})

document.getElementById('btn-completed')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'filter/filterChanged', payload: 'completed' })
})
