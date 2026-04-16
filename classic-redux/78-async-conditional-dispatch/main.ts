import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { thunk } from 'redux-thunk'
import { ConsolePanel } from '../shared/console-panel'

interface DataItem {
  id: number
  title: string
}

interface AppState {
  status: 'idle' | 'loading' | 'loaded'
  data: DataItem[]
}

interface FetchPendingAction {
  type: 'fetch/pending'
}

interface FetchFulfilledAction {
  type: 'fetch/fulfilled'
  payload: DataItem[]
}

interface FetchResetAction {
  type: 'fetch/reset'
}

type AppAction = FetchPendingAction | FetchFulfilledAction | FetchResetAction | { type: string }

const initialState: AppState = {
  status: 'idle',
  data: []
}

function dataReducer(state: AppState = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'fetch/pending':
      return { ...state, status: 'loading' }
    case 'fetch/fulfilled':
      return { ...state, status: 'loaded', data: (action as FetchFulfilledAction).payload }
    case 'fetch/reset':
      return initialState
    default:
      return state
  }
}

const store = createStore(dataReducer, applyMiddleware(thunk))

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const btnLoad = document.getElementById('btn-load')!
const btnReset = document.getElementById('btn-reset')!
const statusDisplay = document.getElementById('status-display')!
const dataDisplay = document.getElementById('data-display')!
const stateDisplay = document.getElementById('state-display')!

const fakeItems: DataItem[] = [
  { id: 1, title: 'Изучить Redux Thunk' },
  { id: 2, title: 'Понять getState()' },
  { id: 3, title: 'Guard-паттерн' },
  { id: 4, title: 'Conditional dispatch' }
]

function fakeApiFetch(): Promise<DataItem[]> {
  return new Promise<DataItem[]>((resolve) => {
    setTimeout(() => resolve(fakeItems), 1500)
  })
}

const fetchDataIfNeeded = () => {
  return async (dispatch: any, getState: any): Promise<void> => {
    const currentState = getState() as AppState

    consolePanel.log('thunk: getState().status = "' + currentState.status + '"', 'color: #dcdcaa')

    if (currentState.status !== 'idle') {
      consolePanel.warn('Data already loaded, skipping fetch')
      consolePanel.log('thunk: ранний return — запрос не выполняется', 'color: #ff9800')
      consolePanel.log('')
      return
    }

    dispatch({ type: 'fetch/pending' })
    consolePanel.log('thunk: dispatch({ type: "fetch/pending" })', 'color: #c586c0')
    consolePanel.log('thunk: ⏳ запрос данных (1.5 сек)...', 'color: #dcdcaa')

    const data = await fakeApiFetch()

    dispatch({ type: 'fetch/fulfilled', payload: data })
    consolePanel.success('thunk: dispatch({ type: "fetch/fulfilled", payload: [...] })')
    consolePanel.log('thunk: загружено ' + data.length + ' элементов', 'color: #4caf50')
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
    dataDisplay.innerHTML = `
      <div style="text-align: center; padding: 16px; color: var(--accent-orange);">
        <span style="font-size: 1.2rem;">⏳</span> Загрузка данных...
      </div>`
  } else if (state.status === 'loaded') {
    dataDisplay.innerHTML = state.data.map((item: DataItem) => `
      <div style="display: flex; gap: 12px; padding: 6px 8px; border-bottom: 1px solid var(--border); font-size: 0.85rem;">
        <span style="color: var(--accent); font-family: var(--font-mono);">#${item.id}</span>
        <span style="color: var(--text-bright); flex: 1;">${item.title}</span>
      </div>
    `).join('')
  } else {
    dataDisplay.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">Нажмите «Загрузить данные» ↑</span>'
  }

  stateDisplay.textContent = JSON.stringify(state, null, 2)

  btnLoad.textContent = state.status === 'loading' ? '⏳ Загрузка...' : '🔄 Загрузить данные'
  ;(btnLoad as HTMLButtonElement).disabled = state.status === 'loading'
}

store.subscribe(render)
render()

consolePanel.info('getState() в thunk — проверка состояния перед dispatch')
consolePanel.info('Попробуйте нажать кнопку дважды!')

btnLoad.addEventListener('click', (): void => {
  consolePanel.log('──── dispatch(fetchDataIfNeeded()) ────')
  store.dispatch(fetchDataIfNeeded() as any)
})

btnReset.addEventListener('click', (): void => {
  store.dispatch({ type: 'fetch/reset' })
  consolePanel.log('──── dispatch({ type: "fetch/reset" }) ────')
  consolePanel.success('State сброшен в idle — можно загрузить заново')
  consolePanel.log('')
})
