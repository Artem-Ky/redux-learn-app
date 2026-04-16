import { legacy_createStore as createStore, applyMiddleware, compose, Middleware, Dispatch, AnyAction } from 'redux'
import { thunk, ThunkDispatch } from 'redux-thunk'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface Todo {
  id: number
  text: string
  completed: boolean
}

interface TodoState {
  todos: Todo[]
  nextId: number
  loading: boolean
}

interface AddTodoAction { type: 'todos/add'; payload: string }
interface ToggleTodoAction { type: 'todos/toggle'; payload: number }
interface LoadedTodosAction { type: 'todos/loaded'; payload: string[] }
interface SetLoadingAction { type: 'todos/setLoading'; payload: boolean }
interface ClearTodosAction { type: 'todos/clear' }

type TodoAction =
  | AddTodoAction
  | ToggleTodoAction
  | LoadedTodosAction
  | SetLoadingAction
  | ClearTodosAction
  | { type: string }

const initialState: TodoState = {
  todos: [],
  nextId: 1,
  loading: false
}

function todosReducer(state: TodoState = initialState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'todos/add': {
      const text = (action as AddTodoAction).payload
      return {
        ...state,
        todos: [...state.todos, { id: state.nextId, text, completed: false }],
        nextId: state.nextId + 1
      }
    }
    case 'todos/toggle': {
      const id = (action as ToggleTodoAction).payload
      return {
        ...state,
        todos: state.todos.map(t =>
          t.id === id ? { ...t, completed: !t.completed } : t
        )
      }
    }
    case 'todos/loaded': {
      const texts = (action as LoadedTodosAction).payload
      let nextId = state.nextId
      const newTodos = texts.map(text => ({ id: nextId++, text, completed: false }))
      return {
        ...state,
        todos: [...state.todos, ...newTodos],
        nextId,
        loading: false
      }
    }
    case 'todos/setLoading':
      return { ...state, loading: (action as SetLoadingAction).payload }
    case 'todos/clear':
      return { ...state, todos: [], loading: false }
    default:
      return state
  }
}

const loggerMiddleware: Middleware = (storeAPI) => (next) => (action: unknown): unknown => {
  const act = action as AnyAction
  consolePanel.log(`── Logger Middleware ──`)
  consolePanel.log(`  action: ${act.type}`)
  if (act.payload !== undefined) {
    consolePanel.log(`  payload: ${JSON.stringify(act.payload)}`)
  }
  consolePanel.log(`  prev state: ${JSON.stringify(storeAPI.getState())}`)
  const result = next(action)
  consolePanel.log(`  next state: ${JSON.stringify(storeAPI.getState())}`)
  consolePanel.log(`──────────────────────`)
  return result
}

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: () => ReturnType<typeof compose>
  }
}

const devtoolsEnhancer = window.__REDUX_DEVTOOLS_EXTENSION__?.() || ((f: unknown) => f)

const store = createStore(
  todosReducer,
  compose(
    applyMiddleware(thunk, loggerMiddleware),
    devtoolsEnhancer as ReturnType<typeof compose>
  )
)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const inputTodo = document.getElementById('input-todo') as HTMLInputElement
const btnAdd = document.getElementById('btn-add')!
const btnLoad = document.getElementById('btn-load')!
const btnClear = document.getElementById('btn-clear')!
const todoList = document.getElementById('todo-list')!
const stateDisplay = document.getElementById('state-display')!

function render(): void {
  const state = store.getState() as TodoState

  if (state.loading) {
    todoList.innerHTML = '<div style="color: var(--accent-yellow); padding: 16px; text-align: center;">⏳ Загрузка...</div>'
  } else if (state.todos.length > 0) {
    todoList.innerHTML = state.todos.map(todo => `
      <div style="display: flex; gap: 12px; padding: 8px; border-bottom: 1px solid var(--border); align-items: center;">
        <button class="btn btn--sm" data-toggle="${todo.id}" style="width: 28px; padding: 4px; color: ${todo.completed ? 'var(--accent-green)' : 'var(--text-muted)'};">
          ${todo.completed ? '✔' : '○'}
        </button>
        <span style="flex: 1; color: var(--text-bright); ${todo.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">
          ${todo.text}
        </span>
        <span style="color: var(--text-muted); font-family: var(--font-mono); font-size: 0.72rem;">#${todo.id}</span>
      </div>
    `).join('')
  } else {
    todoList.innerHTML = '<div style="color: var(--text-muted); padding: 16px; text-align: center;">Список пуст — добавьте todos или загрузите</div>'
  }

  todoList.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', (): void => {
      const id = parseInt((btn as HTMLElement).dataset.toggle!, 10)
      store.dispatch({ type: 'todos/toggle', payload: id })
    })
  })

  stateDisplay.textContent = JSON.stringify(state, null, 2)
}

store.subscribe(render)
render()

consolePanel.info('🔗 DevTools + Middleware')
consolePanel.log('')
consolePanel.log('compose(applyMiddleware(thunk, logger), devtoolsEnhancer)')
consolePanel.log('')
consolePanel.log('Logger middleware логирует каждый dispatch:')
consolePanel.log('  • Тип экшена и payload')
consolePanel.log('  • Предыдущее и следующее состояние')
consolePanel.log('')
consolePanel.warn('Нажмите «Load todos» для загрузки через thunk')

btnAdd.addEventListener('click', (): void => {
  const text = inputTodo.value.trim()
  if (!text) return
  store.dispatch({ type: 'todos/add', payload: text })
  inputTodo.value = ''
})

inputTodo.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') btnAdd.click()
})

btnLoad.addEventListener('click', (): void => {
  const typedDispatch = store.dispatch as ThunkDispatch<TodoState, unknown, TodoAction>

  typedDispatch((dispatch: Dispatch<TodoAction>): void => {
    dispatch({ type: 'todos/setLoading', payload: true })
    consolePanel.info('📥 Thunk: начинаем загрузку...')

    setTimeout((): void => {
      const serverTodos = [
        'Изучить compose',
        'Понять middleware',
        'Подключить DevTools с enhancer',
        'Написать logger middleware'
      ]
      dispatch({ type: 'todos/loaded', payload: serverTodos })
      consolePanel.success('✅ Thunk: загрузка завершена!')
    }, 1500)
  })
})

btnClear.addEventListener('click', (): void => {
  store.dispatch({ type: 'todos/clear' })
})
