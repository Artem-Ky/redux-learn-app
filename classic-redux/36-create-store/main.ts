import { legacy_createStore as createStore } from 'redux'
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

const store = createStore(counterReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const stateDisplay = document.getElementById('state-display')!
const stateAfter = document.getElementById('state-after')!

stateDisplay.textContent = JSON.stringify(store.getState(), null, 2)

document.getElementById('btn-increment')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/incremented' })
  stateAfter.textContent = JSON.stringify(store.getState(), null, 2)
})
