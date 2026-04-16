import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { thunk } from 'redux-thunk'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface DataItem {
  id: number
  name: string
  email: string
}

interface AppState {
  status: 'idle' | 'loading' | 'loaded' | 'error'
  data: DataItem[]
  error: string | null
}

interface LoadingAction {
  type: 'data/loading'
}

interface LoadedAction {
  type: 'data/loaded'
  payload: DataItem[]
}

interface ErrorAction {
  type: 'data/error'
  payload: string
}

interface ResetAction {
  type: 'data/reset'
}

type AppAction = LoadingAction | LoadedAction | ErrorAction | ResetAction | { type: string }

const initialState: AppState = {
  status: 'idle',
  data: [],
  error: null
}

function dataReducer(state: AppState = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'data/loading':
      return { ...state, status: 'loading', error: null }
    case 'data/loaded':
      return { ...state, status: 'loaded', data: (action as LoadedAction).payload }
    case 'data/error':
      return { ...state, status: 'error', error: (action as ErrorAction).payload }
    case 'data/reset':
      return initialState
    default:
      return state
  }
}

const store = createStore(dataReducer, applyMiddleware(thunk))

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const statusDisplay = document.getElementById('status-display')!
const dataDisplay = document.getElementById('data-display')!
const stateDisplay = document.getElementById('state-display')!
const btnLoad = document.getElementById('btn-load')!

const fakeUsers: DataItem[] = [
  { id: 1, name: 'Алексей Иванов', email: 'alexey@example.com' },
  { id: 2, name: 'Мария Петрова', email: 'maria@example.com' },
  { id: 3, name: 'Дмитрий Сидоров', email: 'dmitry@example.com' }
]

const fetchData = () => async (dispatch: any, getState: any): Promise<void> => {
  const currentState = getState() as AppState
  consolePanel.log('thunk: getState().status = ' + currentState.status, 'color: #dcdcaa')

  dispatch({ type: 'data/loading' })
  consolePanel.log('thunk: dispatch({ type: "data/loading" })', 'color: #c586c0')

  consolePanel.log('thunk: ⏳ имитация API-запроса (1.5 сек)...', 'color: #dcdcaa')

  await new Promise<void>((resolve) => setTimeout(resolve, 1500))

  dispatch({ type: 'data/loaded', payload: fakeUsers })
  consolePanel.log('thunk: dispatch({ type: "data/loaded", payload: [...] })', 'color: #4caf50')

  const afterState = getState() as AppState
  consolePanel.log('thunk: getState().status = ' + afterState.status, 'color: #4caf50')
  consolePanel.log('thunk: загружено ' + afterState.data.length + ' записей', 'color: #4caf50')
  consolePanel.log('')
}

function render(): void {
  const state = store.getState() as AppState

  statusDisplay.textContent = state.status
  statusDisplay.style.color =
    state.status === 'loading' ? 'var(--accent-orange)' :
    state.status === 'loaded' ? 'var(--accent-green)' :
    state.status === 'error' ? 'var(--accent-red)' :
    'var(--text-secondary)'

  if (state.status === 'loading') {
    dataDisplay.innerHTML = `
      <div style="text-align: center; padding: 16px; color: var(--accent-orange);">
        <span style="font-size: 1.2rem;">⏳</span> Загрузка данных...
      </div>`
  } else if (state.status === 'loaded') {
    dataDisplay.innerHTML = state.data.map((item: DataItem) => `
      <div style="display: flex; gap: 12px; padding: 6px 8px; border-bottom: 1px solid var(--border); font-size: 0.85rem;">
        <span style="color: var(--accent); font-family: var(--font-mono);">#${item.id}</span>
        <span style="color: var(--text-bright); flex: 1;">${item.name}</span>
        <span style="color: var(--text-muted);">${item.email}</span>
      </div>
    `).join('')
  } else if (state.status === 'error') {
    dataDisplay.innerHTML = `
      <div style="color: var(--accent-red); padding: 8px;">Ошибка: ${state.error}</div>`
  }

  stateDisplay.textContent = JSON.stringify(state, null, 2)

  btnLoad.textContent = state.status === 'loading' ? '⏳ Загрузка...' : '🔄 Load Data'
  ;(btnLoad as HTMLButtonElement).disabled = state.status === 'loading'
}

store.subscribe(render)
render()

consolePanel.info('import { thunk } from "redux-thunk"')
consolePanel.info('applyMiddleware(thunk) — официальный thunk middleware')

btnLoad.addEventListener('click', (): void => {
  consolePanel.log('──── dispatch(fetchData()) — thunk action creator ────')
  store.dispatch(fetchData() as any)
})
