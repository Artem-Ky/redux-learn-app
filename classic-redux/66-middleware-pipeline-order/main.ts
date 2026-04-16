import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { ConsolePanel } from '../shared/console-panel'

interface AppState {
  lastAction: string
}

interface RunAction {
  type: 'test/run'
}

type AppAction = RunAction | { type: string }

const initialState: AppState = { lastAction: 'none' }

function reducer(state: AppState = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'test/run':
      return { ...state, lastAction: 'test/run' }
    default:
      return state
  }
}

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const middlewareA = (storeAPI: any) => (next: any) => (action: any): any => {
  consolePanel.log('🟣 A enter', 'color: #c586c0')
  const result = next(action)
  consolePanel.log('🟣 A exit', 'color: #c586c0')
  return result
}

const middlewareB = (storeAPI: any) => (next: any) => (action: any): any => {
  consolePanel.log('🔵 B enter', 'color: #569cd6')
  const result = next(action)
  consolePanel.log('🔵 B exit', 'color: #569cd6')
  return result
}

const middlewareC = (storeAPI: any) => (next: any) => (action: any): any => {
  consolePanel.log('🟢 C enter', 'color: #6a9955')
  const result = next(action)
  consolePanel.log('🟢 C exit', 'color: #6a9955')
  return result
}

const store = createStore(reducer, applyMiddleware(middlewareA, middlewareB, middlewareC))

const stateDisplay = document.getElementById('state-display')!

function render(): void {
  stateDisplay.textContent = JSON.stringify(store.getState(), null, 2)
}

store.subscribe(render)
render()

consolePanel.info('Pipeline: applyMiddleware(A, B, C)')
consolePanel.info('Нажмите кнопку, чтобы увидеть порядок выполнения')

document.getElementById('btn-dispatch')!.addEventListener('click', (): void => {
  consolePanel.log('──── dispatch({ type: "test/run" }) ────')
  store.dispatch({ type: 'test/run' })
  consolePanel.log('──── [reducer отработал] ────', 'color: #ce9178')
  consolePanel.log('')
})
