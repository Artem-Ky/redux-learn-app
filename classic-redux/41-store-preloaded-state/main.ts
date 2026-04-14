import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface CounterState {
  value: number
}

interface IncrementAction {
  type: 'counter/increment'
}

interface DecrementAction {
  type: 'counter/decrement'
}

type CounterAction = IncrementAction | DecrementAction | { type: string }

const STORAGE_KEY = 'redux-state'

function counterReducer(state: CounterState = { value: 0 }, action: CounterAction): CounterState {
  switch (action.type) {
    case 'counter/increment':
      return { value: state.value + 1 }
    case 'counter/decrement':
      return { value: state.value - 1 }
    default:
      return state
  }
}

const preloadedState: CounterState = { value: 42 }
let store = createStore(counterReducer, preloadedState)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)
consolePanel.info('Store создан с preloadedState: { value: 42 }')
consolePanel.log('store.getState() →', store.getState())
consolePanel.log('Reducer default { value: 0 } был перекрыт preloadedState')

function render(): void {
  const state = store.getState() as CounterState
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)
  updateLocalStorageDisplay()
}

function updateLocalStorageDisplay(): void {
  const saved = localStorage.getItem(STORAGE_KEY)
  document.getElementById('ls-display')!.textContent = saved ?? '— пусто —'
}

store.subscribe(render)
render()

document.getElementById('btn-increment')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/increment' })
  consolePanel.log('dispatch increment →', store.getState())
})

document.getElementById('btn-decrement')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/decrement' })
  consolePanel.log('dispatch decrement →', store.getState())
})

document.getElementById('btn-save')!.addEventListener('click', (): void => {
  const state = store.getState() as CounterState
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  consolePanel.success(`Сохранено в localStorage: ${JSON.stringify(state)}`)
  updateLocalStorageDisplay()
})

document.getElementById('btn-load')!.addEventListener('click', (): void => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) {
    consolePanel.warn('localStorage пуст — нечего загружать')
    return
  }

  const loaded: CounterState = JSON.parse(saved)
  consolePanel.info(`Загружено из localStorage: ${JSON.stringify(loaded)}`)
  consolePanel.log('Пересоздаём store с preloadedState...')

  store = createStore(counterReducer, loaded)
  devtools.connectStore(store)
  store.subscribe(render)
  render()

  consolePanel.success(`Новый store.getState() → ${JSON.stringify(store.getState())}`)
})

document.getElementById('btn-clear-storage')!.addEventListener('click', (): void => {
  localStorage.removeItem(STORAGE_KEY)
  consolePanel.warn('localStorage очищен')
  updateLocalStorageDisplay()
})
