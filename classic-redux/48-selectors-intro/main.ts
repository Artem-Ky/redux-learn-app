import { legacy_createStore as createStore, combineReducers } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface Todo {
  id: number
  text: string
  completed: boolean
}

interface AppState {
  todos: Todo[]
}

interface TodoAddedAction {
  type: 'todos/todoAdded'
  payload: string
}

interface TodoToggledAction {
  type: 'todos/todoToggled'
  payload: number
}

type TodoAction =
  | TodoAddedAction
  | TodoToggledAction
  | { type: string }

let nextId = 4

const initialTodos: Todo[] = [
  { id: 1, text: 'Изучить Redux actions', completed: true },
  { id: 2, text: 'Написать reducer', completed: false },
  { id: 3, text: 'Понять selectors', completed: false }
]

function todosReducer(state: Todo[] = initialTodos, action: TodoAction): Todo[] {
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

const rootReducer = combineReducers({
  todos: todosReducer
})

const store = createStore(rootReducer)

const selectTodos = (state: AppState): Todo[] => state.todos
const selectTodoCount = (state: AppState): number => state.todos.length

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)
consolePanel.info('Селекторы: selectTodos(state) и selectTodoCount(state)')
consolePanel.log('selectTodos →', selectTodos(store.getState() as AppState))
consolePanel.log('selectTodoCount →', selectTodoCount(store.getState() as AppState))

function render(): void {
  const state = store.getState() as AppState
  const todos = selectTodos(state)
  const count = selectTodoCount(state)

  const listEl = document.getElementById('todo-list')!
  const emptyMsg = document.getElementById('empty-msg')!
  const todoCountEl = document.getElementById('todo-count')!
  const selectorTodosEl = document.getElementById('selector-todos')!
  const selectorCountEl = document.getElementById('selector-count')!

  todoCountEl.textContent = String(count)
  selectorTodosEl.textContent = JSON.stringify(todos, null, 2)
  selectorCountEl.textContent = `selectTodoCount(state) = ${count}`

  if (todos.length === 0) {
    listEl.innerHTML = ''
    emptyMsg.style.display = 'block'
    return
  }

  emptyMsg.style.display = 'none'
  listEl.innerHTML = todos.map((todo: Todo) => `
    <li style="padding: 6px 8px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; cursor: pointer;"
        data-id="${todo.id}">
      <input type="checkbox" ${todo.completed ? 'checked' : ''}
             style="cursor: pointer; width: 14px; height: 14px;">
      <span style="color: var(--accent); font-family: var(--font-mono); font-size: 0.75rem;">#${todo.id}</span>
      <span style="font-size: 0.85rem; ${todo.completed ? 'text-decoration: line-through; color: var(--text-muted);' : 'color: var(--text-primary);'}">
        ${todo.text}
      </span>
    </li>
  `).join('')

  listEl.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', (): void => {
      const id = Number(li.getAttribute('data-id'))
      store.dispatch({ type: 'todos/todoToggled', payload: id })
      consolePanel.log(`selectTodos →`, selectTodos(store.getState() as AppState))
      consolePanel.log(`selectTodoCount →`, selectTodoCount(store.getState() as AppState))
    })
  })
}

store.subscribe(render)
render()

document.getElementById('btn-add')!.addEventListener('click', (): void => {
  const input = document.getElementById('todo-input') as HTMLInputElement
  const text = input.value.trim()
  if (!text) return
  store.dispatch({ type: 'todos/todoAdded', payload: text })
  consolePanel.success(`Добавлено: "${text}"`)
  consolePanel.log('selectTodoCount →', selectTodoCount(store.getState() as AppState))
  input.value = ''
  input.focus()
})

document.getElementById('todo-input')!.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') {
    document.getElementById('btn-add')!.click()
  }
})
