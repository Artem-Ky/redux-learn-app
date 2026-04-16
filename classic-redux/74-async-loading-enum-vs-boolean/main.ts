import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { thunk } from 'redux-thunk'
import { ConsolePanel } from '../shared/console-panel'

interface Item {
  id: number
  name: string
}

// ── Boolean approach ──

interface BoolState {
  isLoading: boolean
  data: Item[]
  error: string | null
}

interface BoolLoadingAction { type: 'bool/loading' }
interface BoolSucceededAction { type: 'bool/succeeded'; payload: Item[] }
interface BoolFailedAction { type: 'bool/failed'; payload: string }
interface BoolResetAction { type: 'bool/reset' }

type BoolAction = BoolLoadingAction | BoolSucceededAction | BoolFailedAction | BoolResetAction | { type: string }

const boolInitial: BoolState = { isLoading: false, data: [], error: null }

function boolReducer(state: BoolState = boolInitial, action: BoolAction): BoolState {
  switch (action.type) {
    case 'bool/loading':
      return { ...state, isLoading: true, error: null }
    case 'bool/succeeded':
      return { ...state, isLoading: false, data: (action as BoolSucceededAction).payload }
    case 'bool/failed':
      return { ...state, isLoading: false, error: (action as BoolFailedAction).payload }
    case 'bool/reset':
      return boolInitial
    default:
      return state
  }
}

// ── Enum approach ──

type LoadingStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

interface EnumState {
  status: LoadingStatus
  data: Item[]
  error: string | null
}

interface EnumLoadingAction { type: 'enum/loading' }
interface EnumSucceededAction { type: 'enum/succeeded'; payload: Item[] }
interface EnumFailedAction { type: 'enum/failed'; payload: string }
interface EnumResetAction { type: 'enum/reset' }

type EnumAction = EnumLoadingAction | EnumSucceededAction | EnumFailedAction | EnumResetAction | { type: string }

const enumInitial: EnumState = { status: 'idle', data: [], error: null }

function enumReducer(state: EnumState = enumInitial, action: EnumAction): EnumState {
  switch (action.type) {
    case 'enum/loading':
      return { ...state, status: 'loading', error: null }
    case 'enum/succeeded':
      return { ...state, status: 'succeeded', data: (action as EnumSucceededAction).payload, error: null }
    case 'enum/failed':
      return { ...state, status: 'failed', error: (action as EnumFailedAction).payload }
    case 'enum/reset':
      return enumInitial
    default:
      return state
  }
}

const boolStore = createStore(boolReducer, applyMiddleware(thunk))
const enumStore = createStore(enumReducer, applyMiddleware(thunk))

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const boolStateEl = document.getElementById('bool-state')!
const boolDisplayEl = document.getElementById('bool-display')!
const enumStateEl = document.getElementById('enum-state')!
const enumDisplayEl = document.getElementById('enum-display')!

const fakeItems: Item[] = [
  { id: 1, name: 'Redux Fundamentals' },
  { id: 2, name: 'Async with Thunks' },
  { id: 3, name: 'Loading State Patterns' }
]

function fetchBoolSuccess() {
  return async (dispatch: any): Promise<void> => {
    dispatch({ type: 'bool/loading' })
    await new Promise<void>((resolve) => setTimeout(resolve, 1000))
    dispatch({ type: 'bool/succeeded', payload: fakeItems })
  }
}

function fetchBoolError() {
  return async (dispatch: any): Promise<void> => {
    dispatch({ type: 'bool/loading' })
    await new Promise<void>((resolve) => setTimeout(resolve, 1000))
    dispatch({ type: 'bool/failed', payload: 'Network error: connection refused' })
  }
}

function fetchEnumSuccess() {
  return async (dispatch: any): Promise<void> => {
    dispatch({ type: 'enum/loading' })
    await new Promise<void>((resolve) => setTimeout(resolve, 1000))
    dispatch({ type: 'enum/succeeded', payload: fakeItems })
  }
}

function fetchEnumError() {
  return async (dispatch: any): Promise<void> => {
    dispatch({ type: 'enum/loading' })
    await new Promise<void>((resolve) => setTimeout(resolve, 1000))
    dispatch({ type: 'enum/failed', payload: 'Network error: connection refused' })
  }
}

