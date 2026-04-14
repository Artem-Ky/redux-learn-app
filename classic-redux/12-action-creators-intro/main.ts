import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'

interface CounterState {
  value: number
}

interface CounterAction {
  type: string
}

const initialState: CounterState = { value: 0 }

function counterReducer(
  state: CounterState = initialState,
  action: CounterAction
): CounterState {
  switch (action.type) {
    case 'counter/incremented':
      return { ...state, value: state.value + 1 }
    case 'counter/decremented':
      return { ...state, value: state.value - 1 }
    case 'counter/reset':
      return { value: 0 }
    default:
      return state
  }
}

function increment(): CounterAction {
  return { type: 'counter/incremented' }
}

function decrement(): CounterAction {
  return { type: 'counter/decremented' }
}

function reset(): CounterAction {
  return { type: 'counter/reset' }
}

const store = createStore(counterReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const stateDisplayEl = document.getElementById('state-display')!
const actionDisplayEl = document.getElementById('action-display')!
const counterRawEl = document.getElementById('counter-raw')!
const counterCreatorEl = document.getElementById('counter-creator')!

function showAction(action: CounterAction, method: string): void {
  actionDisplayEl.textContent = `// ${method}\n${JSON.stringify(action, null, 2)}`
}

function render(): void {
  const state = store.getState()
  stateDisplayEl.textContent = JSON.stringify(state, null, 2)
  counterRawEl.textContent = String(state.value)
  counterCreatorEl.textContent = String(state.value)
}

store.subscribe(render)
render()

document.getElementById('btn-inc-raw')!.addEventListener('click', (): void => {
  const action: CounterAction = { type: 'counter/incremented' }
  showAction(action, 'dispatch({ type: "counter/incremented" })')
  store.dispatch(action)
})

document.getElementById('btn-dec-raw')!.addEventListener('click', (): void => {
  const action: CounterAction = { type: 'counter/decremented' }
  showAction(action, 'dispatch({ type: "counter/decremented" })')
  store.dispatch(action)
})

document.getElementById('btn-reset-raw')!.addEventListener('click', (): void => {
  const action: CounterAction = { type: 'counter/reset' }
  showAction(action, 'dispatch({ type: "counter/reset" })')
  store.dispatch(action)
})

document.getElementById('btn-inc-creator')!.addEventListener('click', (): void => {
  const action = increment()
  showAction(action, 'dispatch(increment())')
  store.dispatch(action)
})

document.getElementById('btn-dec-creator')!.addEventListener('click', (): void => {
  const action = decrement()
  showAction(action, 'dispatch(decrement())')
  store.dispatch(action)
})

document.getElementById('btn-reset-creator')!.addEventListener('click', (): void => {
  const action = reset()
  showAction(action, 'dispatch(reset())')
  store.dispatch(action)
})
