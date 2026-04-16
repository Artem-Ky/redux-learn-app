import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface CounterState {
  value: number
}

interface IncrementedAction {
  type: 'counter/incremented'
}

type CounterAction = IncrementedAction | { type: string }

const initialState: CounterState = { value: 0 }

function counterReducer(state: CounterState = initialState, action: CounterAction): CounterState {
  switch (action.type) {
    case 'counter/incremented':
      return { ...state, value: state.value + 1 }
    default:
      return state
  }
}

const thunkMiddleware = (storeAPI: any) => (next: any) => (action: any): any => {
  if (typeof action === 'function') {
    return action(storeAPI.dispatch, storeAPI.getState)
  }
  return next(action)
}

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const loggingMiddleware = (storeAPI: any) => (next: any) => (action: any): any => {
  if (typeof action === 'function') {
    consolePanel.log('📦 middleware: action — это ФУНКЦИЯ, thunk перехватит', 'color: #c586c0')
  } else {
    consolePanel.log('📦 middleware: action — объект: ' + JSON.stringify(action), 'color: #569cd6')
  }
  return next(action)
}

const store = createStore(
  counterReducer,
  applyMiddleware(loggingMiddleware, thunkMiddleware)
)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const counterDisplay = document.getElementById('counter-display')!

function render(): void {
  counterDisplay.textContent = String((store.getState() as CounterState).value)
}

store.subscribe(render)
render()

consolePanel.info('Свой thunk middleware: 5 строк кода!')
consolePanel.info('typeof action === "function" → вызвать с (dispatch, getState)')

document.getElementById('btn-sync')!.addEventListener('click', (): void => {
  consolePanel.log('──── dispatch({ type: "counter/incremented" }) ────')
  store.dispatch({ type: 'counter/incremented' })
  consolePanel.log('State: ' + JSON.stringify(store.getState()))
  consolePanel.log('')
})

document.getElementById('btn-thunk')!.addEventListener('click', (): void => {
  consolePanel.log('──── dispatch(функция) — incrementAsync ────')

  const incrementAsync = (dispatch: any, getState: any): void => {
    const before = getState() as CounterState
    consolePanel.log('⏳ thunk: текущий state.value = ' + before.value, 'color: #dcdcaa')
    consolePanel.log('⏳ thunk: жду 1 секунду...', 'color: #dcdcaa')

    setTimeout((): void => {
      dispatch({ type: 'counter/incremented' })
      const after = getState() as CounterState
      consolePanel.log('✅ thunk: dispatch выполнен! state.value = ' + after.value, 'color: #4caf50')
      consolePanel.log('')
    }, 1000)
  }

  store.dispatch(incrementAsync as any)
})
