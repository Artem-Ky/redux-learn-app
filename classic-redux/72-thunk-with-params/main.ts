import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { thunk } from 'redux-thunk'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface Todo {
  id: number
  text: string
  completed: boolean
}

interface AppState {
  status: 'idle' | 'saving'
  todos: Todo[]
  nextId: number
}

interface SavingAction {
  type: 'todos/saving'
}

interface TodoAddedAction {
  type: 'todos/todoAdded'
  payload: Todo
}

type AppAction = SavingAction | TodoAddedAction | { type: string }

const initialState: AppState = {
  status: 'idle',
  todos: [],
  nextId: 1
}

function todosReducer(state: AppState = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'todos/saving':
      return { ...state, status: 'saving' }
    case 'todos/todoAdded':
      return {
        ...state,
        status: 'idle',
        todos: [...state.todos, (action as TodoAddedAction).payload],
        nextId: state.nextId + 1
      }
    default:
      return state
  }
}

const store = createStore(todosReducer, applyMiddleware(thunk))

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const statusDisplay = document.getElementById('status-display')!
const todosDisplay = document.getElementById('todos-display')!
const stateDisplay = document.getElementById('state-display')!
const todoInput = document.getElementById('todo-input') as HTMLInputElement
const btnSave = document.getElementById('btn-save')!

function saveNewTodo(text: string) {
  consolePanel.log(`saveNewTodo("${text}") — внешняя функция получила text`, 'color: #dcdcaa')

  return async (dispatch: any, getState: any): Promise<void> => {
    consolePanel.log(`thunk: замыкание на text = "${text}"`, 'color: #c586c0')

    const currentState = getState() as AppState
    consolePanel.log('thunk: getState().nextId = ' + currentState.nextId, 'color: #9cdcfe')

    dispatch({ type: 'todos/saving' })
    consolePanel.log('thunk: dispatch({ type: "todos/saving" })', 'color: #c586c0')

    consolePanel.log('thunk: ⏳ имитация сохранения (1 сек)...', 'color: #dcdcaa')
    await new Promise<void>((resolve) => setTimeout(resolve, 1000))

    const newTodo: Todo = {
      id: currentState.nextId,
      text,
      completed: false
    }

    dispatch({ type: 'todos/todoAdded', payload: newTodo })
    consolePanel.log(`thunk: dispatch todoAdded — "${text}" (id: ${newTodo.id})`, 'color: #4caf50')
    consolePanel.log('')
  }
}

function render(): void {
  const state = store.getState() as AppState

  statusDisplay.textContent = state.status
  statusDisplay.style.color =
    state.status === 'saving' ? 'var(--accent-orange)' : 'var(--text-secondary)'

  if (state.todos.length === 0) {
    todosDisplay.innerHTML = `
      <span style="color: var(--text-muted); font-size: 0.85rem;">
        ${state.status === 'saving' ? '⏳ Сохранение...' : 'Список пуст — добавьте todo'}
      </span>`
  } else {
    todosDisplay.innerHTML = state.todos.map((todo: Todo) => `
      <div style="display: flex; gap: 12px; padding: 6px 8px; border-bottom: 1px solid var(--border); font-size: 0.85rem;">
        <span style="color: var(--accent-green);">○</span>
        <span style="color: var(--text-bright); flex: 1;">${todo.text}</span>
        <span style="color: var(--text-muted); font-family: var(--font-mono); font-size: 0.75rem;">#${todo.id}</span>
      </div>
    `).join('')
    if (state.status === 'saving') {
      todosDisplay.innerHTML += `
        <div style="padding: 6px 8px; color: var(--accent-orange); font-size: 0.85rem;">
          ⏳ Сохранение нового todo...
        </div>`
    }
  }

  stateDisplay.textContent = JSON.stringify(state, null, 2)

  btnSave.textContent = state.status === 'saving' ? '⏳ Сохранение...' : '💾 saveNewTodo(text)'
  ;(btnSave as HTMLButtonElement).disabled = state.status === 'saving'
}

store.subscribe(render)
render()

consolePanel.info('Паттерн: Thunk Action Creator с параметрами')
consolePanel.info('saveNewTodo(text) — внешняя функция принимает text, внутренняя замыкается')

btnSave.addEventListener('click', (): void => {
  const text = todoInput.value.trim()
  if (!text) {
    consolePanel.warn('Введите текст todo!')
    return
  }

  consolePanel.log(`──── dispatch(saveNewTodo("${text}")) ────`)
  store.dispatch(saveNewTodo(text) as any)
  todoInput.value = ''
})

todoInput.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') {
    btnSave.click()
  }
})
