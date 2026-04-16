import { legacy_createStore as createStore, combineReducers } from 'redux'
import { createSelector } from 'reselect'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Todo {
  id: number
  text: string
  completed: boolean
  color: 'red' | 'blue' | 'green'
}

type StatusFilter = 'all' | 'active' | 'completed'
type ColorFilter = 'all' | 'red' | 'blue' | 'green'

interface Filters {
  status: StatusFilter
  color: ColorFilter
}

interface RootState {
  todos: Todo[]
  filters: Filters
}

type AppAction =
  | { type: 'todos/todoToggled'; payload: number }
  | { type: 'filters/statusChanged'; payload: StatusFilter }
  | { type: 'filters/colorChanged'; payload: ColorFilter }

const initialTodos: Todo[] = [
  { id: 1, text: 'Настроить проект', completed: true, color: 'red' },
  { id: 2, text: 'Создать store', completed: true, color: 'blue' },
  { id: 3, text: 'Написать reducer', completed: false, color: 'red' },
  { id: 4, text: 'Добавить selectors', completed: false, color: 'green' },
  { id: 5, text: 'Написать тесты', completed: false, color: 'blue' },
  { id: 6, text: 'Деплой приложения', completed: true, color: 'green' }
]

const initialFilters: Filters = { status: 'all', color: 'all' }

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

function filtersReducer(state: Filters = initialFilters, action: AppAction): Filters {
  switch (action.type) {
    case 'filters/statusChanged':
      return { ...state, status: action.payload }
    case 'filters/colorChanged':
      return { ...state, color: action.payload }
    default:
      return state
  }
}

const rootReducer = combineReducers({
  todos: todosReducer,
  filters: filtersReducer
})

const store = createStore(rootReducer)

const selectTodos = (state: RootState): Todo[] => state.todos
const selectFilters = (state: RootState): Filters => state.filters

let recomputeCount = 0

const selectFilteredTodos = createSelector(
  selectTodos,
  selectFilters,
  (todos, filters): Todo[] => {
    recomputeCount++
    let result = todos
    if (filters.status === 'active') {
      result = result.filter(t => !t.completed)
    } else if (filters.status === 'completed') {
      result = result.filter(t => t.completed)
    }
    if (filters.color !== 'all') {
      result = result.filter(t => t.color === filters.color)
    }
    return result
  }
)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const colorMap: Record<string, string> = {
  red: '#f44747',
  blue: '#569cd6',
  green: '#4caf50'
}

function render(): void {
  const state = store.getState() as RootState
  const filters = selectFilters(state)
  const filtered = selectFilteredTodos(state)

  document.getElementById('cur-status')!.textContent = filters.status
  document.getElementById('cur-color')!.textContent = filters.color
  document.getElementById('recompute-count')!.textContent = String(recomputeCount)
  document.getElementById('count')!.textContent = String(filtered.length)

  const listEl = document.getElementById('todo-list')!
  listEl.innerHTML = filtered.map((todo: Todo) => `
    <li style="padding: 6px 8px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; cursor: pointer;"
        data-id="${todo.id}">
      <input type="checkbox" ${todo.completed ? 'checked' : ''}
             style="cursor: pointer; width: 14px; height: 14px;">
      <span style="width: 10px; height: 10px; border-radius: 50%; background: ${colorMap[todo.color]}; flex-shrink: 0;"></span>
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

  updateStatusButtons(filters.status)
  updateColorButtons(filters.color)
}

function updateStatusButtons(active: StatusFilter): void {
  const map: Record<StatusFilter, string> = {
    all: 'btn-status-all',
    active: 'btn-status-active',
    completed: 'btn-status-completed'
  }
  for (const [filter, id] of Object.entries(map)) {
    document.getElementById(id)!.className = filter === active ? 'btn btn--accent' : 'btn'
  }
}

function updateColorButtons(active: ColorFilter): void {
  const map: Record<ColorFilter, string> = {
    all: 'btn-color-all',
    red: 'btn-color-red',
    blue: 'btn-color-blue',
    green: 'btn-color-green'
  }
  for (const [filter, id] of Object.entries(map)) {
    const btn = document.getElementById(id)!
    if (filter === active) {
      btn.className = 'btn btn--accent'
    } else {
      btn.className = 'btn'
      if (filter !== 'all') {
        btn.style.borderColor = colorMap[filter]
      }
    }
  }
}

store.subscribe(render)
render()

document.getElementById('btn-status-all')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'filters/statusChanged', payload: 'all' })
})
document.getElementById('btn-status-active')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'filters/statusChanged', payload: 'active' })
})
document.getElementById('btn-status-completed')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'filters/statusChanged', payload: 'completed' })
})

document.getElementById('btn-color-all')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'filters/colorChanged', payload: 'all' })
})
document.getElementById('btn-color-red')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'filters/colorChanged', payload: 'red' })
})
document.getElementById('btn-color-blue')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'filters/colorChanged', payload: 'blue' })
})
document.getElementById('btn-color-green')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'filters/colorChanged', payload: 'green' })
})
