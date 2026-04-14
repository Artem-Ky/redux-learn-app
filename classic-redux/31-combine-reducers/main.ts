import { legacy_createStore as createStore, combineReducers } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Todo {
  id: number
  text: string
  completed: boolean
}

interface FiltersState {
  status: string
}

interface AppState {
  todos: Todo[]
  filters: FiltersState
}

interface TodoAddedAction {
  type: 'todos/todoAdded'
  payload: string
}

interface TodoToggledAction {
  type: 'todos/todoToggled'
  payload: number
}

interface FilterChangedAction {
  type: 'filters/statusChanged'
  payload: string
}

type AppAction =
  | TodoAddedAction
  | TodoToggledAction
  | FilterChangedAction
  | { type: string }

let nextId = 3

const initialTodos: Todo[] = [
  { id: 1, text: 'Изучить combineReducers', completed: false },
  { id: 2, text: 'Понять слайсы state', completed: false }
]

const initialFilters: FiltersState = {
  status: 'all'
}

function todosReducer(state: Todo[] = initialTodos, action: AppAction): Todo[] {
  switch (action.type) {
    case 'todos/todoAdded': {
      const newTodo: Todo = {
        id: nextId++,
        text: (action as TodoAddedAction).payload,
        completed: false
      }
      return [...state, newTodo]
    }
    case 'todos/todoToggled': {
      const toggleId = (action as TodoToggledAction).payload
      return state.map(todo =>
        todo.id === toggleId
          ? { ...todo, completed: !todo.completed }
          : todo
      )
    }
    default:
      return state
  }
}

function filtersReducer(state: FiltersState = initialFilters, action: AppAction): FiltersState {
  switch (action.type) {
    case 'filters/statusChanged':
      return { ...state, status: (action as FilterChangedAction).payload }
    default:
      return state
  }
}

const rootReducer = combineReducers({
  todos: todosReducer,
  filters: filtersReducer
})

const store = createStore(rootReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

function render(): void {
  const state = store.getState() as AppState
  const listEl = document.getElementById('todo-list')!
  const emptyMsg = document.getElementById('todo-empty')!
  const stateDisplay = document.getElementById('state-display')!
  const filtersDisplay = document.getElementById('filters-display')!

  stateDisplay.textContent = JSON.stringify(state, null, 2)
  filtersDisplay.textContent = JSON.stringify(state.filters, null, 2)

  const filtered = state.filters.status === 'active'
    ? state.todos.filter(t => !t.completed)
    : state.filters.status === 'completed'
      ? state.todos.filter(t => t.completed)
      : state.todos

  if (filtered.length === 0) {
    listEl.innerHTML = ''
    emptyMsg.style.display = 'block'
    emptyMsg.textContent = state.todos.length === 0
      ? 'Нет задач'
      : `Нет задач со статусом «${state.filters.status}»`
  } else {
    emptyMsg.style.display = 'none'
    listEl.innerHTML = filtered.map((todo: Todo) => `
      <li style="padding: 6px 8px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; cursor: pointer;"
          data-id="${todo.id}">
        <input type="checkbox" ${todo.completed ? 'checked' : ''}
               style="cursor: pointer; width: 14px; height: 14px;">
        <span style="font-size: 0.85rem; ${todo.completed ? 'text-decoration: line-through; color: var(--text-muted);' : 'color: var(--text-primary);'}">
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
  }

  document.querySelectorAll('.filter-btn').forEach(btn => {
    const status = (btn as HTMLElement).getAttribute('data-status')!
    if (status === state.filters.status) {
      ;(btn as HTMLElement).style.borderColor = 'var(--accent)'
      ;(btn as HTMLElement).style.color = 'var(--accent)'
    } else {
      ;(btn as HTMLElement).style.borderColor = 'var(--border)'
      ;(btn as HTMLElement).style.color = 'var(--text-primary)'
    }
  })
}

store.subscribe(render)
render()

document.getElementById('btn-add-todo')!.addEventListener('click', (): void => {
  const input = document.getElementById('todo-input') as HTMLInputElement
  const text = input.value.trim()
  if (!text) return
  store.dispatch({ type: 'todos/todoAdded', payload: text })
  input.value = ''
  input.focus()
})

document.getElementById('todo-input')!.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') {
    document.getElementById('btn-add-todo')!.click()
  }
})

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', (): void => {
    const status = (btn as HTMLElement).getAttribute('data-status')!
    store.dispatch({ type: 'filters/statusChanged', payload: status })
  })
})
