import { legacy_createStore as createStore, applyMiddleware, Middleware, AnyAction } from 'redux'
import { thunk } from 'redux-thunk'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

// ─── Our own thunk implementation (identical to redux-thunk) ───

function myCreateThunkMiddleware<Extra = undefined>(extraArgument?: Extra): Middleware {
  const middleware: Middleware = ({ dispatch, getState }) =>
    (next) =>
      (action: unknown): unknown => {
        if (typeof action === 'function') {
          return (action as (d: typeof dispatch, gs: typeof getState, extra: Extra | undefined) => unknown)(
            dispatch, getState, extraArgument
          )
        }
        return next(action)
      }
  return middleware
}

const myThunk: Middleware = myCreateThunkMiddleware()

// ─── Interfaces ───

interface AppState {
  count: number
  message: string
  loading: boolean
}

interface IncrementAction { type: 'increment' }
interface SetMessageAction { type: 'setMessage'; payload: string }
interface SetLoadingAction { type: 'setLoading'; payload: boolean }
interface ResetAction { type: 'reset' }

type AppAction = IncrementAction | SetMessageAction | SetLoadingAction | ResetAction | { type: string }

const initialState: AppState = {
  count: 0,
  message: '',
  loading: false
}

function reducer(state: AppState = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + 1 }
    case 'setMessage':
      return { ...state, message: (action as SetMessageAction).payload }
    case 'setLoading':
      return { ...state, loading: (action as SetLoadingAction).payload }
    case 'reset':
      return { ...initialState }
    default:
      return state
  }
}

// ─── withExtraArgument demo ───

interface ApiService {
  name: string
  getGreeting: (name: string) => string
  fetchData: () => Promise<string[]>
}

const api: ApiService = {
  name: 'MyAPI v1.0',
  getGreeting: (name: string): string => `Привет, ${name}! Это ${api.name}`,
  fetchData: (): Promise<string[]> =>
    new Promise(resolve =>
      setTimeout(() => resolve(['Данные-1', 'Данные-2', 'Данные-3']), 1000)
    )
}

const myThunkWithExtra: Middleware = myCreateThunkMiddleware(api)

// ─── Two stores: official thunk vs our thunk ───

const storeOfficial = createStore(reducer, applyMiddleware(thunk as Middleware))
const storeCustom = createStore(reducer, applyMiddleware(myThunkWithExtra))

// ─── UI ───

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(storeOfficial)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const stateDisplay = document.getElementById('state-display')!
const btnOfficial = document.getElementById('btn-official')!
const btnCustom = document.getElementById('btn-custom')!
const btnExtra = document.getElementById('btn-extra')!
const btnAsync = document.getElementById('btn-async')!
const btnReset = document.getElementById('btn-reset')!

function render(): void {
  const s1 = storeOfficial.getState() as AppState
  const s2 = storeCustom.getState() as AppState
  stateDisplay.textContent = JSON.stringify({ official: s1, custom: s2 }, null, 2)
}

storeOfficial.subscribe(render)
storeCustom.subscribe(render)
render()

consolePanel.info('redux-thunk: исходный код и withExtraArgument')
consolePanel.log('')
consolePanel.log('Два store: official (npm thunk) и custom (наша реализация).')
consolePanel.log('Оба работают одинаково — убедитесь сами!')
consolePanel.log('')

// ─── Official thunk dispatch ───

btnOfficial.addEventListener('click', (): void => {
  consolePanel.warn('━━━ Official redux-thunk ━━━')

  ;(storeOfficial.dispatch as (a: unknown) => unknown)((dispatch: (a: AnyAction) => void, getState: () => AppState): void => {
    const before = getState()
    consolePanel.log(`  [official] count до: ${before.count}`)
    dispatch({ type: 'increment' })
    const after = getState()
    consolePanel.success(`  [official] count после: ${after.count}`)
    dispatch({ type: 'setMessage', payload: 'Из official thunk' })
    consolePanel.log('')
  })
  render()
})

// ─── Custom thunk dispatch ───

btnCustom.addEventListener('click', (): void => {
  consolePanel.warn('━━━ Наша реализация thunk ━━━')

  ;(storeCustom.dispatch as (a: unknown) => unknown)((dispatch: (a: AnyAction) => void, getState: () => AppState): void => {
    const before = getState()
    consolePanel.log(`  [custom] count до: ${before.count}`)
    dispatch({ type: 'increment' })
    const after = getState()
    consolePanel.success(`  [custom] count после: ${after.count}`)
    dispatch({ type: 'setMessage', payload: 'Из custom thunk' })
    consolePanel.log('')
  })
  render()
})

// ─── withExtraArgument ───

btnExtra.addEventListener('click', (): void => {
  consolePanel.warn('━━━ withExtraArgument — Dependency Injection ━━━')

  ;(storeCustom.dispatch as (a: unknown) => unknown)((
    dispatch: (a: AnyAction) => void,
    getState: () => AppState,
    extra: ApiService
  ): void => {
    consolePanel.log(`  Thunk получил extra: ${extra.name}`)
    const greeting = extra.getGreeting('Redux')
    consolePanel.success(`  api.getGreeting: "${greeting}"`)
    dispatch({ type: 'setMessage', payload: greeting })

    consolePanel.info('  extra доступен как 3-й аргумент (dispatch, getState, extra)')
    consolePanel.info('  Используйте для DI: API-клиент, конфиг, сервисы')
    consolePanel.log('')
  })
  render()
})

// ─── Async thunk ───

btnAsync.addEventListener('click', (): void => {
  consolePanel.warn('━━━ Async Thunk (с withExtraArgument) ━━━')

  ;(storeCustom.dispatch as (a: unknown) => unknown)(async (
    dispatch: (a: AnyAction) => void,
    _getState: () => AppState,
    extra: ApiService
  ): Promise<void> => {
    dispatch({ type: 'setLoading', payload: true })
    consolePanel.log('  Загрузка...')
    render()

    try {
      const data = await extra.fetchData()
      dispatch({ type: 'setLoading', payload: false })
      dispatch({ type: 'setMessage', payload: `Загружено: ${data.join(', ')}` })
      consolePanel.success(`  Получены данные: [${data.join(', ')}]`)
    } catch (e: unknown) {
      dispatch({ type: 'setLoading', payload: false })
      const msg = e instanceof Error ? e.message : String(e)
      consolePanel.error(`  Ошибка: ${msg}`)
    }
    consolePanel.log('')
    render()
  })
})

// ─── Reset ───

btnReset.addEventListener('click', (): void => {
  storeOfficial.dispatch({ type: 'reset' })
  storeCustom.dispatch({ type: 'reset' })
  render()
  consolePanel.clear()
  consolePanel.info('Сброшено')
  consolePanel.log('')
})
