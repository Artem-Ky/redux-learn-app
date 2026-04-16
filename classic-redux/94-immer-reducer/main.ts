import { produce } from 'immer'
import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

// ─── Interfaces ───

interface Todo {
  id: number
  text: string
  completed: boolean
}

interface TodoState {
  todos: Todo[]
  nextId: number
}

interface AddAction { type: 'todos/add'; payload: string }
interface ToggleAction { type: 'todos/toggle'; payload: number }
interface DeleteAction { type: 'todos/delete'; payload: number }
interface ResetAction { type: 'todos/reset' }

type TodoAction = AddAction | ToggleAction | DeleteAction | ResetAction | { type: string }

const initialState: TodoState = {
  todos: [],
  nextId: 1
}

// ─── Classic spread reducer ───

function classicReducer(state: TodoState = initialState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'todos/add': {
      const text = (action as AddAction).payload
      return {
        ...state,
        todos: [...state.todos, { id: state.nextId, text, completed: false }],
        nextId: state.nextId + 1
      }
    }
    case 'todos/toggle': {
      const id = (action as ToggleAction).payload
      return {
        ...state,
        todos: state.todos.map(t =>
          t.id === id ? { ...t, completed: !t.completed } : t
        )
      }
    }
    case 'todos/delete': {
      const id = (action as DeleteAction).payload
      return {
        ...state,
        todos: state.todos.filter(t => t.id !== id)
      }
    }
    case 'todos/reset':
      return { ...initialState }
    default:
      return state
  }
}

// ─── Immer produce reducer ───

const immerReducer = produce((draft: TodoState, action: TodoAction) => {
  switch (action.type) {
    case 'todos/add': {
      const text = (action as AddAction).payload
      draft.todos.push({ id: draft.nextId, text, completed: false })
      draft.nextId++
      break
    }
    case 'todos/toggle': {
      const id = (action as ToggleAction).payload
      const todo = draft.todos.find(t => t.id === id)
      if (todo) todo.completed = !todo.completed
      break
    }
    case 'todos/delete': {
      const id = (action as DeleteAction).payload
      const idx = draft.todos.findIndex(t => t.id === id)
      if (idx !== -1) draft.todos.splice(idx, 1)
      break
    }
    case 'todos/reset':
      return { ...initialState }
  }
})

// ─── State ───

let useImmer = false

function activeReducer(state: TodoState = initialState, action: TodoAction): TodoState {
  return useImmer ? immerReducer(state, action) : classicReducer(state, action)
}

const store = createStore(activeReducer)

// ─── UI ───

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const inputTodo = document.getElementById('input-todo') as HTMLInputElement
const btnAdd = document.getElementById('btn-add')!
const btnToggleFirst = document.getElementById('btn-toggle-first')!
const btnDeleteFirst = document.getElementById('btn-delete-first')!
const btnReset = document.getElementById('btn-reset')!
const btnToggleReducer = document.getElementById('btn-toggle-reducer')!
const stateDisplay = document.getElementById('state-display')!

function render(): void {
  const state = store.getState() as TodoState
  stateDisplay.textContent = JSON.stringify(state, null, 2)
}

store.subscribe(render)
render()

consolePanel.info('Immer внутри Redux-редьюсеров')
consolePanel.log('')
consolePanel.log('Два редьюсера — классический и Immer — дают одинаковый результат.')
consolePanel.log('Переключайте кнопкой и следите за DevTools.')
consolePanel.log('')

// ─── Toggle reducer ───

btnToggleReducer.addEventListener('click', (): void => {
  useImmer = !useImmer
  btnToggleReducer.textContent = useImmer ? 'Immer (produce)' : 'Классический (spread)'
  btnToggleReducer.style.borderColor = useImmer ? 'var(--accent-green)' : 'var(--accent-cyan)'
  btnToggleReducer.style.color = useImmer ? 'var(--accent-green)' : 'var(--accent-cyan)'

  consolePanel.warn(`─── Переключено на: ${useImmer ? 'Immer produce' : 'Классический spread'} ───`)
  consolePanel.log('')
})

// ─── Actions ───

btnAdd.addEventListener('click', (): void => {
  const text = inputTodo.value.trim()
  if (!text) return
  const reducer = useImmer ? 'Immer' : 'Spread'
  store.dispatch({ type: 'todos/add', payload: text })
  consolePanel.success(`[${reducer}] Добавлено: "${text}"`)
  inputTodo.value = ''
})

inputTodo.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') btnAdd.click()
})

btnToggleFirst.addEventListener('click', (): void => {
  const state = store.getState() as TodoState
  if (state.todos.length === 0) {
    consolePanel.warn('Нет задач для переключения')
    return
  }
  const firstId = state.todos[0].id
  const reducer = useImmer ? 'Immer' : 'Spread'
  store.dispatch({ type: 'todos/toggle', payload: firstId })
  consolePanel.info(`[${reducer}] Переключено: todo #${firstId}`)
})

btnDeleteFirst.addEventListener('click', (): void => {
  const state = store.getState() as TodoState
  if (state.todos.length === 0) {
    consolePanel.warn('Нет задач для удаления')
    return
  }
  const firstId = state.todos[0].id
  const reducer = useImmer ? 'Immer' : 'Spread'
  store.dispatch({ type: 'todos/delete', payload: firstId })
  consolePanel.error(`[${reducer}] Удалено: todo #${firstId}`)
})

btnReset.addEventListener('click', (): void => {
  store.dispatch({ type: 'todos/reset' })
  consolePanel.info('Состояние сброшено')
  consolePanel.log('')
})
