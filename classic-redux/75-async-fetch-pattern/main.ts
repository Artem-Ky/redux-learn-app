import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { thunk } from 'redux-thunk'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface User {
  id: number
  name: string
  email: string
  role: string
}

type LoadingStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

interface AppState {
  status: LoadingStatus
  entities: User[]
  error: string | null
}

interface FetchStartedAction {
  type: 'users/fetchStarted'
}

interface FetchSucceededAction {
  type: 'users/fetchSucceeded'
  payload: User[]
}

interface FetchFailedAction {
  type: 'users/fetchFailed'
  payload: string
}

type AppAction = FetchStartedAction | FetchSucceededAction | FetchFailedAction | { type: string }

const initialState: AppState = {
  status: 'idle',
  entities: [],
  error: null
}

function usersReducer(state: AppState = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'users/fetchStarted':
      return { ...state, status: 'loading', error: null }
    case 'users/fetchSucceeded':
      return { ...state, status: 'succeeded', entities: (action as FetchSucceededAction).payload, error: null }
    case 'users/fetchFailed':
      return { ...state, status: 'failed', error: (action as FetchFailedAction).payload }
    default:
      return state
  }
}

const store = createStore(usersReducer, applyMiddleware(thunk))

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const statusDot = document.getElementById('status-dot')!
const statusLabel = document.getElementById('status-label')!
const usersDisplay = document.getElementById('users-display')!
const stateDisplay = document.getElementById('state-display')!
const btnFetch = document.getElementById('btn-fetch')!
const chkError = document.getElementById('chk-error') as HTMLInputElement

const fakeUsers: User[] = [
  { id: 1, name: 'Алексей Иванов', email: 'alexey@example.com', role: 'Admin' },
  { id: 2, name: 'Мария Петрова', email: 'maria@example.com', role: 'Editor' },
  { id: 3, name: 'Дмитрий Сидоров', email: 'dmitry@example.com', role: 'Viewer' },
  { id: 4, name: 'Елена Козлова', email: 'elena@example.com', role: 'Editor' },
  { id: 5, name: 'Сергей Волков', email: 'sergey@example.com', role: 'Viewer' }
]

const STATUS_COLORS: Record<LoadingStatus, string> = {
  idle: 'var(--text-muted)',
  loading: 'var(--accent-orange)',
  succeeded: 'var(--accent-green)',
  failed: 'var(--accent-red)'
}

const ROLE_COLORS: Record<string, string> = {
  Admin: 'var(--accent-red)',
  Editor: 'var(--accent-orange)',
  Viewer: 'var(--accent)'
}

function fetchUsers(simulateError: boolean) {
  return async (dispatch: any): Promise<void> => {
    consolePanel.log('thunk: dispatch users/fetchStarted', 'color: #c586c0')
    dispatch({ type: 'users/fetchStarted' })

    consolePanel.log('thunk: ⏳ имитация API-запроса (1.5 сек)...', 'color: #dcdcaa')

    await new Promise<void>((resolve) => setTimeout(resolve, 1500))

    try {
      if (simulateError) {
        throw new Error('500 Internal Server Error: Database connection failed')
      }

      consolePanel.log('thunk: dispatch users/fetchSucceeded', 'color: #4caf50')
      dispatch({ type: 'users/fetchSucceeded', payload: fakeUsers })
      consolePanel.success('Загружено ' + fakeUsers.length + ' пользователей')
    } catch (err) {
      const message = (err as Error).message
      consolePanel.log('thunk: dispatch users/fetchFailed', 'color: #f44747')
      dispatch({ type: 'users/fetchFailed', payload: message })
      consolePanel.error('Ошибка: ' + message)
    }
    consolePanel.log('')
  }
}

function render(): void {
  const state = store.getState() as AppState

  statusDot.style.background = STATUS_COLORS[state.status]
  statusLabel.textContent = state.status
  statusLabel.style.color = STATUS_COLORS[state.status]

  switch (state.status) {
    case 'idle':
      usersDisplay.innerHTML = `
        <span style="color: var(--text-muted); font-size: 0.85rem;">Нажмите "Fetch Users" ↑</span>`
      break
    case 'loading':
      usersDisplay.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--accent-orange);">
          <div style="font-size: 1.5rem; margin-bottom: 8px;">⏳</div>
          Загрузка пользователей...
        </div>`
      break
    case 'succeeded':
      usersDisplay.innerHTML = state.entities.map((user: User) => `
        <div style="display: flex; gap: 12px; padding: 8px; border-bottom: 1px solid var(--border); font-size: 0.85rem; align-items: center;">
          <span style="color: var(--accent); font-family: var(--font-mono); font-size: 0.75rem; min-width: 24px;">#${user.id}</span>
          <span style="color: var(--text-bright); flex: 1; font-weight: 500;">${user.name}</span>
          <span style="color: var(--text-muted); font-size: 0.8rem;">${user.email}</span>
          <span style="font-size: 0.7rem; padding: 2px 8px; border-radius: 10px; border: 1px solid ${ROLE_COLORS[user.role] || 'var(--border)'}; color: ${ROLE_COLORS[user.role] || 'var(--text-muted)'};">${user.role}</span>
        </div>
      `).join('')
      break
    case 'failed':
      usersDisplay.innerHTML = `
        <div style="padding: 16px; text-align: center;">
          <div style="font-size: 1.5rem; margin-bottom: 8px;">⚠️</div>
          <div style="color: var(--accent-red); font-weight: 500; margin-bottom: 4px;">Ошибка загрузки</div>
          <div style="color: var(--text-muted); font-size: 0.82rem;">${state.error}</div>
          <button class="btn btn--sm" id="btn-retry" style="margin-top: 12px;">🔄 Повторить</button>
        </div>`
      setTimeout((): void => {
        const retryBtn = document.getElementById('btn-retry')
        if (retryBtn) {
          retryBtn.addEventListener('click', (): void => {
            consolePanel.log('──── Повторный запрос (retry) ────')
            store.dispatch(fetchUsers(chkError.checked) as any)
          })
        }
      }, 0)
      break
  }

  stateDisplay.textContent = JSON.stringify(state, null, 2)

  btnFetch.textContent = state.status === 'loading' ? '⏳ Загрузка...' : '👥 Fetch Users'
  ;(btnFetch as HTMLButtonElement).disabled = state.status === 'loading'
}

store.subscribe(render)
render()

consolePanel.info('Паттерн: request → success | failure (3 экшена)')
consolePanel.info('Экшены: users/fetchStarted, users/fetchSucceeded, users/fetchFailed')
consolePanel.info('Включите "Simulate error" для имитации ошибки')

btnFetch.addEventListener('click', (): void => {
  const simulateError = chkError.checked
  consolePanel.log(`──── dispatch(fetchUsers()) ${simulateError ? '[error mode]' : ''} ────`)
  store.dispatch(fetchUsers(simulateError) as any)
})
