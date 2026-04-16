import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { thunk } from 'redux-thunk'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface Todo {
  id: number
  text: string
  completed: boolean
}

type LoadingStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

interface AppState {
  status: LoadingStatus
  entities: Todo[]
  error: string | null
}

interface LoadingAction {
  type: 'todos/loading'
}

interface SucceededAction {
  type: 'todos/succeeded'
  payload: Todo[]
}

interface FailedAction {
  type: 'todos/failed'
  payload: string
}

interface ResetAction {
  type: 'todos/reset'
}

type AppAction = LoadingAction | SucceededAction | FailedAction | ResetAction | { type: string }

const initialState: AppState = {
  status: 'idle',
  entities: [],
  error: null
}

function todosReducer(state: AppState = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'todos/loading':
      return { ...state, status: 'loading', error: null }
    case 'todos/succeeded':
      return { ...state, status: 'succeeded', entities: (action as SucceededAction).payload, error: null }
    case 'todos/failed':
      return { ...state, status: 'failed', error: (action as FailedAction).payload }
    case 'todos/reset':
      return initialState
    default:
      return state
  }
}

const store = createStore(todosReducer, applyMiddleware(thunk))

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const statusDot = document.getElementById('status-dot')!
const statusLabel = document.getElementById('status-label')!
const todosDisplay = document.getElementById('todos-display')!
const stateDisplay = document.getElementById('state-display')!
const btnLoad = document.getElementById('btn-load')!
const btnReset = document.getElementById('btn-reset')!

const fakeTodos: Todo[] = [
  { id: 1, text: 'Настроить Redux store', completed: true },
  { id: 2, text: 'Подключить redux-thunk', completed: true },
  { id: 3, text: 'Написать thunk action creator', completed: false },
  { id: 4, text: 'Обработать loading state', completed: false },
  { id: 5, text: 'Добавить error handling', completed: false }
]

const STATUS_COLORS: Record<LoadingStatus, string> = {
  idle: 'var(--text-muted)',
  loading: 'var(--accent-orange)',
  succeeded: 'var(--accent-green)',
  failed: 'var(--accent-red)'
}

function fetchTodos() {
  return async (dispatch: any): Promise<void> => {
    dispatch({ type: 'todos/loading' })
    consolePanel.log('status: idle → loading', 'color: #ff9800')

    consolePanel.log('⏳ имитация API-запроса (1.5 сек)...', 'color: #dcdcaa')
    await new Promise<void>((resolve) => setTimeout(resolve, 1500))

    dispatch({ type: 'todos/succeeded', payload: fakeTodos })
    consolePanel.log('status: loading → succeeded', 'color: #4caf50')
    consolePanel.log('Загружено ' + fakeTodos.length + ' todos', 'color: #4caf50')
    consolePanel.log('')
  }
}

function render(): void {
  const state = store.getState() as AppState

  statusDot.style.background = STATUS_COLORS[state.status]
  statusLabel.textContent = state.status
  statusLabel.style.color = STATUS_COLORS[state.status]

  if (state.status === 'idle') {
    todosDisplay.innerHTML = `
      <span style="color: var(--text-muted); font-size: 0.85rem;">Нажмите "Load Todos" ↑</span>`
  } else if (state.status === 'loading') {
    todosDisplay.innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--accent-orange);">
        <div style="font-size: 1.5rem; margin-bottom: 8px;">⏳</div>
        Загрузка данных...
      </div>`
  } else if (state.status === 'succeeded') {
    todosDisplay.innerHTML = state.entities.map((todo: Todo) => `
      <div style="display: flex; gap: 12px; padding: 6px 8px; border-bottom: 1px solid var(--border); font-size: 0.85rem;">
        <span style="color: ${todo.completed ? 'var(--accent-green)' : 'var(--accent-orange)'};">${todo.completed ? '✔' : '○'}</span>
        <span style="color: var(--text-bright); flex: 1; ${todo.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${todo.text}</span>
        <span style="color: var(--text-muted); font-family: var(--font-mono); font-size: 0.75rem;">#${todo.id}</span>
      </div>
    `).join('')
  } else if (state.status === 'failed') {
    todosDisplay.innerHTML = `
      <div style="color: var(--accent-red); padding: 12px;">
        ✖ Ошибка: ${state.error}
      </div>`
  }

  stateDisplay.textContent = JSON.stringify(state, null, 2)

  btnLoad.textContent = state.status === 'loading' ? '⏳ Загрузка...' : '🔄 Load Todos'
  ;(btnLoad as HTMLButtonElement).disabled = state.status === 'loading'
}

store.subscribe(render)
render()

consolePanel.info('Loading state enum: idle → loading → succeeded | failed')
consolePanel.info('Текущий status: idle')

btnLoad.addEventListener('click', (): void => {
  consolePanel.log('──── dispatch(fetchTodos()) ────')
  store.dispatch(fetchTodos() as any)
})

btnReset.addEventListener('click', (): void => {
  store.dispatch({ type: 'todos/reset' })
  consolePanel.log('──── dispatch({ type: "todos/reset" }) ────')
  consolePanel.log('status → idle, entities → []', 'color: #9cdcfe')
  consolePanel.log('')
})
