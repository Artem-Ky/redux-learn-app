import { legacy_createStore as createStore, combineReducers } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'

interface CounterAction {
  type: string
}

interface AppState {
  counterA: number
  counterB: number
}

function createCounterReducer(counterName: string): (state: number | undefined, action: CounterAction) => number {
  return function counterReducer(state: number = 0, action: CounterAction): number {
    switch (action.type) {
      case `${counterName}/incremented`:
        return state + 1
      case `${counterName}/decremented`:
        return state - 1
      default:
        return state
    }
  }
}

const counterAReducer = createCounterReducer('counterA')
const counterBReducer = createCounterReducer('counterB')

const rootReducer = combineReducers({
  counterA: counterAReducer,
  counterB: counterBReducer
})

const store = createStore(rootReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

function render(): void {
  const state = store.getState() as AppState
  const stateDisplay = document.getElementById('state-display')!

  document.getElementById('counter-a-value')!.textContent = String(state.counterA)
  document.getElementById('counter-b-value')!.textContent = String(state.counterB)

  stateDisplay.textContent = JSON.stringify(state, null, 2)
}

store.subscribe(render)
render()

document.getElementById('btn-a-inc')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counterA/incremented' })
})

document.getElementById('btn-a-dec')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counterA/decremented' })
})

document.getElementById('btn-b-inc')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counterB/incremented' })
})

document.getElementById('btn-b-dec')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counterB/decremented' })
})
