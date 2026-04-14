import { legacy_createStore as createStore, combineReducers } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Todo {
  id: number
  text: string
  completed: boolean
}

interface AppState {
  todos: Todo[]
}

interface TodoToggledAction {
  type: 'todos/todoToggled'
  payload: number
}

type TodoAction =
  | TodoToggledAction
  | { type: string }

const initialTodos: Todo[] = [
  { id: 1, text: 'Настроить Redux store', completed: true },
  { id: 2, text: 'Написать action creators', completed: true },
  { id: 3, text: 'Создать reducer', completed: false },
  { id: 4, text: 'Добавить selectors', completed: false },
  { id: 5, text: 'Подключить DevTools', completed: true }
]

function todosReducer(state: Todo[] = initialTodos, action: TodoAction): Todo[] {
  switch (action.type) {
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

const rootReducer = combineReducers({
  todos: todosReducer
})

const store = createStore(rootReducer)

const selectTodos = (state: AppState): Todo[] => state.todos
const selectCompletedTodos = (state: AppState): Todo[] =>
  state.todos.filter(todo => todo.completed)
const selectActiveTodos = (state: AppState): Todo[] =>
  state.todos.filter(todo => !todo.completed)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

function renderPanel(containerId: string, todos: Todo[]): void {
  const el = document.getElementById(containerId)!
  if (todos.length === 0) {
    el.innerHTML = '<li style="color: var(--text-muted); padding: 4px 8px; font-style: italic;">Пусто</li>'
    return
  }
  el.innerHTML = todos.map((todo: Todo) => `
    <li style="padding: 4px 8px; color: ${todo.completed ? 'var(--text-muted)' : 'var(--text-primary)'}; ${todo.completed ? 'text-decoration: line-through;' : ''}">
      ${todo.completed ? '✓' : '○'} ${todo.text}
    </li>
  `).join('')
}

function render(): void {
  const state = store.getState() as AppState
  const all = selectTodos(state)
  const completed = selectCompletedTodos(state)
  const active = selectActiveTodos(state)

  document.getElementById('all-count')!.textContent = String(all.length)
  document.getElementById('completed-count')!.textContent = String(completed.length)
  document.getElementById('active-count')!.textContent = String(active.length)

  renderPanel('panel-all', all)
  renderPanel('panel-completed', completed)
  renderPanel('panel-active', active)

  const listEl = document.getElementById('todo-list')!
  listEl.innerHTML = all.map((todo: Todo) => `
    <li style="padding: 8px 12px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; cursor: pointer;"
        data-id="${todo.id}">
      <input type="checkbox" ${todo.completed ? 'checked' : ''}
             style="cursor: pointer; width: 16px; height: 16px;">
      <span style="color: var(--accent); font-family: var(--font-mono); font-size: 0.75rem;">#${todo.id}</span>
      <span style="flex: 1; ${todo.completed ? 'text-decoration: line-through; color: var(--text-muted);' : 'color: var(--text-primary);'}">
        ${todo.text}
      </span>
      <span style="font-size: 0.7rem; color: var(--text-muted);">
        ${todo.completed ? 'completed' : 'active'}
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

store.subscribe(render)
render()