function renderBool(): void {
  const state = boolStore.getState() as BoolState
  boolStateEl.textContent = JSON.stringify(state, null, 2)

  if (state.isLoading) {
    boolDisplayEl.innerHTML = `
      <div style="text-align: center; color: var(--accent-orange);">⏳ Загрузка...</div>`
  } else if (state.error) {
    boolDisplayEl.innerHTML = `
      <div style="color: var(--accent-red);">✖ ${state.error}</div>`
  } else if (state.data.length > 0) {
    boolDisplayEl.innerHTML = state.data.map((item: Item) => `
      <div style="padding: 4px 0; font-size: 0.85rem; color: var(--text-bright);">
        #${item.id} — ${item.name}
      </div>`).join('')
  } else {
    boolDisplayEl.innerHTML = `
      <div style="color: var(--text-muted); font-size: 0.85rem;">
        isLoading: <strong>false</strong><br>
        ❓ Данные ещё не загружены? Или уже загружены (но пустые)?
        <br><span style="color: var(--accent-red); font-size: 0.78rem;">
        Boolean не может это отличить!</span>
      </div>`
  }
}

function renderEnum(): void {
  const state = enumStore.getState() as EnumState
  enumStateEl.textContent = JSON.stringify(state, null, 2)

  switch (state.status) {
    case 'idle':
      enumDisplayEl.innerHTML = `
        <div style="color: var(--text-muted); font-size: 0.85rem;">
          status: <strong style="color: var(--text-secondary);">idle</strong><br>
          ✔ Чётко: данные ещё не запрашивались
        </div>`
      break
    case 'loading':
      enumDisplayEl.innerHTML = `
        <div style="text-align: center; color: var(--accent-orange);">⏳ Загрузка...</div>`
      break
    case 'succeeded':
      enumDisplayEl.innerHTML = state.data.map((item: Item) => `
        <div style="padding: 4px 0; font-size: 0.85rem; color: var(--text-bright);">
          #${item.id} — ${item.name}
        </div>`).join('')
      break
    case 'failed':
      enumDisplayEl.innerHTML = `
        <div style="color: var(--accent-red);">✖ ${state.error}</div>`
      break
  }
}

boolStore.subscribe(renderBool)
enumStore.subscribe(renderEnum)
renderBool()
renderEnum()

consolePanel.info('Сравнение: Boolean vs Enum для loading state')

document.getElementById('bool-load')!.addEventListener('click', (): void => {
  consolePanel.log('── Boolean: Load ──')
  consolePanel.log('isLoading: false → true', 'color: #ff9800')
  boolStore.dispatch(fetchBoolSuccess() as any)
  setTimeout((): void => {
    consolePanel.log('isLoading: true → false (загружено)', 'color: #4caf50')
  }, 1100)
})

document.getElementById('bool-error')!.addEventListener('click', (): void => {
  consolePanel.log('── Boolean: Simulate Error ──')
  consolePanel.log('isLoading: false → true', 'color: #ff9800')
  boolStore.dispatch(fetchBoolError() as any)
  setTimeout((): void => {
    consolePanel.warn('isLoading: true → false + error (а isLoading === false и при idle, и при error!)')
  }, 1100)
})

document.getElementById('bool-reset')!.addEventListener('click', (): void => {
  boolStore.dispatch({ type: 'bool/reset' })
  consolePanel.log('Boolean: reset → isLoading: false', 'color: #9cdcfe')
  consolePanel.warn('isLoading: false — это idle или loaded? Непонятно!')
})

document.getElementById('enum-load')!.addEventListener('click', (): void => {
  consolePanel.log('── Enum: Load ──')
  consolePanel.log('status: idle → loading', 'color: #ff9800')
  enumStore.dispatch(fetchEnumSuccess() as any)
  setTimeout((): void => {
    consolePanel.success('status: loading → succeeded (однозначно!)')
  }, 1100)
})

document.getElementById('enum-error')!.addEventListener('click', (): void => {
  consolePanel.log('── Enum: Simulate Error ──')
  consolePanel.log('status: idle → loading', 'color: #ff9800')
  enumStore.dispatch(fetchEnumError() as any)
  setTimeout((): void => {
    consolePanel.log('status: loading → failed (ошибка чётко определена)', 'color: #f44747')
  }, 1100)
})

document.getElementById('enum-reset')!.addEventListener('click', (): void => {
  enumStore.dispatch({ type: 'enum/reset' })
  consolePanel.success('Enum: reset → status: idle (однозначно: ещё не загружали)')
})
