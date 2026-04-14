import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'

interface CounterState {
  value: number
}

interface CounterAction {
  type: string
  payload?: number
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
    case 'counter/addAmount':
      return { ...state, value: state.value + (action.payload ?? 0) }
    case 'counter/reset':
      return { value: 0 }
    default:
      return state
  }
}

const store = createStore(counterReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

function render(): void {
  const state = store.getState()
  document.getElementById('counter-value')!.textContent = String(state.value)
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)
}

function showAction(action: CounterAction): void {
  document.getElementById('action-display')!.textContent = JSON.stringify(action, null, 2)
}

store.subscribe(render)
render()

document.getElementById('btn-inc')!.addEventListener('click', () => {
  const action: CounterAction = { type: 'counter/incremented' }
  showAction(action)
  store.dispatch(action)
})

document.getElementById('btn-dec')!.addEventListener('click', () => {
  const action: CounterAction = { type: 'counter/decremented' }
  showAction(action)
  store.dispatch(action)
})

document.getElementById('btn-reset')!.addEventListener('click', () => {
  const action: CounterAction = { type: 'counter/reset' }
  showAction(action)
  store.dispatch(action)
})

document.getElementById('btn-add5')!.addEventListener('click', () => {
  const action: CounterAction = { type: 'counter/addAmount', payload: 5 }
  showAction(action)
  store.dispatch(action)
})

document.getElementById('btn-unknown')!.addEventListener('click', () => {
  const action: CounterAction = { type: 'some/unknownAction' }
  showAction(action)
  store.dispatch(action)
})

document.getElementById('btn-custom')!.addEventListener('click', () => {
  const typeInput = document.getElementById('custom-type') as HTMLInputElement
  const payloadInput = document.getElementById('custom-payload') as HTMLInputElement

  const type = typeInput.value.trim() || 'custom/action'
  const payloadRaw = payloadInput.value.trim()
  const action: CounterAction = { type }

  if (payloadRaw !== '') {
    action.payload = Number(payloadRaw)
  }

  showAction(action)
  store.dispatch(action)
})
