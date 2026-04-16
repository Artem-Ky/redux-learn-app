import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { ConsolePanel } from '../shared/console-panel'

interface CounterState {
  value: number
}

type AppAction =
  | { type: 'counter/increment' }
  | { type: 'counter/useNext' }
  | { type: 'counter/useDispatch'; _dispatched?: boolean }
  | { type: string }

const initialState: CounterState = { value: 0 }

function counterReducer(state: CounterState = initialState, action: AppAction): CounterState {
  switch (action.type) {
    case 'counter/increment':
      return { ...state, value: state.value + 1 }
    case 'counter/useNext':
      return { ...state, value: state.value + 1 }
    case 'counter/useDispatch':
      return { ...state, value: state.value + 1 }
    default:
      return state
  }
}

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const firstMiddleware = (storeAPI: any) => (next: any) => (action: any): any => {
  consolePanel.log('  1️⃣  firstMiddleware — вижу: ' + action.type, 'color: #c586c0')
  const result = next(action)
  return result
}

const routerMiddleware = (storeAPI: any) => (next: any) => (action: any): any => {
  if (action.type === 'counter/useDispatch' && !action._dispatched) {
    consolePanel.log('  2️⃣  routerMiddleware — использую storeAPI.dispatch() → pipeline с начала!', 'color: #ce9178')
    return storeAPI.dispatch({ type: 'counter/useDispatch', _dispatched: true })
  }

  if (action.type === 'counter/useNext') {
    consolePanel.log('  2️⃣  routerMiddleware — использую next() → передаю дальше', 'color: #569cd6')
  } else {
    consolePanel.log('  2️⃣  routerMiddleware — пропускаю: ' + action.type, 'color: #569cd6')
  }

  return next(action)
}

const lastMiddleware = (storeAPI: any) => (next: any) => (action: any): any => {
  consolePanel.log('  3️⃣  lastMiddleware — вижу: ' + action.type, 'color: #6a9955')
  const result = next(action)
  return result
}

const store = createStore(
  counterReducer,
  applyMiddleware(firstMiddleware, routerMiddleware, lastMiddleware)
)

const counterDisplay = document.getElementById('counter-display')!
const pathDisplay = document.getElementById('path-display')!

function render(): void {
  counterDisplay.textContent = String((store.getState() as CounterState).value)
}

store.subscribe(render)
render()

consolePanel.info('Pipeline: applyMiddleware(first, router, last)')
consolePanel.info('next() — передаёт дальше по цепочке')
consolePanel.info('dispatch() — перезапускает pipeline с начала')

document.getElementById('btn-next')!.addEventListener('click', (): void => {
  consolePanel.log('──── dispatch({ type: "counter/useNext" }) ────')
  store.dispatch({ type: 'counter/useNext' })
  pathDisplay.textContent = 'first → router (next) → last → [reducer]'
  pathDisplay.style.color = 'var(--accent)'
  consolePanel.log('')
})

document.getElementById('btn-dispatch')!.addEventListener('click', (): void => {
  consolePanel.log('──── dispatch({ type: "counter/useDispatch" }) ────')
  store.dispatch({ type: 'counter/useDispatch' } as AppAction)
  pathDisplay.textContent = 'first → router (dispatch!) → first → router → last → [reducer]'
  pathDisplay.style.color = 'var(--accent-orange)'
  consolePanel.log('')
})
