import { legacy_createStore as createStore, combineReducers } from 'redux'
import { ConsolePanel } from '../shared/console-panel'

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
  { id: 1, text: 'Настроить проект', completed: true },
  { id: 2, text: 'Создать store', completed: true },
  { id: 3, text: 'Написать reducer', completed: false },
  { id: 4, text: 'Добавить selectors', completed: false },
  { id: 5, text: 'Написать тесты', completed: false }
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

const selectTodoById = (state: AppState, id: number): Todo | undefined =>
  state.todos.find(todo => todo.id === id)

const selectTodosByStatus = (state: AppState, completed: boolean): Todo[] =>
  state.todos.filter(todo => todo.completed === completed)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)
consolePanel.info('Параметризированные селекторы: selectTodoById и selectTodosByStatus')

let filterCompleted = true

function renderTodoList(): void {
  const state = store.getState() as AppState
  const listEl = document.getElementById('todo-list')!

  listEl.innerHTML = state.todos.map((todo: Todo) => `
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
      updateStatusResult()
    })
  })
}

function updateFindResult(): void {
  const state = store.getState() as AppState
  const idInput = document.getElementById('id-input') as HTMLInputElement
  const id = Number(idInput.value)
  const result = selectTodoById(state, id)
  const resultEl = document.getElementById('find-result')!

  if (result) {
    resultEl.textContent = JSON.stringify(result, null, 2)
    resultEl.style.color = 'var(--accent-cyan)'
    consolePanel.log(`selectTodoById(state, ${id}) →`, result)
  } else {
    resultEl.textContent = `Todo с id=${id} не найден (undefined)`
    resultEl.style.color = 'var(--accent-red)'
    consolePanel.warn(`selectTodoById(state, ${id}) → undefined`)
  }
}

function updateStatusResult(): void {
  const state = store.getState() as AppState
  const result = selectTodosByStatus(state, filterCompleted)
  const resultEl = document.getElementById('status-result')!
  const countEl = document.getElementById('status-count')!

  resultEl.textContent = JSON.stringify(result, null, 2)
  countEl.textContent = String(result.length)
  consolePanel.log(`selectTodosByStatus(state, ${filterCompleted}) → ${result.length} шт.`)
}

function render(): void {
  renderTodoList()
  updateStatusResult()
}

store.subscribe(render)
render()

document.getElementById('btn-find')!.addEventListener('click', (): void => {
  updateFindResult()
})

document.getElementById('id-input')!.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') {
    updateFindResult()
  }
})

document.getElementById('btn-toggle-status')!.addEventListener('click', (): void => {
  filterCompleted = !filterCompleted
  const btnEl = document.getElementById('btn-toggle-status')!
  btnEl.textContent = String(filterCompleted)
  btnEl.style.color = filterCompleted ? 'var(--accent-green)' : 'var(--accent-orange)'
  updateStatusResult()
})

updateFindResult()
