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
  status: 'idle' | 'loading' | 'loaded'
  todos: Todo[]
}

interface LoadingAction {
  type: 'todos/loading'
}

interface LoadedAction {
  type: 'todos/loaded'
  payload: Todo[]
}

type AppAction = LoadingAction | LoadedAction | { type: string }

const initialState: AppState = {
  status: 'idle',
  todos: []
}

function todosReducer(state: AppState = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'todos/loading':
      return { ...state, status: 'loading' }
    case 'todos/loaded':
      return { ...state, status: 'loaded', todos: (action as LoadedAction).payload }
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
const btnFetch = document.getElementById('btn-fetch')!

const fakeTodos: Todo[] = [
  { id: 1, text: 'Изучить Redux', completed: true },
  { id: 2, text: 'Понять thunk middleware', completed: true },
  { id: 3, text: 'Написать thunk action creator', completed: false },
  { id: 4, text: 'Добавить async логику', completed: false }
]

function fetchTodos() {
  consolePanel.log('fetchTodos() вызван — возвращает thunk-функцию', 'color: #dcdcaa')

  return async (dispatch: any, getState: any): Promise<void> => {
    consolePanel.log('thunk: функция запущена middleware', 'color: #c586c0')
    consolePanel.log('thunk: getState().status = ' + (getState() as AppState).status, 'color: #9cdcfe')

    dispatch({ type: 'todos/loading' })
    consolePanel.log('thunk: dispatch({ type: "todos/loading" })', 'color: #c586c0')

    consolePanel.log('thunk: ⏳ имитация загрузки (1 сек)...', 'color: #dcdcaa')
    await new Promise<void>((resolve) => setTimeout(resolve, 1000))

    dispatch({ type: 'todos/loaded', payload: fakeTodos })
    consolePanel.log('thunk: dispatch({ type: "todos/loaded", payload: [...] })', 'color: #4caf50')

    const afterState = getState() as AppState
    consolePanel.log('thunk: getState().status = ' + afterState.status, 'color: #4caf50')
    consolePanel.log('thunk: загружено ' + afterState.todos.length + ' todo', 'color: #4caf50')
    consolePanel.log('')
  }
}

function render(): void {
  const state = store.getState() as AppState

  statusDisplay.textContent = state.status
  statusDisplay.style.color =
    state.status === 'loading' ? 'var(--accent-orange)' :
    state.status === 'loaded' ? 'var(--accent-green)' :
    'var(--text-secondary)'

  if (state.status === 'loading') {
    todosDisplay.innerHTML = `
      <div style="text-align: center; padding: 16px; color: var(--accent-orange);">
        <span style="font-size: 1.2rem;">⏳</span> Загрузка todos...
      </div>`
  } else if (state.status === 'loaded') {
    todosDisplay.innerHTML = state.todos.map((todo: Todo) => `
      <div style="display: flex; gap: 12px; padding: 6px 8px; border-bottom: 1px solid var(--border); font-size: 0.85rem;">
        <span style="color: ${todo.completed ? 'var(--accent-green)' : 'var(--accent-orange)'};">${todo.completed ? '✔' : '○'}</span>
        <span style="color: var(--text-bright); flex: 1; ${todo.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${todo.text}</span>
        <span style="color: var(--text-muted); font-family: var(--font-mono); font-size: 0.75rem;">#${todo.id}</span>
      </div>
    `).join('')
  }

  stateDisplay.textContent = JSON.stringify(state, null, 2)

  btnFetch.textContent = state.status === 'loading' ? '⏳ Загрузка...' : '📋 fetchTodos()'
  ;(btnFetch as HTMLButtonElement).disabled = state.status === 'loading'
}

store.subscribe(render)
render()

consolePanel.info('Паттерн: Thunk Action Creator')
consolePanel.info('fetchTodos() — возвращает thunk, dispatch(fetchTodos()) — запускает')

btnFetch.addEventListener('click', (): void => {
  consolePanel.log('──── dispatch(fetchTodos()) ────')
  consolePanel.log('Шаг 1: fetchTodos() вызывается, возвращает thunk-функцию')
  consolePanel.log('Шаг 2: dispatch() передаёт thunk в middleware')
  consolePanel.log('Шаг 3: middleware вызывает thunk(dispatch, getState)')
  store.dispatch(fetchTodos() as any)
})
