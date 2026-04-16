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
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  data: DataItem[]
  error: string | null
}

interface FetchPendingAction {
  type: 'fetch/pending'
}

interface FetchFulfilledAction {
  type: 'fetch/fulfilled'
  payload: DataItem[]
}

interface FetchRejectedAction {
  type: 'fetch/rejected'
  payload: string
}

interface FetchResetAction {
  type: 'fetch/reset'
}

type AppAction = FetchPendingAction | FetchFulfilledAction | FetchRejectedAction | FetchResetAction | { type: string }

const initialState: AppState = {
  status: 'idle',
  data: [],
  error: null
}

function fetchReducer(state: AppState = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'fetch/pending':
      return { ...state, status: 'loading', error: null }
    case 'fetch/fulfilled':
      return { ...state, status: 'succeeded', data: (action as FetchFulfilledAction).payload, error: null }
    case 'fetch/rejected':
      return { ...state, status: 'failed', error: (action as FetchRejectedAction).payload }
    case 'fetch/reset':
      return initialState
    default:
      return state
  }
}

const store = createStore(fetchReducer, applyMiddleware(thunk))

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const btnFetch = document.getElementById('btn-fetch')!
const btnRetry = document.getElementById('btn-retry')!
const toggleError = document.getElementById('toggle-error') as HTMLInputElement
const statusDisplay = document.getElementById('status-display')!
const errorDisplay = document.getElementById('error-display')!
const dataDisplay = document.getElementById('data-display')!
const stateDisplay = document.getElementById('state-display')!

const fakeUsers: DataItem[] = [
  { id: 1, name: 'Алексей Иванов', email: 'alexey@example.com' },
  { id: 2, name: 'Мария Петрова', email: 'maria@example.com' },
  { id: 3, name: 'Дмитрий Сидоров', email: 'dmitry@example.com' }
]

function fakeApiFetch(shouldFail: boolean): Promise<DataItem[]> {
  return new Promise<DataItem[]>((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error('Network error: сервер недоступен (503)'))
      } else {
        resolve(fakeUsers)
      }
    }, 1500)
  })
}

const fetchData = () => {
  return async (dispatch: any): Promise<void> => {
    const shouldFail = toggleError.checked

    dispatch({ type: 'fetch/pending' })
    consolePanel.log('thunk: dispatch({ type: "fetch/pending" })', 'color: #c586c0')
    consolePanel.log('thunk: ⏳ запрос данных (1.5 сек)...' + (shouldFail ? ' [FORCE ERROR]' : ''), 'color: #dcdcaa')

    try {
      const data = await fakeApiFetch(shouldFail)

      dispatch({ type: 'fetch/fulfilled', payload: data })
      consolePanel.success('thunk: dispatch({ type: "fetch/fulfilled", payload: [...] })')
    } catch (err: any) {
      consolePanel.error('thunk: catch — ' + err.message)
      dispatch({ type: 'fetch/rejected', payload: err.message })
      consolePanel.log('thunk: dispatch({ type: "fetch/rejected", payload: "' + err.message + '" })', 'color: #f44747')
    }

    consolePanel.log('')
  }
}

function render(): void {
  const state = store.getState() as AppState

  statusDisplay.textContent = state.status
  statusDisplay.style.color =
    state.status === 'loading' ? 'var(--accent-orange)' :
    state.status === 'succeeded' ? 'var(--accent-green)' :
    state.status === 'failed' ? 'var(--accent-red)' :
    'var(--text-secondary)'

  if (state.status === 'failed' && state.error) {
    errorDisplay.style.display = 'block'
    errorDisplay.textContent = '❌ ' + state.error
    btnRetry.style.display = 'inline-block'
  } else {
    errorDisplay.style.display = 'none'
    btnRetry.style.display = 'none'
  }

  if (state.status === 'loading') {
    dataDisplay.innerHTML = `
      <div style="text-align: center; padding: 16px; color: var(--accent-orange);">
        <span style="font-size: 1.2rem;">⏳</span> Загрузка данных...
      </div>`
  } else if (state.status === 'succeeded') {
    dataDisplay.innerHTML = state.data.map((item: DataItem) => `
      <div style="display: flex; gap: 12px; padding: 6px 8px; border-bottom: 1px solid var(--border); font-size: 0.85rem;">
        <span style="color: var(--accent); font-family: var(--font-mono);">#${item.id}</span>
        <span style="color: var(--text-bright); flex: 1;">${item.name}</span>
        <span style="color: var(--text-muted);">${item.email}</span>
      </div>
    `).join('')
  } else if (state.status === 'failed') {
    dataDisplay.innerHTML = '<span style="color: var(--accent-red); font-size: 0.85rem;">Загрузка не удалась</span>'
  } else {
    dataDisplay.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">Нажмите «Загрузить данные» ↑</span>'
  }

  stateDisplay.textContent = JSON.stringify(state, null, 2)

  btnFetch.textContent = state.status === 'loading' ? '⏳ Загрузка...' : '🔄 Загрузить данные'
  ;(btnFetch as HTMLButtonElement).disabled = state.status === 'loading'
}

store.subscribe(render)
render()

consolePanel.info('try/catch в async thunk — перехват ошибок')
consolePanel.info('Включите "Force error" чтобы имитировать сбой')

function doFetch(): void {
  consolePanel.log('──── dispatch(fetchData()) ────')
  store.dispatch(fetchData() as any)
}

btnFetch.addEventListener('click', (): void => {
  doFetch()
})

btnRetry.addEventListener('click', (): void => {
  consolePanel.log('──── RETRY: повторная попытка ────')
  doFetch()
})
